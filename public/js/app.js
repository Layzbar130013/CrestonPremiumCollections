// Creston Premium Collections - Customer Storefront Application
let storeSettings = {};
let allProducts = [];
let currentCategory = 'All';
let cart = JSON.parse(localStorage.getItem('creston_cart') || '[]');
let currentUser = null;

// Initialize Storefront
document.addEventListener('DOMContentLoaded', async () => {
  await loadStoreSettings();
  await loadProducts();
  await checkAuthStatus();
  updateCartBadge();
  renderCart();

  // Setup live search
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderProducts();
    });
  }

  // Account button click handler
  const discreteLoginBtn = document.getElementById('discreteLoginBtn');
  if (discreteLoginBtn) {
    discreteLoginBtn.addEventListener('click', handleAccountAction);
  }

  // Mobile menu button
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', openMobileNav);
  }

  // Cart Drawer open/close
  document.getElementById('openCartBtn').addEventListener('click', openCart);
});

// Load Store Settings from API
async function loadStoreSettings() {
  try {
    const res = await fetch('/api/settings');
    storeSettings = await res.json();
    applySettingsToDOM(storeSettings);
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

// Apply Dynamic Settings to Customer Storefront
function applySettingsToDOM(settings) {
  if (!settings) return;

  // Business Name & Motto
  document.getElementById('brandNameDisplay').innerText = settings.businessName || 'Creston Premium Collections';
  document.getElementById('brandMottoDisplay').innerText = settings.motto || 'Quality, Style, Trust';
  document.getElementById('footerBrandName').innerText = settings.businessName || 'Creston Premium Collections';
  document.getElementById('footerCopyrightName').innerText = settings.businessName || 'Creston Premium Collections';
  document.getElementById('footerMotto').innerText = settings.motto ? `${settings.motto}.` : 'Quality, Style, Trust.';
  document.getElementById('aboutMottoDisplay').innerText = settings.motto || 'Quality, Style, Trust';

  // Logo
  if (settings.logoUrl && settings.logoUrl.trim()) {
    const logoImg = document.getElementById('logoImgDisplay');
    const logoIcon = document.getElementById('logoIconDisplay');
    logoImg.src = settings.logoUrl;
    logoImg.style.display = 'block';
    logoIcon.style.display = 'none';
  }

  // Top bar contacts & announcement
  if (settings.announcement) {
    document.getElementById('topAnnouncementText').innerText = settings.announcement;
  }
  if (settings.phone) {
    document.getElementById('topPhoneText').innerText = settings.phone;
    document.getElementById('topPhoneLink').href = `tel:${settings.phone}`;
    document.getElementById('footerPhone').innerText = `Phone: ${settings.phone}`;
  }
  if (settings.whatsapp) {
    const cleanNum = settings.whatsapp.replace(/[^0-9]/g, '');
    document.getElementById('topWhatsappLink').href = `https://wa.me/${cleanNum}?text=Hello%20Creston%20Premium%20Collections`;
    document.getElementById('footerWhatsapp').innerText = `WhatsApp: ${settings.whatsapp}`;
  }
  if (settings.location) {
    document.getElementById('heroLocationTag').innerText = settings.location;
    document.getElementById('footerLocation').innerText = settings.location;
  }

  // Paybill numbers
  const pb = settings.paybill || '542542';
  const acc = settings.accountNo || '118988';
  document.getElementById('heroPaybillDisplay').innerText = pb;
  document.getElementById('heroAccountDisplay').innerText = acc;
  document.getElementById('guidePaybillNumber').innerText = pb;
  document.getElementById('guideAccountNumber').innerText = acc;
  document.getElementById('stepPaybill').innerText = pb;
  document.getElementById('stepAccount').innerText = acc;
  document.getElementById('footerPaybill').innerText = pb;
  document.getElementById('footerAccount').innerText = acc;
  document.getElementById('modalPaybillNumber').innerText = pb;
  document.getElementById('modalAccountNumber').innerText = acc;

  // Hero section
  if (settings.hero) {
    if (settings.hero.badge) document.getElementById('heroBadgeText').innerText = settings.hero.badge;
    if (settings.hero.title) document.getElementById('heroTitleText').innerText = settings.hero.title;
    if (settings.hero.subtitle) document.getElementById('heroSubtitleText').innerText = settings.hero.subtitle;
    if (settings.hero.ctaText) document.getElementById('heroCtaText').innerText = settings.hero.ctaText;
    if (settings.hero.ctaLink) document.getElementById('heroCtaLink').href = settings.hero.ctaLink;
    if (settings.hero.secondaryCtaText) document.getElementById('heroSecondaryCtaText').innerText = settings.hero.secondaryCtaText;
    if (settings.hero.secondaryCtaLink) document.getElementById('heroSecondaryCtaLink').href = settings.hero.secondaryCtaLink;
    if (settings.hero.bannerImage) {
      document.getElementById('heroBgOverlay').style.backgroundImage = `url('${settings.hero.bannerImage}')`;
    }
  }

  // About Section
  if (settings.about) {
    if (settings.about.badge) document.getElementById('aboutBadge').innerText = settings.about.badge;
    if (settings.about.title) document.getElementById('aboutTitle').innerText = settings.about.title;
    if (settings.about.story) document.getElementById('aboutStory').innerText = settings.about.story;
    if (settings.about.mottoDescription) document.getElementById('aboutMottoDesc').innerText = settings.about.mottoDescription;
    if (settings.about.sourcingGuarantee) document.getElementById('aboutGuarantee').innerText = settings.about.sourcingGuarantee;
    if (settings.about.locationInfo) document.getElementById('aboutLocationInfo').innerText = settings.about.locationInfo;
    if (settings.about.pickupAddress) document.getElementById('pickupAddressText').innerText = settings.about.pickupAddress;
  }

  // Delivery options
  renderDeliveryRates(settings.deliveryRates || []);
}

// Render Delivery Rates list in About section & Cart selector
function renderDeliveryRates(rates) {
  const container = document.getElementById('deliveryRatesList');
  const cartSelect = document.getElementById('cartDeliverySelect');
  if (!container || !cartSelect) return;

  container.innerHTML = rates.map(r => `
    <div class="delivery-item">
      <div>
        <div class="del-name">${escapeHtml(r.name)}</div>
        <div class="del-est">${escapeHtml(r.estimate)}</div>
      </div>
      <div class="del-fee">${r.fee === 0 ? 'FREE' : 'KSh ' + r.fee.toLocaleString()}</div>
    </div>
  `).join('');

  cartSelect.innerHTML = rates.map(r => `
    <option value="${r.id}" data-fee="${r.fee}">
      ${escapeHtml(r.name)} (${r.fee === 0 ? 'Free' : 'KSh ' + r.fee.toLocaleString()})
    </option>
  `).join('');
}

// Load Products Catalog
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    allProducts = await res.json();
    renderProducts();
  } catch (err) {
    console.error('Error loading products:', err);
  }
}

