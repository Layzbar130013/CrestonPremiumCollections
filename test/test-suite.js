const http = require('http');
const assert = require('assert');

// Port for test server
const TEST_PORT = 3001;
process.env.PORT = TEST_PORT;

// Start test server using exported handleRequest
const handleRequest = require('../server');
const testServer = http.createServer(handleRequest);
testServer.listen(TEST_PORT, '127.0.0.1');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      ...options
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk.toString());
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          json
        });
      });
    });
    req.on('error', reject);
    if (data) {
      if (typeof data === 'object') {
        req.write(JSON.stringify(data));
      } else {
        req.write(data);
      }
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Creston Premium Collections Test Suite...\n');
  let adminToken = null;
  let staffToken = null;

  try {
    // 1. Storefront HTML
    console.log('1. Testing Public Storefront & Admin HTML...');
    const homeRes = await request({ path: '/', method: 'GET' });
    assert.strictEqual(homeRes.statusCode, 200, 'Home should return 200');
    assert(homeRes.body.includes('Creston Premium Collections'), 'Storefront must include business name');
    assert(homeRes.body.includes('Lipa Na M-Pesa'), 'Storefront must include Lipa Na M-Pesa');
    console.log('   ✓ Storefront loads HTML with business branding & M-Pesa');

    const adminHtmlRes = await request({ path: '/admin', method: 'GET' });
    assert.strictEqual(adminHtmlRes.statusCode, 200, 'Admin page should return 200');
    assert(adminHtmlRes.body.includes('Management Portal'), 'Admin should have Management Portal');
    console.log('   ✓ Admin HTML loads correctly');

    // 2. Settings API
    console.log('\n2. Testing Store Settings API (Phone, WhatsApp, Paybill, Ruai)...');
    const settingsRes = await request({ path: '/api/settings', method: 'GET' });
    assert.strictEqual(settingsRes.statusCode, 200);
    assert.strictEqual(settingsRes.json.businessName, 'Creston Premium Collections');
    assert.strictEqual(settingsRes.json.paybill, '542542');
    assert.strictEqual(settingsRes.json.accountNo, '118988');
    assert.strictEqual(settingsRes.json.phone, '+254792878586');
    assert.strictEqual(settingsRes.json.whatsapp, '+254792878586');
    assert.strictEqual(settingsRes.json.motto, 'Quality, Style, Trust');
    console.log('   ✓ Correct Paybill: 542542, Account: 118988, Phone/WhatsApp: +254792878586, Motto: Quality, Style, Trust');

    // 3. Products API
    console.log('\n3. Testing Products API (Australian Imported Collection)...');
    const prodsRes = await request({ path: '/api/products', method: 'GET' });
    assert.strictEqual(prodsRes.statusCode, 200);
    const sampleProd = prodsRes.json[0];
    assert(sampleProd, 'Australian product should exist');
    console.log(`   ✓ Found ${prodsRes.json.length} Australian imported garments`);

    // 4. Authentication: Admin Login
    console.log('\n4. Testing Authentication & Session Management...');
    const badLogin = await request({
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'admin', password: 'wrongpassword' });
    assert.strictEqual(badLogin.statusCode, 401, 'Bad credentials should return 401');

    const adminLogin = await request({
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'admin', password: 'admin123' });
    assert.strictEqual(adminLogin.statusCode, 200, 'Admin login should succeed');
    assert(adminLogin.json.token, 'Token should be returned');
    adminToken = adminLogin.json.token;

    // Check auth status
    const meRes = await request({
      path: '/api/auth/me',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(meRes.statusCode, 200);
    assert.strictEqual(meRes.json.authenticated, true);
    assert.strictEqual(meRes.json.user.role, 'admin');
    assert(meRes.json.user.rights.includes('admin'));
    assert(meRes.json.user.rights.includes('edit_inventory'));
    assert(meRes.json.user.rights.includes('view_stocks'));
    console.log('   ✓ Admin login successful with full role & rights verified');

    // 5. Customer Order Placement (Lipa Na M-Pesa)
    console.log('\n5. Testing Customer Lipa Na M-Pesa Order Placement...');
    const initialStock = sampleProd.stock;
    const orderPayload = {
      customerName: 'John Kamau',
      phone: '0792878586',
      deliveryArea: 'Ruai Town Center',
      deliveryFee: 150,
      deliveryAddress: 'Near Quickmart Ruai',
      items: [
        { productId: sampleProd.id, name: sampleProd.name, size: 'L', price: sampleProd.price, quantity: 1 }
      ],
      subtotal: sampleProd.price,
      totalAmount: sampleProd.price + 150,
      mpesaReceipt: 'QKH1234XYZ'
    };

    const orderRes = await request({
      path: '/api/orders',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, orderPayload);
    assert.strictEqual(orderRes.statusCode, 201);
    assert.strictEqual(orderRes.json.order.mpesaReceipt, 'QKH1234XYZ');
    assert.strictEqual(orderRes.json.order.status, 'Confirmed');

    // Verify stock decremented
    const prodsAfterRes = await request({ path: '/api/products', method: 'GET' });
    const sampleAfter = prodsAfterRes.json.find(p => p.id === sampleProd.id);
    assert.strictEqual(sampleAfter.stock, initialStock - 1, 'Stock should decrease by ordered quantity');
    console.log(`   ✓ Lipa Na M-Pesa order placed (${orderRes.json.order.id}), stock decremented: ${initialStock} -> ${sampleAfter.stock}`);

    // 6. Admin Inventory Management: Add Product & Adjust Stock
    console.log('\n6. Testing Admin Inventory & Stock Control...');
    const newProdPayload = {
      name: 'Sydney Harbourside Silk Blend Scarf',
      category: 'Unisex',
      price: 1800,
      originalPrice: 2400,
      stock: 10,
      origin: 'Imported from Sydney, Australia',
      sizes: ['One Size'],
      badge: 'Sydney Boutique',
      imageUrl: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&w=800&q=80',
      description: 'Fine Australian silk-cotton blend scarf.',
      featured: true
    };

    const addProdRes = await request({
      path: '/api/admin/products',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, newProdPayload);
    assert.strictEqual(addProdRes.statusCode, 201);
    const addedId = addProdRes.json.product.id;
    console.log(`   ✓ New Australian product created: ID ${addedId}`);

    // Adjust stock
    const adjustStockRes = await request({
      path: `/api/admin/products/${addedId}/stock`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, { delta: 5 });
    assert.strictEqual(adjustStockRes.statusCode, 200);
    assert.strictEqual(adjustStockRes.json.product.stock, 15);
    console.log('   ✓ Stock quantity adjusted by +5 to 15');

    // 7. Admin CMS & Front Page Editing
    console.log('\n7. Testing Admin Front Page & Settings Updates...');
    const cmsUpdateRes = await request({
      path: '/api/admin/settings',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, {
      announcement: '🌟 Updated Announcement: Genuine Melbourne & Sydney Imports in Ruai Kenya!',
      hero: {
        title: 'Luxury Australian Fashion Collection in Kenya'
      }
    });
    assert.strictEqual(cmsUpdateRes.statusCode, 200);
    assert.strictEqual(cmsUpdateRes.json.settings.hero.title, 'Luxury Australian Fashion Collection in Kenya');
    console.log('   ✓ Front page hero title & announcement updated successfully');

    // 8. User & Granular Rights Management (view_stocks vs edit_inventory)
    console.log('\n8. Testing User & Permission Rights Management...');
    const testStaffUsername = 'auditor_' + Date.now();
    const newStaffPayload = {
      username: testStaffUsername,
      password: 'password123',
      name: 'Auditor Wangari',
      role: 'staff',
      rights: ['view_stocks'] // Can ONLY view stocks, cannot edit inventory!
    };

    const addUserRes = await request({
      path: '/api/admin/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, newStaffPayload);
    assert.strictEqual(addUserRes.statusCode, 201);
    console.log('   ✓ Created staff user with restricted right: ["view_stocks"]');

    // Login as the restricted staff member
    const staffLoginRes = await request({
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: testStaffUsername, password: 'password123' });
    assert.strictEqual(staffLoginRes.statusCode, 200);
    staffToken = staffLoginRes.json.token;

    // Verify staff CAN view stocks
    const staffViewStocks = await request({
      path: '/api/admin/products',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${staffToken}` }
    });
    assert.strictEqual(staffViewStocks.statusCode, 200, 'Staff with view_stocks should be allowed to view inventory');
    console.log('   ✓ Staff with "view_stocks" successfully viewed inventory');

    // Verify staff CANNOT add products (requires edit_inventory)
    const staffBlockedAdd = await request({
      path: '/api/admin/products',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      }
    }, { name: 'Unauthorized item', price: 1000 });
    assert.strictEqual(staffBlockedAdd.statusCode, 403, 'Staff without edit_inventory must be rejected with 403');
    console.log('   ✓ Staff without "edit_inventory" right was properly blocked (403 Forbidden)');

    // Verify staff CANNOT edit front page / store settings (requires admin)
    const staffBlockedSettings = await request({
      path: '/api/admin/settings',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      }
    }, { paybill: '999999' });
    assert.strictEqual(staffBlockedSettings.statusCode, 403, 'Staff without admin right must be blocked from settings');
    console.log('   ✓ Staff without "admin" right was properly blocked from settings (403 Forbidden)');

    // 9. Admin Password Change
    console.log('\n9. Testing Admin Password Change...');
    const pwdChangeRes = await request({
      path: '/api/auth/change-password',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, {
      currentPassword: 'admin123',
      newPassword: 'newadminpass123'
    });
    assert.strictEqual(pwdChangeRes.statusCode, 200);
    assert.strictEqual(pwdChangeRes.json.success, true);

    // Verify login with new password
    const newLoginRes = await request({
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'admin', password: 'newadminpass123' });
    assert.strictEqual(newLoginRes.statusCode, 200, 'Login with new password must succeed');
    console.log('   ✓ Admin password successfully changed and verified with new login');

    // Revert admin password back to admin123 for convenience
    await request({
      path: '/api/auth/change-password',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newLoginRes.json.token}`
      }
    }, {
      currentPassword: 'newadminpass123',
      newPassword: 'admin123'
    });
    console.log('   ✓ Admin password restored to standard default (admin123)');

    console.log('\n🎉 ALL 9 TEST SUITES PASSED FLAWLESSLY! 🎉\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test failure:', err);
    process.exit(1);
  }
}

setTimeout(runTests, 500);
