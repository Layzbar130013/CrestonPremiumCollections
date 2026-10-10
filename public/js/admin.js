// Creston Premium Collections - Admin & Management Portal
let currentUser = null;
let currentProducts = [];
let currentOrders = [];
let currentUsers = [];
let currentSettings = {};

document.addEventListener('DOMContentLoaded', async () => {
  setupTabNavigation();
  await checkAuth();
});

// Setup tab navigation
function setupTabNavigation() {
  const navItems = document.querySelectorAll('.sidebar-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.dataset.tab;
      switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  // Guard admin tabs if not admin
  if (['cms', 'settings', 'users'].includes(tabId)) {
    if (!currentUser || currentUser.role !== 'admin' && !(currentUser.rights && currentUser.rights.includes('admin'))) {
      showToast('Administrator privileges required for this section.', 'error');
      return;
    }
  }

  document.querySelectorAll('.sidebar-nav-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

  const navItem = document.querySelector(`.sidebar-nav-item[data-tab="${tabId}"]`);
  const pane = document.getElementById(`tab-${tabId}`);

  if (navItem) navItem.classList.add('active');
  if (pane) pane.classList.add('active');

  const titles = {
    overview: 'Dashboard Overview',
    inventory: 'Inventory & Australian Stocks',
    orders: 'Customer Orders & M-Pesa Verification',
    cms: 'Front Page & CMS Editor',
    settings: 'Store & Lipa Na M-Pesa Settings',
    users: 'Staff Accounts & Permission Rights',
    password: 'Change Password'
  };

  document.getElementById('pageTitle').innerText = titles[tabId] || 'Management Portal';

  // Lazy load tab data
  if (tabId === 'overview') loadDashboardStats();
  if (tabId === 'inventory') loadInventory();
  if (tabId === 'orders') loadOrders();
  if (tabId === 'cms' || tabId === 'settings') loadSettings();
  if (tabId === 'users') loadUsers();
}

// Check Authentication Status
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.authenticated && data.user) {
      currentUser = data.user;
      showAuthenticatedUI(currentUser);
      await loadInitialData();
    } else {
      showAuthGate();
    }
  } catch (err) {
    showAuthGate();
  }
}

function showAuthGate() {
  document.getElementById('adminSidebar').style.display = 'none';
  document.querySelector('.admin-topbar').style.display = 'none';
  document.getElementById('adminMainContent').style.display = 'none';
  document.getElementById('adminAuthGate').style.display = 'block';
}

function showAuthenticatedUI(user) {
  document.getElementById('adminSidebar').style.display = 'flex';
  document.querySelector('.admin-topbar').style.display = 'flex';
  document.getElementById('adminMainContent').style.display = 'block';
  document.getElementById('adminAuthGate').style.display = 'none';

  // User details in sidebar
  document.getElementById('sidebarUserName').innerText = user.name || user.username;
  document.getElementById('sidebarUserRole').innerText = user.role === 'admin' ? 'Super Administrator' : 'Staff Member';
  document.getElementById('userAvatar').innerText = (user.name || user.username).charAt(0).toUpperCase();

  // Rights pills in topbar
  const rightsContainer = document.getElementById('topbarRightsTags');
  const rights = Array.isArray(user.rights) ? user.rights : [];
  rightsContainer.innerHTML = rights.map(r => `
    <span class="right-tag ${r === 'admin' ? 'admin' : (r === 'edit_inventory' ? 'inventory' : '')}">
      ✓ ${escapeHtml(r)}
    </span>
  `).join('');

  const isAdmin = user.role === 'admin' || rights.includes('admin');
  const canEditInventory = isAdmin || rights.includes('edit_inventory');

  // Show/Hide Admin Only sections
  document.querySelectorAll('.admin-only').forEach(el => {
    if (isAdmin) {
      el.style.display = 'flex';
    } else {
      el.style.display = 'none';
    }
  });

  // Toggle "+ Add Product" button
  const addProdBtn = document.getElementById('btnOpenAddProduct');
  if (addProdBtn) {
    if (!canEditInventory) {
      addProdBtn.disabled = true;
      addProdBtn.title = 'Requires edit_inventory right';
      addProdBtn.style.opacity = '0.5';
    } else {
      addProdBtn.disabled = false;
      addProdBtn.style.opacity = '1';
    }
  }
}