// Set Active Category Filter
function setCategoryFilter(cat) {
  currentCategory = cat;
  const pills = document.querySelectorAll('.cat-pill');
  pills.forEach(p => {
    if (p.innerText.toLowerCase().includes(cat.toLowerCase()) || (cat === 'All' && p.innerText === 'All Items')) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });
  renderProducts();
}

// Render Products Grid with Filters & Sort
function renderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  const searchVal = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  const sortVal = document.getElementById('sortSelect')?.value || 'featured';

  let list = allProducts.filter(p => {
    const matchCat = currentCategory === 'All' || p.category.toLowerCase() === currentCategory.toLowerCase();
    const matchSearch = !searchVal ||
      p.name.toLowerCase().includes(searchVal) ||
      p.description.toLowerCase().includes(searchVal) ||
      p.origin.toLowerCase().includes(searchVal) ||
      (p.badge && p.badge.toLowerCase().includes(searchVal));
    return matchCat && matchSearch;
  });

  // Sort
  if (sortVal === 'price-asc') {
    list.sort((a, b) => a.price - b.price);
  } else if (sortVal === 'price-desc') {
    list.sort((a, b) => b.price - a.price);
  } else if (sortVal === 'stock-desc') {
    list.sort((a, b) => b.stock - a.stock);
  } else {
    // Featured first
    list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }

  if (list.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #64748b;">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">🇦🇺</div>
        <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--primary);">No Australian items matched your search</h3>
        <p style="margin-top: 6px;">Try adjusting your keywords or category filters</p>
        <button class="btn-primary" onclick="setCategoryFilter('All'); document.getElementById('searchInput').value='';" style="margin-top: 16px;">
          View All Australian Apparel
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map(p => {
    let stockClass = 'stock-in';
    let stockText = `${p.stock} in stock`;
    if (p.stock <= 0) {
      stockClass = 'stock-out';
      stockText = 'Sold Out';
    } else if (p.stock <= 4) {
      stockClass = 'stock-low';
      stockText = `Only ${p.stock} left`;
    }

    const sizes = Array.isArray(p.sizes) ? p.sizes : ['M', 'L'];
    const defaultSize = sizes[0] || 'Standard';
    const cleanPhone = (storeSettings.whatsapp || '+254792878586').replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello Creston Premium Collections, I want to order the Australian imported "${p.name}" (KSh ${p.price.toLocaleString()}) in Ruai.`)}`;

    return `
      <div class="product-card">
        <div class="product-media" onclick="openProductQuickView('${p.id}')" style="cursor: pointer;">
          <img src="${p.imageUrl}" alt="${escapeHtml(p.name)}" class="product-img" loading="lazy">
          <div class="product-origin-badge">
            <span>🇦🇺</span>
            <span>${escapeHtml(p.badge || 'Aussie Import')}</span>
          </div>
          <span class="product-stock-tag ${stockClass}">${stockText}</span>
        </div>

        <div class="product-details">
          <div class="product-meta-row">
            <span class="product-cat">${escapeHtml(p.category)} • ${escapeHtml(p.origin)}</span>
            <span class="product-rating">★ ${p.rating || 5.0}</span>
          </div>

          <h3 class="product-title" onclick="openProductQuickView('${p.id}')" style="cursor: pointer;">
            ${escapeHtml(p.name)}
          </h3>

          <div class="product-sizes-row">
            <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 600;">Sizes:</span>
            ${sizes.map((s, idx) => `
              <span class="size-chip ${idx === 0 ? 'selected' : ''}" onclick="selectCardSize(this, '${p.id}', '${s}')">${s}</span>
            `).join('')}
          </div>

          <div class="product-price-row">
            <span class="price-current">KSh ${p.price.toLocaleString()}</span>
            ${p.originalPrice > p.price ? `<span class="price-original">KSh ${p.originalPrice.toLocaleString()}</span>` : ''}
          </div>

          <div class="product-card-actions">
            <button class="btn-add-bag" ${p.stock <= 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} onclick="addToCart('${p.id}', '${defaultSize}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/></svg>
              <span>Add to Bag</span>
            </button>
            <a href="${waUrl}" target="_blank" class="btn-whatsapp-order" title="Order directly on WhatsApp" aria-label="WhatsApp order">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Select size on product card
function selectCardSize(element, productId, size) {
  const container = element.parentElement;
  container.querySelectorAll('.size-chip').forEach(c => c.classList.remove('selected'));
  element.classList.add('selected');
  const card = container.closest('.product-card');
  const addBtn = card.querySelector('.btn-add-bag');
  addBtn.setAttribute('onclick', `addToCart('${productId}', '${size}')`);
}

// Quick View Modal
function openProductQuickView(id) {
  const prod = allProducts.find(p => p.id === id);
  if (!prod) return;

  const modal = document.getElementById('productModalOverlay');
  const body = document.getElementById('modalProdBody');
  document.getElementById('modalProdTitle').innerText = prod.name;

  const sizes = Array.isArray(prod.sizes) ? prod.sizes : ['M', 'L'];
  const colors = Array.isArray(prod.colors) ? prod.colors : ['Standard'];
  const cleanPhone = (storeSettings.whatsapp || '+254792878586').replace(/[^0-9]/g, '');

  body.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 20px; align-items: start;">
      <div>
        <img src="${prod.imageUrl}" alt="${escapeHtml(prod.name)}" style="width: 100%; border-radius: 8px; object-fit: cover; aspect-ratio: 4/5;">
        <div style="margin-top: 10px; font-size: 0.78rem; color: #008751; font-weight: 700;">
          ✓ Lipa Na M-Pesa Paybill ${storeSettings.paybill || '542542'}
        </div>
      </div>

      <div>
        <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 8px;">
          <span style="background: #1e3a8a; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 700;">
            🇦🇺 ${escapeHtml(prod.origin)}
          </span>
          <span style="font-size: 0.8rem; color: #b45309; font-weight: 700;">
            ${prod.stock > 0 ? `In Stock (${prod.stock})` : 'Out of Stock'}
          </span>
        </div>

        <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary); margin-bottom: 12px;">
          KSh ${prod.price.toLocaleString()}
          ${prod.originalPrice > prod.price ? `<span style="font-size: 0.95rem; text-decoration: line-through; color: #94a3b8; margin-left: 8px;">KSh ${prod.originalPrice.toLocaleString()}</span>` : ''}
        </div>

        <p style="font-size: 0.88rem; color: #475569; line-height: 1.6; margin-bottom: 16px;">
          ${escapeHtml(prod.description)}
        </p>

        <div class="form-group">
          <label>Select Size</label>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="quickViewSizeGroup">
            ${sizes.map((s, idx) => `
              <button type="button" class="cat-pill ${idx === 0 ? 'active' : ''}" style="padding: 6px 14px; border-radius: 6px;" onclick="setModalSelectedSize(this, '${s}')">${s}</button>
            `).join('')}
          </div>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button class="btn-primary" style="flex: 1; justify-content: center;" onclick="addToCartFromModal('${prod.id}')">
            <span>Add to Bag</span>
          </button>
          <a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello Creston, I want to inquire about "${prod.name}" (KSh ${prod.price}) in Ruai.`)}" target="_blank" class="btn-whatsapp-order" style="padding: 10px 16px;">
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  `;

  modal.dataset.selectedSize = sizes[0] || 'Standard';
  modal.classList.add('active');
}

function setModalSelectedSize(btn, size) {
  const group = document.getElementById('quickViewSizeGroup');
  group.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('productModalOverlay').dataset.selectedSize = size;
}

function addToCartFromModal(prodId) {
  const modal = document.getElementById('productModalOverlay');
  const size = modal.dataset.selectedSize || 'Standard';
  addToCart(prodId, size);
  closeProductModal();
  openCart();
}

function closeProductModal() {
  document.getElementById('productModalOverlay').classList.remove('active');
}

// -------------------------------------------------------------
// Shopping Cart Logic
// -------------------------------------------------------------
function addToCart(productId, size = 'Standard') {
  const prod = allProducts.find(p => p.id === productId);
  if (!prod) return;

  const existingIndex = cart.findIndex(item => item.productId === productId && item.size === size);
  if (existingIndex > -1) {
    if (cart[existingIndex].quantity < prod.stock) {
      cart[existingIndex].quantity += 1;
    } else {
      alert(`Only ${prod.stock} units available in stock for this Australian item.`);
      return;
    }
  } else {
    cart.push({
      productId: prod.id,
      name: prod.name,
      price: prod.price,
      size: size,
      color: prod.colors ? prod.colors[0] : 'Standard',
      imageUrl: prod.imageUrl,
      maxStock: prod.stock,
      quantity: 1
    });
  }

  saveCart();
  updateCartBadge();
  renderCart();
  openCart();
}

function updateCartQuantity(index, delta) {
  if (!cart[index]) return;
  const newQty = cart[index].quantity + delta;
  if (newQty <= 0) {
    cart.splice(index, 1);
  } else if (newQty > cart[index].maxStock) {
    alert(`Only ${cart[index].maxStock} units currently available in stock.`);
    return;
  } else {
    cart[index].quantity = newQty;
  }
  saveCart();
  updateCartBadge();
  renderCart();
}

function removeCartItem(index) {
  cart.splice(index, 1);
  saveCart();
  updateCartBadge();
  renderCart();
}

function saveCart() {
  localStorage.setItem('creston_cart', JSON.stringify(cart));
}

function updateCartBadge() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cartBadgeCount');
  if (badge) badge.innerText = count;
  const mobBadge = document.getElementById('mobCartBadgeCount');
  if (mobBadge) mobBadge.innerText = count;
}

function openCart() {
  document.getElementById('cartOverlay').classList.add('active');
  document.getElementById('cartDrawer').classList.add('active');
  renderCart();
}

function closeCart() {
  document.getElementById('cartOverlay').classList.remove('active');
  document.getElementById('cartDrawer').classList.remove('active');
}

function renderCart() {
  const list = document.getElementById('cartItemList');
  const footer = document.getElementById('cartFooter');
  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛍️</div>
        <h4 style="font-weight: 700; color: var(--primary);">Your Bag is Empty</h4>
        <p style="font-size: 0.85rem; margin-top: 6px;">Discover our collection of Australian imported fashion.</p>
        <button class="btn-primary" onclick="closeCart()" style="margin-top: 16px; padding: 10px 20px;">
          Browse Aussie Clothes
        </button>
      </div>
    `;
    if (footer) footer.style.display = 'none';
    return;
  }

  if (footer) footer.style.display = 'block';

  list.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <img src="${item.imageUrl}" alt="${escapeHtml(item.name)}" class="cart-item-img">
      <div class="cart-item-info">
        <h5>${escapeHtml(item.name)}</h5>
        <div class="cart-item-meta">Size: <strong>${escapeHtml(item.size)}</strong></div>
        <div class="cart-item-price">KSh ${(item.price * item.quantity).toLocaleString()}</div>
      </div>
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
        <div class="cart-qty-ctrl">
          <button class="qty-btn" onclick="updateCartQuantity(${idx}, -1)">-</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn" onclick="updateCartQuantity(${idx}, 1)">+</button>
        </div>
        <button onclick="removeCartItem(${idx})" style="color: #ef4444; font-size: 0.75rem; text-decoration: underline;">Remove</button>
      </div>
    </div>
  `).join('');

  updateCartTotals();
}

function updateCartTotals() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const select = document.getElementById('cartDeliverySelect');
  let deliveryFee = 0;
  if (select && select.selectedOptions[0]) {
    deliveryFee = Number(select.selectedOptions[0].dataset.fee) || 0;
  }

  const grandTotal = subtotal + deliveryFee;

  document.getElementById('cartSubtotalText').innerText = `KSh ${subtotal.toLocaleString()}`;
  document.getElementById('cartDeliveryFeeText').innerText = deliveryFee === 0 ? 'FREE' : `KSh ${deliveryFee.toLocaleString()}`;
  document.getElementById('cartGrandTotalText').innerText = `KSh ${grandTotal.toLocaleString()}`;

  // Update checkout modal inputs
  document.getElementById('checkoutAmountDisplay').innerText = `KSh ${grandTotal.toLocaleString()}`;
  document.getElementById('modalTotalPayable').innerText = `KSh ${grandTotal.toLocaleString()}`;
  document.getElementById('checkoutItemSummary').innerText = `${cart.length} item(s) • Subtotal KSh ${subtotal.toLocaleString()} + Delivery KSh ${deliveryFee.toLocaleString()}`;
}

// -------------------------------------------------------------
// Lipa Na M-Pesa Checkout Flow
// -------------------------------------------------------------
function openCheckoutModal() {
  if (cart.length === 0) return;
  closeCart();
  document.getElementById('checkoutFormStep').style.display = 'block';
  document.getElementById('checkoutSuccessStep').style.display = 'none';
  document.getElementById('checkoutModalOverlay').classList.add('active');
  updateCartTotals();
}

function closeCheckoutModal() {
  document.getElementById('checkoutModalOverlay').classList.remove('active');
}

async function submitMpesaOrder() {
  const name = document.getElementById('custNameInput').value.trim();
  const phone = document.getElementById('custPhoneInput').value.trim();
  const address = document.getElementById('custAddressInput').value.trim();
  const mpesaReceipt = document.getElementById('custMpesaCodeInput').value.trim();

  if (!name || !phone || !address) {
    alert('Please enter your Name, Phone Number, and Delivery Location.');
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const select = document.getElementById('cartDeliverySelect');
  const deliveryFee = Number(select.selectedOptions[0]?.dataset.fee) || 0;
  const deliveryArea = select.selectedOptions[0]?.text || 'Ruai Local';
  const totalAmount = subtotal + deliveryFee;

  const btn = document.getElementById('submitOrderBtn');
  btn.disabled = true;
  btn.innerHTML = '<span>Processing M-Pesa Order...</span>';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: name,
        phone,
        deliveryArea,
        deliveryFee,
        deliveryAddress: address,
        items: cart,
        subtotal,
        totalAmount,
        mpesaReceipt
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to place order');
    }

    // Success! Show confirmation step
    document.getElementById('confirmedOrderId').innerText = data.order.id;
    document.getElementById('checkoutFormStep').style.display = 'none';
    document.getElementById('checkoutSuccessStep').style.display = 'block';

    // Build WhatsApp message for instant receipt sharing
    const cleanPhone = (storeSettings.whatsapp || '+254792878586').replace(/[^0-9]/g, '');
    const itemsSummary = cart.map(i => `${i.name} (Size: ${i.size}, Qty: ${i.quantity})`).join(', ');
    const waMsg = `Hello Creston Premium Collections, I have placed Order *${data.order.id}* for KSh ${totalAmount.toLocaleString()} via Lipa Na M-Pesa Paybill ${storeSettings.paybill || '542542'}.
