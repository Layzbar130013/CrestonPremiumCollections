const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const store = require('./models/store');
const {
  verifyPassword,
  createSession,
  deleteSession,
  getAuthFromReq
} = require('./utils/auth');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// Helper: Parse Body (supports both standard Node stream and Vercel serverless pre-parsed req.body)
function parseBody(req) {
  // If Vercel has already parsed req.body, return immediately to prevent hanging
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') return Promise.resolve(req.body);
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch (e) {
      return Promise.resolve({});
    }
  }

  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// Helper: JSON Response
function sendJson(res, statusCode, data, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...headers
  });
  res.end(JSON.stringify(data));
}

// Helper: Serve Static File
function serveStaticFile(req, res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('404 Not Found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

// Main HTTP request handler (used by both standalone Node.js and Vercel Serverless Function)
async function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    return res.end();
  }

  // -------------------------------------------------------------
  // Public HTML & Static Routes (Local standalone server fallback)
  // -------------------------------------------------------------
  if (pathname === '/' || pathname === '/index.html') {
    return serveStaticFile(req, res, path.join(PUBLIC_DIR, 'index.html'));
  }

  if (pathname === '/admin' || pathname === '/admin.html') {
    return serveStaticFile(req, res, path.join(PUBLIC_DIR, 'admin.html'));
  }

  // Static Assets (css, js, assets, etc.)
  if (pathname.startsWith('/css/') || pathname.startsWith('/js/') || pathname.startsWith('/assets/')) {
    const safePath = path.normalize(path.join(PUBLIC_DIR, pathname));
    if (safePath.startsWith(PUBLIC_DIR)) {
      return serveStaticFile(req, res, safePath);
    }
  }

  // -------------------------------------------------------------
  // API Routes
  // -------------------------------------------------------------

  // --- Auth: Login ---
  if (pathname === '/api/auth/login' && method === 'POST') {
    try {
      const { username, password } = await parseBody(req);
      if (!username || !password) {
        return sendJson(res, 400, { error: 'Username and password are required' });
      }

      const user = await store.getUserByUsername(username);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return sendJson(res, 401, { error: 'Invalid username or password' });
      }

      const token = createSession(user);
      const isSecure = req.headers['x-forwarded-proto'] === 'https';
      const cookieHeader = `creston_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 86400}${isSecure ? '; Secure' : ''}`;

      const { passwordHash, ...safeUser } = user;
      return sendJson(res, 200, {
        success: true,
        token,
        user: safeUser,
        message: 'Sign-in successful'
      }, { 'Set-Cookie': cookieHeader });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // --- Auth: Current User Status ---
  if (pathname === '/api/auth/me' && method === 'GET') {
    const { session } = getAuthFromReq(req);
    if (!session) {
      return sendJson(res, 200, { authenticated: false });
    }
    const user = await store.getUserById(session.userId);
    if (!user) {
      return sendJson(res, 200, { authenticated: false });
    }
    const { passwordHash, ...safeUser } = user;
    return sendJson(res, 200, {
      authenticated: true,
      user: safeUser
    });
  }

  // --- Auth: Logout ---
  if (pathname === '/api/auth/logout' && method === 'POST') {
    const { token } = getAuthFromReq(req);
    if (token) deleteSession(token);
    const cookieHeader = `creston_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
    return sendJson(res, 200, { success: true, message: 'Logged out successfully' }, { 'Set-Cookie': cookieHeader });
  }

  // --- Auth: Change Password ---
  if (pathname === '/api/auth/change-password' && method === 'POST') {
    const { session } = getAuthFromReq(req);
    if (!session) {
      return sendJson(res, 401, { error: 'Authentication required' });
    }
    try {
      const { currentPassword, newPassword } = await parseBody(req);
      if (!newPassword || newPassword.length < 6) {
        return sendJson(res, 400, { error: 'New password must be at least 6 characters' });
      }

      const user = await store.getUserById(session.userId);
      if (!user) {
        return sendJson(res, 404, { error: 'User not found' });
      }

      // Verify current password
      if (!verifyPassword(currentPassword, user.passwordHash)) {
        return sendJson(res, 400, { error: 'Current password does not match' });
      }

      await store.changePassword(session.userId, newPassword);
      return sendJson(res, 200, { success: true, message: 'Password updated successfully' });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // --- Public: Get Store Settings (Frontpage, About, Contacts, Paybill) ---
  if (pathname === '/api/settings' && method === 'GET') {
    const settings = await store.getSettings();
    return sendJson(res, 200, settings);
  }

  // --- Public: Get Products Catalog ---
  if (pathname === '/api/products' && method === 'GET') {
    const products = await store.getProducts();
    const category = parsedUrl.query.category;
    const search = parsedUrl.query.search;

    let filtered = products;
    if (category && category !== 'All') {
      filtered = filtered.filter(p => p.category && p.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(p =>
        (p.name && p.name.toLowerCase().includes(s)) ||
        (p.description && p.description.toLowerCase().includes(s)) ||
        (p.origin && p.origin.toLowerCase().includes(s))
      );
    }
    return sendJson(res, 200, filtered);
  }

  // --- Public: Single Product Details ---
  if (pathname.startsWith('/api/products/') && method === 'GET') {
    const id = pathname.replace('/api/products/', '');
    const product = await store.getProductById(id);
    if (!product) {
      return sendJson(res, 404, { error: 'Product not found' });
    }
    return sendJson(res, 200, product);
  }

  // --- Public: Place Order (Lipa Na M-Pesa Checkout) ---
  if (pathname === '/api/orders' && method === 'POST') {
    try {
      const orderData = await parseBody(req);
      if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        return sendJson(res, 400, { error: 'Order must contain at least one item' });
      }
      if (!orderData.phone) {
        return sendJson(res, 400, { error: 'Contact phone number is required' });
      }

      const settings = await store.getSettings();
      orderData.paybill = settings.paybill;
      orderData.accountNo = settings.accountNo;

      const order = await store.createOrder(orderData);
      return sendJson(res, 201, {
        success: true,
        order,
        message: 'Order placed successfully'
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // -------------------------------------------------------------
  // Protected Admin & Staff Endpoints
  // -------------------------------------------------------------

  const { session } = getAuthFromReq(req);

  function hasRight(right) {
    if (!session) return false;
    if (session.role === 'admin') return true;
    return Array.isArray(session.rights) && session.rights.includes(right);
  }

  // --- Admin: Dashboard Stats ---
  if (pathname === '/api/admin/stats' && method === 'GET') {
    if (!session || (!hasRight('view_stocks') && !hasRight('admin'))) {
      return sendJson(res, 403, { error: 'Unauthorized: insufficient rights to view store data' });
    }
    const products = await store.getProducts();
    const orders = await store.getOrders();
    const users = await store.getUsers();

    const totalStock = products.reduce((acc, p) => acc + (p.stock || 0), 0);
    const lowStockCount = products.filter(p => (p.stock || 0) <= 5).length;
    const totalRevenue = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);

    return sendJson(res, 200, {
      totalProducts: products.length,
      totalStockUnits: totalStock,
      lowStockCount,
      totalOrders: orders.length,
      totalRevenue,
      userCount: users.length,
      userRole: session.role,
      userRights: session.rights
    });
  }

  // --- Admin: List Inventory & Stocks ---
  if (pathname === '/api/admin/products' && method === 'GET') {
    if (!session || (!hasRight('view_stocks') && !hasRight('admin'))) {
      return sendJson(res, 403, { error: 'Access denied: Stock viewing rights required' });
    }
    const products = await store.getProducts();
    return sendJson(res, 200, products);
  }

  // --- Admin: Add New Product ---
  if (pathname === '/api/admin/products' && method === 'POST') {
    if (!session || (!hasRight('edit_inventory') && !hasRight('admin'))) {
      return sendJson(res, 403, { error: 'Access denied: Inventory edit rights required' });
    }
    try {
      const productData = await parseBody(req);
      if (!productData.name || productData.price === undefined) {
        return sendJson(res, 400, { error: 'Product name and price are required' });
      }
      const newProduct = await store.addProduct(productData);
      return sendJson(res, 201, { success: true, product: newProduct });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // --- Admin: Update Existing Product ---
  if (pathname.startsWith('/api/admin/products/') && method === 'PUT') {
    if (!session || (!hasRight('edit_inventory') && !hasRight('admin'))) {
      return sendJson(res, 403, { error: 'Access denied: Inventory edit rights required' });
    }
    try {
      const id = pathname.replace('/api/admin/products/', '');
      const updates = await parseBody(req);
      const updated = await store.updateProduct(id, updates);
      if (!updated) {
        return sendJson(res, 404, { error: 'Product not found' });
      }
      return sendJson(res, 200, { success: true, product: updated });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // --- Admin: Quick Stock Adjustment ---
  if (pathname.match(/^\/api\/admin\/products\/[^/]+\/stock$/) && method === 'PATCH') {
    if (!session || (!hasRight('edit_inventory') && !hasRight('admin'))) {
      return sendJson(res, 403, { error: 'Access denied: Inventory edit rights required' });
    }
    try {
      const id = pathname.split('/')[4];
      const { delta, absolute } = await parseBody(req);
      let updated;
      if (absolute !== undefined) {
        updated = await store.adjustStock(id, absolute, true);
      } else if (delta !== undefined) {
        updated = await store.adjustStock(id, delta, false);
      } else {
        return sendJson(res, 400, { error: 'Either delta or absolute stock value is required' });
      }

      if (!updated) {
        return sendJson(res, 404, { error: 'Product not found' });
      }
      return sendJson(res, 200, { success: true, product: updated });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // --- Admin: Delete Product ---
  if (pathname.startsWith('/api/admin/products/') && method === 'DELETE') {
    if (!session || (!hasRight('edit_inventory') && !hasRight('admin'))) {
      return sendJson(res, 403, { error: 'Access denied: Inventory edit rights required' });
    }
    const id = pathname.replace('/api/admin/products/', '');
    const success = await store.deleteProduct(id);
    if (!success) {
      return sendJson(res, 404, { error: 'Product not found' });
    }
    return sendJson(res, 200, { success: true, message: 'Product deleted' });
  }

  // --- Admin: Get Orders List ---
  if (pathname === '/api/admin/orders' && method === 'GET') {
    if (!session || (!hasRight('view_stocks') && !hasRight('admin'))) {
      return sendJson(res, 403, { error: 'Access denied: Stock viewing rights required' });
    }
    const orders = await store.getOrders();
    return sendJson(res, 200, orders);
  }

  // --- Admin: Update Order Status ---
  if (pathname.match(/^\/api\/admin\/orders\/[^/]+\/status$/) && method === 'PATCH') {
    if (!session || (!hasRight('edit_inventory') && !hasRight('admin'))) {
      return sendJson(res, 403, { error: 'Access denied' });
    }
    try {
      const id = pathname.split('/')[4];
      const { status } = await parseBody(req);
      const updated = await store.updateOrderStatus(id, status);
      if (!updated) {
        return sendJson(res, 404, { error: 'Order not found' });
      }
      return sendJson(res, 200, { success: true, order: updated });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // --- Admin: Update Store Settings & CMS ---
  if (pathname === '/api/admin/settings' && method === 'PUT') {
    if (!session || !hasRight('admin')) {
      return sendJson(res, 403, { error: 'Administrator access required to modify store settings and page contents' });
    }
    try {
      const updates = await parseBody(req);
      const updated = await store.updateSettings(updates);
      return sendJson(res, 200, { success: true, settings: updated });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // --- Admin: Manage Users (List, Add, Update rights, Delete) ---
  if (pathname === '/api/admin/users' && method === 'GET') {
    if (!session || !hasRight('admin')) {
      return sendJson(res, 403, { error: 'Administrator access required to manage users' });
    }
    const allUsers = await store.getUsers();
    const users = allUsers.map(u => {
      const { passwordHash, ...safe } = u;
      return safe;
    });
    return sendJson(res, 200, users);
  }

  if (pathname === '/api/admin/users' && method === 'POST') {
    if (!session || !hasRight('admin')) {
      return sendJson(res, 403, { error: 'Administrator access required to add users' });
    }
    try {
      const userData = await parseBody(req);
      if (!userData.username || !userData.password) {
        return sendJson(res, 400, { error: 'Username and password are required' });
      }
      const newUser = await store.addUser(userData);
      return sendJson(res, 201, { success: true, user: newUser });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  if (pathname.startsWith('/api/admin/users/') && method === 'PUT') {
    if (!session || !hasRight('admin')) {
      return sendJson(res, 403, { error: 'Administrator access required to update users' });
    }
    try {
      const id = pathname.replace('/api/admin/users/', '');
      const updates = await parseBody(req);
      const updatedUser = await store.updateUser(id, updates);
      if (!updatedUser) {
        return sendJson(res, 404, { error: 'User not found' });
      }
      return sendJson(res, 200, { success: true, user: updatedUser });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (pathname.startsWith('/api/admin/users/') && method === 'DELETE') {
    if (!session || !hasRight('admin')) {
      return sendJson(res, 403, { error: 'Administrator access required to delete users' });
    }
    try {
      const id = pathname.replace('/api/admin/users/', '');
      await store.deleteUser(id);
      return sendJson(res, 200, { success: true, message: 'User deleted successfully' });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // Fallback 404 for unknown API routes
  return sendJson(res, 404, { error: 'Endpoint not found' });
}

// Create HTTP server
const server = http.createServer(handleRequest);

// Standalone execution entrypoint (node server.js or npm start)
if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`  Creston Premium Collections Server Running on port ${PORT}`);
    console.log(`  Storefront: http://localhost:${PORT}/`);
    console.log(`  Admin: http://localhost:${PORT}/admin`);
    console.log(`  Default Admin: admin / admin123`);
    console.log(`  Default Staff: ruaistaff / ruai123`);
    console.log(`=======================================================`);
  });
}

// Export for Vercel Serverless Function and testing
module.exports = handleRequest;