// Gate Login Form Handler
async function handleGateLogin(event) {
  event.preventDefault();
  const username = document.getElementById('gateUsername').value.trim();
  const password = document.getElementById('gatePassword').value;
  const errorBox = document.getElementById('gateErrorMsg');

  errorBox.style.display = 'none';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    currentUser = data.user;
    showAuthenticatedUI(currentUser);
    await loadInitialData();
    showToast('Signed in successfully', 'success');
  } catch (err) {
    errorBox.innerText = err.message;
    errorBox.style.display = 'block';
  }
}

// Logout
async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (err) {}
  window.location.href = '/';
}

// Load Initial Data
async function loadInitialData() {
  await loadDashboardStats();
  await loadInventory();
  await loadOrders();
  await loadSettings();
  if (currentUser && (currentUser.role === 'admin' || (currentUser.rights && currentUser.rights.includes('admin')))) {
    await loadUsers();
  }
}

// -------------------------------------------------------------
// 1. Dashboard Overview Stats
// -------------------------------------------------------------
async function loadDashboardStats() {
  try {
    const res = await fetch('/api/admin/stats');
    if (!res.ok) return;
    const stats = await res.json();

    document.getElementById('statTotalProducts').innerText = stats.totalProducts || 0;
    document.getElementById('statTotalStock').innerText = stats.totalStockUnits || 0;
    document.getElementById('statLowStock').innerText = stats.lowStockCount || 0;
    document.getElementById('statTotalOrders').innerText = stats.totalOrders || 0;
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

// -------------------------------------------------------------
// 2. Inventory & Stocks Management
// -------------------------------------------------------------
async function loadInventory() {
  try {
    const res = await fetch('/api/admin/products');
    if (!res.ok) throw new Error('Failed to load inventory');
    currentProducts = await res.json();
    renderInventoryTable();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderInventoryTable() {
  const tbody = document.getElementById('inventoryTableBody');
  if (!tbody) return;

  const search = (document.getElementById('inventorySearchInput')?.value || '').toLowerCase().trim();
  const canEdit = currentUser && (currentUser.role === 'admin' || (currentUser.rights && currentUser.rights.includes('edit_inventory')));

  let list = currentProducts;
  if (search) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.category.toLowerCase().includes(search) ||
      p.origin.toLowerCase().includes(search)
    );
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">No products found matching criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => {
    let stockClass = 'in-stock';
    let stockLabel = `${p.stock} In Stock`;
    if (p.stock <= 0) {
      stockClass = 'out-stock';
      stockLabel = 'Out of Stock';
    } else if (p.stock <= 5) {
      stockClass = 'low-stock';
      stockLabel = `Low (${p.stock})`;
    }

    const sizes = Array.isArray(p.sizes) ? p.sizes.join(', ') : (p.sizes || 'Standard');

    return `
      <tr>
        <td>
          <div class="table-product-cell">
            <img src="${p.imageUrl}" alt="${escapeHtml(p.name)}" class="table-product-thumb">
            <div class="table-product-info">
              <h5>${escapeHtml(p.name)}</h5>
              <span>🇦🇺 ${escapeHtml(p.origin)}</span>
            </div>
          </div>
        </td>
        <td><span style="font-weight: 600;">${escapeHtml(p.category)}</span></td>
        <td><strong style="color: var(--primary);">KSh ${p.price.toLocaleString()}</strong></td>
        <td>
          ${canEdit ? `
            <div class="stock-stepper">
              <button class="btn-step" onclick="adjustProductStock('${p.id}', -1)">-</button>
              <span class="stock-num" onclick="promptSetStock('${p.id}', ${p.stock})" title="Click to set exact stock units">${p.stock}</span>
              <button class="btn-step" onclick="adjustProductStock('${p.id}', 1)">+</button>
            </div>
          ` : `
            <strong>${p.stock}</strong>
          `}
        </td>
        <td>
          <span class="stock-pill ${stockClass}">${stockLabel}</span>
        </td>
        <td><small style="color: #64748b;">${escapeHtml(sizes)}</small></td>
        <td style="text-align: right;">
          <div class="table-actions" style="justify-content: flex-end;">
            ${canEdit ? `
              <button class="btn-icon-action" title="Edit Product" onclick="openEditProductModal('${p.id}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              <button class="btn-icon-action delete" title="Delete Product" onclick="deleteProduct('${p.id}', '${escapeHtml(p.name)}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            ` : `
              <span style="font-size: 0.72rem; color: #94a3b8;">View only</span>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Adjust stock by delta (+1 / -1)
async function adjustProductStock(id, delta) {
  try {
    const res = await fetch(`/api/admin/products/${id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update stock');

    const index = currentProducts.findIndex(p => p.id === id);
    if (index > -1) currentProducts[index] = data.product;
    renderInventoryTable();
    loadDashboardStats();
    showToast(`Stock updated to ${data.product.stock}`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Prompt set absolute stock
async function promptSetStock(id, current) {
  const val = prompt('Set exact stock units for this Australian item:', current);
  if (val === null || val.trim() === '') return;
  const num = parseInt(val, 10);
  if (isNaN(num) || num < 0) {
    alert('Please enter a valid non-negative number');
    return;
  }

  try {
    const res = await fetch(`/api/admin/products/${id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ absolute: num })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update stock');

    const index = currentProducts.findIndex(p => p.id === id);
    if (index > -1) currentProducts[index] = data.product;
    renderInventoryTable();
    loadDashboardStats();
    showToast(`Stock updated to ${num}`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Add / Edit Product Modals
function openAddProductModal() {
  document.getElementById('productModalTitle').innerText = 'Add Australian Product';
  document.getElementById('prodEditId').value = '';
  document.getElementById('productForm').reset();
  document.getElementById('prodOrigin').value = 'Imported from Melbourne, Australia';
  document.getElementById('prodBadge').value = 'Aussie Import';
  document.getElementById('prodSizes').value = 'S, M, L, XL';
  document.getElementById('prodStock').value = '15';
  document.getElementById('productModal').classList.add('active');
}

function openEditProductModal(id) {
  const prod = currentProducts.find(p => p.id === id);
  if (!prod) return;

  document.getElementById('productModalTitle').innerText = 'Edit Australian Product';
  document.getElementById('prodEditId').value = prod.id;
  document.getElementById('prodName').value = prod.name;
  document.getElementById('prodCategory').value = prod.category;
  document.getElementById('prodPrice').value = prod.price;
  document.getElementById('prodOriginalPrice').value = prod.originalPrice || prod.price;
  document.getElementById('prodStock').value = prod.stock;
  document.getElementById('prodOrigin').value = prod.origin || 'Imported from Australia';
  document.getElementById('prodSizes').value = Array.isArray(prod.sizes) ? prod.sizes.join(', ') : prod.sizes;
  document.getElementById('prodColors').value = Array.isArray(prod.colors) ? prod.colors.join(', ') : prod.colors;
  document.getElementById('prodBadge').value = prod.badge || '';
  document.getElementById('prodImageUrl').value = prod.imageUrl || '';
  document.getElementById('prodDescription').value = prod.description || '';
  document.getElementById('prodFeatured').checked = Boolean(prod.featured);

  document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('active');
}

async function handleProductFormSubmit(event) {
  event.preventDefault();
  const editId = document.getElementById('prodEditId').value;
  const isEditing = Boolean(editId);

  const productData = {
    name: document.getElementById('prodName').value.trim(),
    category: document.getElementById('prodCategory').value,
    price: Number(document.getElementById('prodPrice').value),
    originalPrice: Number(document.getElementById('prodOriginalPrice').value),
    stock: Number(document.getElementById('prodStock').value),
    origin: document.getElementById('prodOrigin').value.trim(),
    sizes: document.getElementById('prodSizes').value.split(',').map(s => s.trim()).filter(Boolean),
    colors: document.getElementById('prodColors').value.split(',').map(c => c.trim()).filter(Boolean),
    badge: document.getElementById('prodBadge').value.trim(),
    imageUrl: document.getElementById('prodImageUrl').value.trim(),
    description: document.getElementById('prodDescription').value.trim(),
    featured: document.getElementById('prodFeatured').checked
  };

  const btn = document.getElementById('btnSaveProduct');
  btn.disabled = true;

  try {
    const url = isEditing ? `/api/admin/products/${editId}` : '/api/admin/products';
    const method = isEditing ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save product');

    closeProductModal();
    await loadInventory();
    loadDashboardStats();
    showToast(isEditing ? 'Product updated successfully' : 'New Australian product added!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function deleteProduct(id, name) {
  if (!confirm(`Are you sure you want to remove "${name}" from inventory?`)) return;

  try {
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete product');

    await loadInventory();
    loadDashboardStats();
    showToast('Product removed from inventory', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// 3. Orders & Lipa Na M-Pesa Verification
// -------------------------------------------------------------
async function loadOrders() {
  try {
    const res = await fetch('/api/admin/orders');
    if (!res.ok) throw new Error('Failed to load orders');
    currentOrders = await res.json();
    renderOrdersTable();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderOrdersTable() {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  if (currentOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">No orders recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = currentOrders.map(o => {
    const cleanPhone = (o.phone || '').replace(/[^0-9]/g, '');
    const itemsText = (o.items || []).map(i => `${i.name} (${i.size}) x${i.quantity}`).join('<br>');
    const waMsg = `Hello ${o.customerName}, regarding your Creston Premium Collections order ${o.id} in Ruai: Your order has been marked as ${o.status}.`;
    const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}`;

    return `
      <tr>
        <td><strong>${o.id}</strong><br><small style="color: #64748b;">${new Date(o.createdAt).toLocaleDateString()}</small></td>
        <td>
          <strong>${escapeHtml(o.customerName)}</strong><br>
          <a href="tel:${o.phone}" style="color: #0284c7; font-size: 0.82rem;">${escapeHtml(o.phone)}</a>
        </td>
        <td>${escapeHtml(o.deliveryArea)}<br><small style="color: #64748b;">${escapeHtml(o.deliveryAddress || '')}</small></td>
        <td style="font-size: 0.8rem;">${itemsText}</td>
        <td><strong style="color: #008751;">KSh ${o.totalAmount.toLocaleString()}</strong></td>
        <td>
          ${o.mpesaReceipt ? `
            <span style="background: #dcfce7; color: #16a34a; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.82rem;">
              ${escapeHtml(o.mpesaReceipt)}
            </span>
          ` : `
            <span style="color: #d97706; font-size: 0.78rem;">Pending Code</span>
          `}
        </td>
        <td>
          <select class="form-control" style="padding: 4px 8px; font-size: 0.82rem;" onchange="updateOrderStatus('${o.id}', this.value)">
            <option value="Pending Payment" ${o.status === 'Pending Payment' ? 'selected' : ''}>Pending Payment</option>
            <option value="Confirmed" ${o.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="Dispatched" ${o.status === 'Dispatched' ? 'selected' : ''}>Dispatched</option>
            <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
          </select>
        </td>
        <td style="text-align: right;">
          <a href="${waLink}" target="_blank" class="btn-topbar" style="padding: 4px 8px; font-size: 0.75rem; color: #16a34a;" title="WhatsApp Customer">
            Chat
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

async function updateOrderStatus(orderId, status) {
  try {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update order status');

    const index = currentOrders.findIndex(o => o.id === orderId);
    if (index > -1) currentOrders[index] = data.order;
    showToast(`Order status updated to ${status}`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// 4. Front Page & CMS Editor
// -------------------------------------------------------------
async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    currentSettings = await res.json();
    populateSettingsInputs(currentSettings);
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

function populateSettingsInputs(s) {
  // Sidebar brand
  document.getElementById('sidebarBrandName').innerText = s.businessName || 'Creston Premium';
  document.getElementById('quickPaybillVal').innerText = s.paybill || '542542';
  document.getElementById('quickAccVal').innerText = s.accountNo || '118988';

  // CMS inputs
  document.getElementById('cmsAnnouncement').value = s.announcement || '';
  if (s.hero) {
    document.getElementById('cmsHeroBadge').value = s.hero.badge || '';
    document.getElementById('cmsHeroImage').value = s.hero.bannerImage || '';
    document.getElementById('cmsHeroTitle').value = s.hero.title || '';
    document.getElementById('cmsHeroSubtitle').value = s.hero.subtitle || '';
    document.getElementById('cmsCtaText').value = s.hero.ctaText || '';
    document.getElementById('cmsCtaLink').value = s.hero.ctaLink || '';
  }
  if (s.about) {
    document.getElementById('cmsAboutBadge').value = s.about.badge || '';
    document.getElementById('cmsAboutTitle').value = s.about.title || '';
    document.getElementById('cmsAboutStory').value = s.about.story || '';
    document.getElementById('cmsAboutMottoDesc').value = s.about.mottoDescription || '';
    document.getElementById('cmsAboutGuarantee').value = s.about.sourcingGuarantee || '';
    document.getElementById('cmsAboutLocationInfo').value = s.about.locationInfo || '';
    document.getElementById('cmsAboutPickupAddress').value = s.about.pickupAddress || '';
  }

  // Store Settings inputs
  document.getElementById('setBusinessName').value = s.businessName || 'Creston Premium Collections';
  document.getElementById('setMotto').value = s.motto || 'Quality, Style, Trust';
  document.getElementById('setPaybill').value = s.paybill || '542542';
  document.getElementById('setAccountNo').value = s.accountNo || '118988';
  document.getElementById('setPhone').value = s.phone || '+254792878586';
  document.getElementById('setWhatsapp').value = s.whatsapp || '+254792878586';
  document.getElementById('setLogoUrl').value = s.logoUrl || '';
  document.getElementById('setEmail').value = s.email || '';
  document.getElementById('setLocation').value = s.location || 'Ruai, Kangundo Road, Nairobi, Kenya';
}

async function saveFrontPageCms() {
  const updates = {
    announcement: document.getElementById('cmsAnnouncement').value.trim(),
    hero: {
      badge: document.getElementById('cmsHeroBadge').value.trim(),
      bannerImage: document.getElementById('cmsHeroImage').value.trim(),
      title: document.getElementById('cmsHeroTitle').value.trim(),
      subtitle: document.getElementById('cmsHeroSubtitle').value.trim(),
      ctaText: document.getElementById('cmsCtaText').value.trim(),
      ctaLink: document.getElementById('cmsCtaLink').value.trim()
    },
    about: {
      badge: document.getElementById('cmsAboutBadge').value.trim(),
      title: document.getElementById('cmsAboutTitle').value.trim(),
      story: document.getElementById('cmsAboutStory').value.trim(),
      mottoDescription: document.getElementById('cmsAboutMottoDesc').value.trim(),
      sourcingGuarantee: document.getElementById('cmsAboutGuarantee').value.trim(),
      locationInfo: document.getElementById('cmsAboutLocationInfo').value.trim(),
      pickupAddress: document.getElementById('cmsAboutPickupAddress').value.trim()
    }
  };

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update front page content');

    currentSettings = data.settings;
    showToast('Front page & CMS updated successfully!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// 5. Store & M-Pesa Settings
// -------------------------------------------------------------
async function saveStoreSettings() {
  const updates = {
    businessName: document.getElementById('setBusinessName').value.trim(),
    motto: document.getElementById('setMotto').value.trim(),
    paybill: document.getElementById('setPaybill').value.trim(),
    accountNo: document.getElementById('setAccountNo').value.trim(),
    phone: document.getElementById('setPhone').value.trim(),
    whatsapp: document.getElementById('setWhatsapp').value.trim(),
    logoUrl: document.getElementById('setLogoUrl').value.trim(),
    email: document.getElementById('setEmail').value.trim(),
    location: document.getElementById('setLocation').value.trim()
  };

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save store settings');

    currentSettings = data.settings;
    document.getElementById('quickPaybillVal').innerText = updates.paybill;
    document.getElementById('quickAccVal').innerText = updates.accountNo;
    document.getElementById('sidebarBrandName').innerText = updates.businessName;
    showToast('Store & Paybill settings updated successfully!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// 6. Users & Permission Rights Management
// -------------------------------------------------------------
async function loadUsers() {
  try {
    const res = await fetch('/api/admin/users');
    if (!res.ok) throw new Error('Failed to load users');
    currentUsers = await res.json();
    renderUsersTable();
  } catch (err) {
    console.error('Error loading users:', err);
  }
}

function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  tbody.innerHTML = currentUsers.map(u => {
    const rights = Array.isArray(u.rights) ? u.rights : [];
    const isMainAdmin = u.username === 'admin';

    return `
      <tr>
        <td>
          <strong>${escapeHtml(u.name)}</strong><br>
          <small style="color: #64748b;">@${escapeHtml(u.username)}</small>
        </td>
        <td>
          <span style="font-weight: 700; text-transform: uppercase; font-size: 0.75rem; color: ${u.role === 'admin' ? '#b45309' : '#0369a1'};">
            ${u.role}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            ${rights.map(r => `
              <span class="right-tag ${r === 'admin' ? 'admin' : (r === 'edit_inventory' ? 'inventory' : '')}">
                ${escapeHtml(r)}
              </span>
            `).join('')}
          </div>
        </td>
        <td><small style="color: #64748b;">${new Date(u.createdAt).toLocaleDateString()}</small></td>
        <td style="text-align: right;">
          <div class="table-actions" style="justify-content: flex-end;">
            <button class="btn-icon-action" title="Edit Rights & Password" onclick="openEditUserModal('${u.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            ${!isMainAdmin ? `
              <button class="btn-icon-action delete" title="Delete User" onclick="deleteUser('${u.id}', '${escapeHtml(u.username)}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddUserModal() {
  document.getElementById('userModalTitle').innerText = 'Add New User / Staff';
  document.getElementById('userEditId').value = '';
  document.getElementById('userFormUsername').disabled = false;
  document.getElementById('userFormUsername').value = '';
  document.getElementById('userFormName').value = '';
  document.getElementById('userFormPassword').value = '';
  document.getElementById('userFormPassword').required = true;
  document.getElementById('userPasswordHint').style.display = 'none';
  document.getElementById('userFormRole').value = 'staff';
  document.getElementById('rightViewStocks').checked = true;
  document.getElementById('rightEditInventory').checked = false;
  document.getElementById('rightAdmin').checked = false;
  document.getElementById('userModal').classList.add('active');
}

function openEditUserModal(id) {
  const user = currentUsers.find(u => u.id === id);
  if (!user) return;

  document.getElementById('userModalTitle').innerText = `Edit Rights: @${user.username}`;
  document.getElementById('userEditId').value = user.id;
  document.getElementById('userFormUsername').value = user.username;
  document.getElementById('userFormUsername').disabled = true;
  document.getElementById('userFormName').value = user.name;
  document.getElementById('userFormPassword').value = '';
  document.getElementById('userFormPassword').required = false;
  document.getElementById('userPasswordHint').style.display = 'block';
  document.getElementById('userFormRole').value = user.role;

  const rights = Array.isArray(user.rights) ? user.rights : [];
  document.getElementById('rightViewStocks').checked = rights.includes('view_stocks');
  document.getElementById('rightEditInventory').checked = rights.includes('edit_inventory');
  document.getElementById('rightAdmin').checked = rights.includes('admin');

  document.getElementById('userModal').classList.add('active');
}

function handleRoleChange(role) {
  if (role === 'admin') {
    document.getElementById('rightViewStocks').checked = true;
    document.getElementById('rightEditInventory').checked = true;
    document.getElementById('rightAdmin').checked = true;
  }
}

function closeUserModal() {
  document.getElementById('userModal').classList.remove('active');
}

async function handleUserFormSubmit(event) {
  event.preventDefault();
  const editId = document.getElementById('userEditId').value;
  const isEditing = Boolean(editId);

  const selectedRights = [];
  if (document.getElementById('rightViewStocks').checked) selectedRights.push('view_stocks');
  if (document.getElementById('rightEditInventory').checked) selectedRights.push('edit_inventory');
  if (document.getElementById('rightAdmin').checked) selectedRights.push('admin');

  if (selectedRights.length === 0) {
    alert('Please grant at least one right (e.g. view_stocks)');
    return;
  }

  const payload = {
    username: document.getElementById('userFormUsername').value.trim(),
    name: document.getElementById('userFormName').value.trim(),
    role: document.getElementById('userFormRole').value,
    rights: selectedRights
  };

  const passwordVal = document.getElementById('userFormPassword').value;
  if (passwordVal && passwordVal.trim().length >= 6) {
    payload.password = passwordVal.trim();
  }

  const btn = document.getElementById('btnSaveUser');
  btn.disabled = true;

  try {
    const url = isEditing ? `/api/admin/users/${editId}` : '/api/admin/users';
    const method = isEditing ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save user');

    closeUserModal();
    await loadUsers();
    showToast(isEditing ? 'User permissions updated' : 'New user created successfully', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function deleteUser(id, username) {
  if (!confirm(`Delete user account "@${username}"?`)) return;

  try {
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete user');

    await loadUsers();
    showToast(`User @${username} removed`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// 7. Change Admin Password
// -------------------------------------------------------------
async function handleChangePassword(event) {
  event.preventDefault();
  const currentPassword = document.getElementById('pwdCurrent').value;
  const newPassword = document.getElementById('pwdNew').value;
  const confirmPassword = document.getElementById('pwdConfirm').value;

  if (newPassword !== confirmPassword) {
    showToast('New passwords do not match', 'error');
    return;
  }

  if (newPassword.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }

  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to change password');

    document.getElementById('changePasswordForm').reset();
    showToast('Password changed successfully!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// Utilities & Toasts
// -------------------------------------------------------------
function showToast(message, type = 'info') {
  const toast = document.getElementById('adminToast');
  if (!toast) return;

  toast.className = `toast-notice ${type} show`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ')}</span><span>${escapeHtml(message)}</span>`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