Customer: ${name}
Phone: ${phone}
Delivery: ${address} (${deliveryArea})
Items: ${itemsSummary}
M-Pesa Code: ${mpesaReceipt || 'Pending SMS'}`;

    document.getElementById('whatsappShareReceiptBtn').href = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}`;

    // Clear cart
    cart = [];
    saveCart();
    updateCartBadge();
    loadProducts(); // Refresh stock counts in UI
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Confirm Order with M-Pesa</span>';
  }
}

// Order Cart directly on WhatsApp
function orderCartOnWhatsapp() {
  if (cart.length === 0) return;
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const select = document.getElementById('cartDeliverySelect');
  const deliveryFee = Number(select?.selectedOptions[0]?.dataset.fee) || 0;
  const total = subtotal + deliveryFee;
  const cleanPhone = (storeSettings.whatsapp || '+254792878586').replace(/[^0-9]/g, '');

  const itemsList = cart.map(i => `• ${i.name} [Size: ${i.size}] x${i.quantity} = KSh ${(i.price * i.quantity).toLocaleString()}`).join('\n');
  const msg = `Hello Creston Premium Collections, I want to order via WhatsApp:
${itemsList}
Subtotal: KSh ${subtotal.toLocaleString()}
Delivery option: ${select?.selectedOptions[0]?.text || 'Ruai'}
Total: KSh ${total.toLocaleString()}
Payment: Lipa Na M-Pesa Paybill ${storeSettings.paybill || '542542'} (Acc: ${storeSettings.accountNo || '118988'}).
Please confirm availability and delivery in Ruai / Nairobi.`;

  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// -------------------------------------------------------------
// Discrete Sign In & Account Management
// -------------------------------------------------------------
function openLoginModal() {
  document.getElementById('loginErrorMessage').style.display = 'none';
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginModalOverlay').classList.add('active');
}

function closeLoginModal() {
  document.getElementById('loginModalOverlay').classList.remove('active');
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorBox = document.getElementById('loginErrorMessage');
  const submitText = document.getElementById('loginSubmitText');

  errorBox.style.display = 'none';
  submitText.innerText = 'Signing in...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid credentials');
    }

    // Success! Redirect directly to /admin
    closeLoginModal();
    window.location.href = '/admin';
  } catch (err) {
    errorBox.innerText = err.message;
    errorBox.style.display = 'block';
  } finally {
    submitText.innerText = 'Sign In';
  }
}

function handleAccountAction() {
  if (currentUser && (currentUser.role === 'admin' || (currentUser.rights && currentUser.rights.length > 0))) {
    window.location.href = '/admin';
  } else {
    openLoginModal();
  }
}

function openMobileNav() {
  document.getElementById('mobileNavOverlay')?.classList.add('active');
  document.getElementById('mobileNavDrawer')?.classList.add('active');
}

function closeMobileNav() {
  document.getElementById('mobileNavOverlay')?.classList.remove('active');
  document.getElementById('mobileNavDrawer')?.classList.remove('active');
}

async function checkAuthStatus() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.authenticated && data.user) {
      currentUser = data.user;
      const label = document.getElementById('accountBtnLabel');
      if (label) {
        label.innerText = data.user.name || 'Account';
      }
      const mobLabel = document.getElementById('mobAccountLabel');
      if (mobLabel) {
        mobLabel.innerText = data.user.role === 'admin' ? 'Admin' : 'Account';
      }
    }
  } catch (err) {
    // Ignore unauthenticated
  }
}

// -------------------------------------------------------------
// Utilities
// -------------------------------------------------------------
function copyText(text, alertMsg = 'Copied to clipboard!') {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(alertMsg);
    }).catch(() => fallbackCopy(text, alertMsg));
  } else {
    fallbackCopy(text, alertMsg);
  }
}

function fallbackCopy(text, alertMsg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast(alertMsg);
}

function showToast(msg) {
  let toast = document.getElementById('storeToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'storeToast';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 600;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 8px;
      border-left: 4px solid #008751;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>✓</span><span>${escapeHtml(msg)}</span>`;
  toast.style.opacity = '1';
  toast.style.display = 'flex';
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { toast.style.display = 'none'; }, 300);
  }, 2500);
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
