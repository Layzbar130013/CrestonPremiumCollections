const fs = require('fs');
const path = require('path');
const { hashPassword } = require('../utils/auth');

const DATA_DIR = path.join(__dirname, '..', 'data');

const DEFAULT_SETTINGS = {
  businessName: 'Creston Premium Collections',
  motto: 'Quality, Style, Trust',
  phone: '+254792878586',
  whatsapp: '+254792878586',
  paybill: '542542',
  accountNo: '118988',
  email: 'info@crestonpremium.co.ke',
  location: 'Ruai, Kangundo Road, Nairobi, Kenya',
  logoUrl: '',
  announcement: '🌟 Direct Australian Imports • Local Pickup in Ruai & Countrywide Delivery • Lipa Na M-Pesa Paybill 542542',
  hero: {
    badge: '100% Authentic Australian Imports',
    title: 'Australian Fashion Elegance in Kenya',
    subtitle: 'Handpicked premium linen, pure merino wool, boutique dresses, and streetwear directly imported from Melbourne & Sydney. Available at our Ruai showroom & delivered countrywide.',
    ctaText: 'Explore Aussie Collection',
    ctaLink: '#shop',
    secondaryCtaText: 'Lipa Na M-Pesa Guide',
    secondaryCtaLink: '#paybill-info',
    bannerImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80'
  },
  about: {
    badge: 'Our Ruai & Australian Heritage',
    title: 'Bridging Australian Quality & Kenyan Elegance',
    story: 'Creston Premium Collections was established in Ruai, Nairobi with a singular mission: to supply authentic, high-grade Australian imported clothing to discerning shoppers across Kenya. We source premium garments from Melbourne, Sydney, and Byron Bay, bringing you timeless designs crafted from Australian linen, heavyweight cotton, and pure merino wool.',
    mottoDescription: 'Our hallmark is built on Quality, Style, and Trust. We inspect every piece to guarantee unmatched durability, crisp cuts, and luxurious comfort suited for the Kenyan climate and modern lifestyle.',
    sourcingGuarantee: 'Every garment is authenticated and imported from reputable Australian fashion houses, ensuring you get true international value without compromise.',
    locationInfo: 'Based along Kangundo Road in Ruai, Nairobi. We offer swift local doorstep drop-offs in Ruai and surrounding areas, same-day delivery within Nairobi CBD, and tracked parcel dispatch to any town in Kenya.',
    pickupAddress: 'Creston Boutique Hub, Ruai Town Center, Kangundo Road, Nairobi'
  },
  deliveryRates: [
    { id: 'ruai_pickup', name: 'Ruai Hub Pickup (Free)', fee: 0, estimate: 'Ready in 1 hour' },
    { id: 'ruai_local', name: 'Ruai & Kangundo Rd Doorstep Delivery', fee: 150, estimate: 'Same Day' },
    { id: 'nairobi_cbd', name: 'Nairobi CBD & Environs', fee: 250, estimate: 'Same Day / Next Day' },
    { id: 'countrywide', name: 'Countrywide Delivery (Speedaf / Fargo / Matatu Parcel)', fee: 400, estimate: '24-48 Hours' }
  ]
};

const DEFAULT_PRODUCTS = [
  {
    id: 'prod_1',
    name: 'Melbourne Pure Flax Linen Button-Down',
    category: 'Men',
    price: 3200,
    originalPrice: 4200,
    stock: 18,
    sizes: ['M', 'L', 'XL', 'XXL'],
    colors: ['Crisp White', 'Sky Blue', 'Sage Green'],
    origin: 'Imported from Melbourne, Australia',
    description: 'Woven from 100% Australian natural flax linen. Ultra-breathable, moisture-wicking, with a modern relaxed tailored fit suitable for warm Nairobi days and smart casual evenings.',
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
    featured: true,
    inStock: true,
    rating: 4.9,
    badge: 'Aussie Flax Linen'
  },
  {
    id: 'prod_2',
    name: 'Sydney Bondi Relaxed Linen Midi Dress',
    category: 'Women',
    price: 4500,
    originalPrice: 5800,
    stock: 12,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Terracotta Coral', 'Oatmeal Beige', 'Ocean Navy'],
    origin: 'Imported from Sydney, Australia',
    description: 'Iconic Australian coastal style. Breathable organic linen dress featuring tie-waist detail, delicate side slit, and elegant V-neckline. Perfect for weekend getaways and smart daytime events.',
    imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80',
    featured: true,
    inStock: true,
    rating: 5.0,
    badge: 'Best Seller'
  },
  {
    id: 'prod_3',
    name: 'Outback Heritage Pure Merino Wool Knit',
    category: 'Unisex',
    price: 5200,
    originalPrice: 6800,
    stock: 9,
    sizes: ['M', 'L', 'XL'],
    colors: ['Charcoal Heather', 'Oatmeal Wool', 'Forest Green'],
    origin: '100% Australian Merino Wool',
    description: 'Crafted from world-renowned Australian fine merino wool. Non-scratchy, temperature-regulating luxury knitwear that keeps you stylishly warm through cool Kenyan evenings.',
    imageUrl: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80',
    featured: true,
    inStock: true,
    rating: 4.8,
    badge: 'Pure Merino Wool'
  },
  {
    id: 'prod_4',
    name: 'Byron Bay Heavyweight 280GSM Graphic Tee',
    category: 'Men',
    price: 2400,
    originalPrice: 3000,
    stock: 25,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Vintage Black', 'Washed Khaki', 'Off-White'],
    origin: 'Australian Surf & Streetwear',
    description: 'Heavyweight Australian combed cotton tee with ribbed crew collar and drop-shoulder silhouette. Preshrunk and garment-dyed for a vintage Australian coastal feel.',
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
    featured: true,
    inStock: true,
    rating: 4.9,
    badge: 'Heavyweight Cotton'
  },
  {
    id: 'prod_5',
    name: 'Gold Coast Floral Silk-Cotton Blend Maxi',
    category: 'Women',
    price: 4800,
    originalPrice: 6200,
    stock: 14,
    sizes: ['S', 'M', 'L'],
    colors: ['Floral Botanical', 'Golden Sunrise'],
    origin: 'Imported from Queensland, Australia',
    description: 'Luxurious Australian designer maxi dress featuring tiered ruffle hems, adjustable wrap neckline, and vibrant Australian botanical print.',
    imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&q=80',
    featured: false,
    inStock: true,
    rating: 4.7,
    badge: 'Designer Maxi'
  },
  {
    id: 'prod_6',
    name: 'Brunswick Stretch Chino Trousers',
    category: 'Men',
    price: 3600,
    originalPrice: 4500,
    stock: 15,
    sizes: ['30', '32', '34', '36', '38'],
    colors: ['British Khaki', 'Navy Blue', 'Slate Gray'],
    origin: 'Imported from Melbourne, Australia',
    description: 'Modern slim-tapered chinos tailored from Australian stretch cotton twill. Exceptional mobility, reinforced pockets, and wrinkle-resistant finish for everyday work and outings.',
    imageUrl: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=800&q=80',
    featured: false,
    inStock: true,
    rating: 4.8,
    badge: 'Aussie Chino'
  },
  {
    id: 'prod_7',
    name: 'St Kilda Distressed Vintage Denim Jacket',
    category: 'Unisex',
    price: 4900,
    originalPrice: 6500,
    stock: 7,
    sizes: ['M', 'L', 'XL'],
    colors: ['Washed Indigo Blue', 'Smoked Black'],
    origin: 'Australian Street Boutique',
    description: 'Iconic Aussie denim outerwear with brass buttons, twin chest pockets, and authentic vintage fading. Built to last for years.',
    imageUrl: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=800&q=80',
    featured: true,
    inStock: true,
    rating: 4.9,
    badge: 'Vintage Denim'
  },
  {
    id: 'prod_8',
    name: 'Perth Resort Cuban Collar Short Sleeve Shirt',
    category: 'Men',
    price: 2800,
    originalPrice: 3500,
    stock: 16,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Eucalyptus Print', 'Sand Stripe', 'Midnight Palm'],
    origin: 'Western Australia Resort Collection',
    description: 'Camp-collar resort shirt crafted from airy rayon-cotton blend. Designed for effortless holiday swagger and casual Nairobi hangouts.',
    imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80',
    featured: false,
    inStock: true,
    rating: 4.6,
    badge: 'Resort Wear'
  }
];

function getInitialUsers() {
  return [
    {
      id: 'user_admin_1',
      username: 'admin',
      passwordHash: hashPassword('admin123'),
      name: 'Super Administrator',
      role: 'admin',
      rights: ['view_stocks', 'edit_inventory', 'admin'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'user_staff_1',
      username: 'ruaistaff',
      passwordHash: hashPassword('ruai123'),
      name: 'Ruai Storekeeper',
      role: 'staff',
      rights: ['view_stocks', 'edit_inventory'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'user_staff_2',
      username: 'stockviewer',
      passwordHash: hashPassword('stock123'),
      name: 'Inventory Auditor',
      role: 'staff',
      rights: ['view_stocks'],
      createdAt: new Date().toISOString()
    }
  ];
}

function getInitialOrders() {
  return [
    {
      id: 'CP-1001',
      customerName: 'Brian Mwangi',
      phone: '0712345678',
      deliveryArea: 'Ruai Town Center',
      deliveryFee: 150,
      deliveryAddress: 'Ruai Quickmart Area',
      items: [
        { productId: 'prod_1', name: 'Melbourne Pure Flax Linen Button-Down', size: 'L', color: 'Crisp White', price: 3200, quantity: 1 }
      ],
      totalAmount: 3350,
      paymentMethod: 'Lipa Na M-Pesa Paybill',
      paybill: '542542',
      accountNo: '118988',
      mpesaReceipt: 'QKH891238X',
      status: 'Delivered',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
    }
  ];
}

// Global cached MongoDB client for Serverless connection reuse across invocations
let cachedMongoClient = null;
let cachedMongoDb = null;
let isMongoSeeded = false;

class Store {
  constructor() {
    this.settingsFile = path.join(DATA_DIR, 'settings.json');
    this.productsFile = path.join(DATA_DIR, 'products.json');
    this.usersFile = path.join(DATA_DIR, 'users.json');
    this.ordersFile = path.join(DATA_DIR, 'orders.json');
    this.initLocalFiles();
  }

  // --- MongoDB Connection & Initialization ---
  async getDb() {
    const uri = process.env.MONGODB_URI;
    if (!uri) return null;

    if (cachedMongoDb) return cachedMongoDb;

    try {
      let MongoClient;
      try {
        MongoClient = require('mongodb').MongoClient;
      } catch (err) {
        console.warn('MongoDB package not found, falling back to local storage.');
        return null;
      }

      if (!cachedMongoClient) {
        cachedMongoClient = new MongoClient(uri, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 10000
        });
        await cachedMongoClient.connect();
      }

      const dbName = process.env.MONGODB_DB_NAME || 'creston_premium';
      cachedMongoDb = cachedMongoClient.db(dbName);

      if (!isMongoSeeded) {
        await this.ensureMongoSeeded(cachedMongoDb);
        isMongoSeeded = true;
      }

      return cachedMongoDb;
    } catch (err) {
      console.error('Failed to connect to MongoDB:', err.message);
      return null;
    }
  }

  async ensureMongoSeeded(db) {
    try {
      // 1. Settings
      const settingsCount = await db.collection('settings').countDocuments();
      if (settingsCount === 0) {
        await db.collection('settings').insertOne({ _id: 'store_settings', ...DEFAULT_SETTINGS });
      }

      // 2. Products
      const productsCount = await db.collection('products').countDocuments();
      if (productsCount === 0) {
        await db.collection('products').insertMany(DEFAULT_PRODUCTS.map(p => ({ ...p })));
      }

      // 3. Users
      const usersCount = await db.collection('users').countDocuments();
      if (usersCount === 0) {
        await db.collection('users').insertMany(getInitialUsers());
      }

      // 4. Orders
      const ordersCount = await db.collection('orders').countDocuments();
      if (ordersCount === 0) {
        await db.collection('orders').insertMany(getInitialOrders());
      }
    } catch (err) {
      console.error('Error seeding MongoDB collections:', err.message);
    }
  }

  // --- Local File Storage Fallback ---
  initLocalFiles() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (!fs.existsSync(this.settingsFile)) {
        this.saveJson(this.settingsFile, DEFAULT_SETTINGS);
      }

      if (!fs.existsSync(this.productsFile)) {
        this.saveJson(this.productsFile, DEFAULT_PRODUCTS);
      }

      if (!fs.existsSync(this.usersFile)) {
        this.saveJson(this.usersFile, getInitialUsers());
      }

      if (!fs.existsSync(this.ordersFile)) {
        this.saveJson(this.ordersFile, getInitialOrders());
      }
    } catch (err) {
      // In read-only serverless environments where local file init fails, ignore safely
    }
  }

  readJson(filePath, fallback) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (err) {
      return fallback;
    }
  }

  saveJson(filePath, data) {
    try {
      const tempPath = `${filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tempPath, filePath);
      return true;
    } catch (err) {
      return false;
    }
  }

  // --- Settings ---
  async getSettings() {
    const db = await this.getDb();
    if (db) {
      const doc = await db.collection('settings').findOne({ _id: 'store_settings' }, { projection: { _id: 0 } });
      if (doc) return doc;
      return DEFAULT_SETTINGS;
    }
    return this.readJson(this.settingsFile, DEFAULT_SETTINGS);
  }

  async updateSettings(newSettings) {
    const db = await this.getDb();
    if (db) {
      const current = await this.getSettings();
      const updated = {
        ...current,
        ...newSettings,
        hero: { ...current.hero, ...(newSettings.hero || {}) },
        about: { ...current.about, ...(newSettings.about || {}) },
        deliveryRates: newSettings.deliveryRates || current.deliveryRates,
        updatedAt: new Date().toISOString()
      };
      await db.collection('settings').updateOne(
        { _id: 'store_settings' },
        { $set: updated },
        { upsert: true }
      );
      return updated;
    }

    const current = this.readJson(this.settingsFile, DEFAULT_SETTINGS);
    const updated = {
      ...current,
      ...newSettings,
      hero: { ...current.hero, ...(newSettings.hero || {}) },
      about: { ...current.about, ...(newSettings.about || {}) },
      deliveryRates: newSettings.deliveryRates || current.deliveryRates
    };
    this.saveJson(this.settingsFile, updated);
    return updated;
  }

  // --- Products / Inventory ---
  async getProducts() {
    const db = await this.getDb();
    if (db) {
      return await db.collection('products').find({}, { projection: { _id: 0 } }).toArray();
    }
    return this.readJson(this.productsFile, DEFAULT_PRODUCTS);
  }

  async getProductById(id) {
    const db = await this.getDb();
    if (db) {
      return await db.collection('products').findOne({ id }, { projection: { _id: 0 } });
    }
    const products = this.readJson(this.productsFile, DEFAULT_PRODUCTS);
    return products.find(p => p.id === id);
  }

  async addProduct(productData) {
    const newId = 'prod_' + Date.now();
    const newProduct = {
      id: newId,
      name: productData.name || 'New Australian Apparel',
      category: productData.category || 'Unisex',
      price: Number(productData.price) || 0,
      originalPrice: Number(productData.originalPrice) || Number(productData.price) || 0,
      stock: Number(productData.stock) >= 0 ? Number(productData.stock) : 0,
      sizes: Array.isArray(productData.sizes) ? productData.sizes : (productData.sizes ? productData.sizes.split(',').map(s => s.trim()) : ['M', 'L', 'XL']),
      colors: Array.isArray(productData.colors) ? productData.colors : (productData.colors ? productData.colors.split(',').map(c => c.trim()) : ['Standard']),
      origin: productData.origin || 'Imported from Australia',
      description: productData.description || 'Authentic Australian garment.',
      imageUrl: productData.imageUrl || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=800&q=80',
      featured: Boolean(productData.featured),
      inStock: Number(productData.stock) > 0,
      rating: 5.0,
      badge: productData.badge || 'Aussie Import',
      createdAt: new Date().toISOString()
    };

    const db = await this.getDb();
    if (db) {
      await db.collection('products').insertOne({ ...newProduct });
      return newProduct;
    }

    const products = this.readJson(this.productsFile, DEFAULT_PRODUCTS);
    products.unshift(newProduct);
    this.saveJson(this.productsFile, products);
    return newProduct;
  }

  async updateProduct(id, updates) {
    const db = await this.getDb();
    if (db) {
      const current = await this.getProductById(id);
      if (!current) return null;

      const newStock = updates.stock !== undefined ? Number(updates.stock) : current.stock;
      const updated = {
        ...current,
        ...updates,
        price: updates.price !== undefined ? Number(updates.price) : current.price,
        originalPrice: updates.originalPrice !== undefined ? Number(updates.originalPrice) : current.originalPrice,
        stock: newStock,
        inStock: newStock > 0,
        sizes: updates.sizes !== undefined ? (Array.isArray(updates.sizes) ? updates.sizes : updates.sizes.split(',').map(s => s.trim())) : current.sizes,
        colors: updates.colors !== undefined ? (Array.isArray(updates.colors) ? updates.colors : updates.colors.split(',').map(c => c.trim())) : current.colors,
        updatedAt: new Date().toISOString()
      };

      await db.collection('products').updateOne({ id }, { $set: updated });
      return updated;
    }

    const products = this.readJson(this.productsFile, DEFAULT_PRODUCTS);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;

    const current = products[index];
    const newStock = updates.stock !== undefined ? Number(updates.stock) : current.stock;
    const updated = {
      ...current,
      ...updates,
      price: updates.price !== undefined ? Number(updates.price) : current.price,
      originalPrice: updates.originalPrice !== undefined ? Number(updates.originalPrice) : current.originalPrice,
      stock: newStock,
      inStock: newStock > 0,
      sizes: updates.sizes !== undefined ? (Array.isArray(updates.sizes) ? updates.sizes : updates.sizes.split(',').map(s => s.trim())) : current.sizes,
      colors: updates.colors !== undefined ? (Array.isArray(updates.colors) ? updates.colors : updates.colors.split(',').map(c => c.trim())) : current.colors,
      updatedAt: new Date().toISOString()
    };

    products[index] = updated;
    this.saveJson(this.productsFile, products);
    return updated;
  }

  async adjustStock(id, deltaOrTotal, isAbsolute = false) {
    const db = await this.getDb();
    if (db) {
      const current = await this.getProductById(id);
      if (!current) return null;

      let newStock;
      if (isAbsolute) {
        newStock = Math.max(0, Number(deltaOrTotal));
      } else {
        newStock = Math.max(0, current.stock + Number(deltaOrTotal));
      }

      const updated = {
        ...current,
        stock: newStock,
        inStock: newStock > 0,
        updatedAt: new Date().toISOString()
      };

      await db.collection('products').updateOne({ id }, { $set: { stock: newStock, inStock: newStock > 0, updatedAt: updated.updatedAt } });
      return updated;
    }

    const products = this.readJson(this.productsFile, DEFAULT_PRODUCTS);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;

    const current = products[index];
    let newStock;
    if (isAbsolute) {
      newStock = Math.max(0, Number(deltaOrTotal));
    } else {
      newStock = Math.max(0, current.stock + Number(deltaOrTotal));
    }

    current.stock = newStock;
    current.inStock = newStock > 0;
    current.updatedAt = new Date().toISOString();

    products[index] = current;
    this.saveJson(this.productsFile, products);
    return current;
  }

  async deleteProduct(id) {
    const db = await this.getDb();
    if (db) {
      const res = await db.collection('products').deleteOne({ id });
      return res.deletedCount > 0;
    }

    const products = this.readJson(this.productsFile, DEFAULT_PRODUCTS);
    const filtered = products.filter(p => p.id !== id);
    if (filtered.length === products.length) return false;
    this.saveJson(this.productsFile, filtered);
    return true;
  }

  // --- Users & Rights ---
  async getUsers() {
    const db = await this.getDb();
    if (db) {
      return await db.collection('users').find({}, { projection: { _id: 0 } }).toArray();
    }
    return this.readJson(this.usersFile, []);
  }

  async getUserById(id) {
    const db = await this.getDb();
    if (db) {
      return await db.collection('users').findOne({ id }, { projection: { _id: 0 } });
    }
    return this.readJson(this.usersFile, []).find(u => u.id === id);
  }

  async getUserByUsername(username) {
    const db = await this.getDb();
    if (db) {
      return await db.collection('users').findOne(
        { username: { $regex: new RegExp('^' + username + '$', 'i') } },
        { projection: { _id: 0 } }
      );
    }
    return this.readJson(this.usersFile, []).find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  async addUser({ username, password, name, role, rights }) {
    const existing = await this.getUserByUsername(username);
    if (existing) {
      throw new Error('Username already exists');
    }

    const newUser = {
      id: 'user_' + Date.now(),
      username: username.trim(),
      passwordHash: hashPassword(password),
      name: name || username,
      role: role || 'staff', // 'admin' or 'staff'
      rights: Array.isArray(rights) ? rights : ['view_stocks'],
      createdAt: new Date().toISOString()
    };

    const db = await this.getDb();
    if (db) {
      await db.collection('users').insertOne({ ...newUser });
      const { passwordHash, ...safeUser } = newUser;
      return safeUser;
    }

    const users = this.readJson(this.usersFile, []);
    users.push(newUser);
    this.saveJson(this.usersFile, users);
    const { passwordHash, ...safeUser } = newUser;
    return safeUser;
  }

  async updateUser(id, { name, role, rights, password }) {
    const db = await this.getDb();
    if (db) {
      const current = await this.getUserById(id);
      if (!current) return null;

      const updates = { updatedAt: new Date().toISOString() };
      if (name) updates.name = name;
      if (role) updates.role = role;
      if (rights) updates.rights = Array.isArray(rights) ? rights : current.rights;
      if (password && password.trim().length >= 6) {
        updates.passwordHash = hashPassword(password.trim());
      }

      await db.collection('users').updateOne({ id }, { $set: updates });
      const updatedUser = { ...current, ...updates };
      const { passwordHash, ...safeUser } = updatedUser;
      return safeUser;
    }

    const users = this.readJson(this.usersFile, []);
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return null;

    const current = users[index];
    if (name) current.name = name;
    if (role) current.role = role;
    if (rights) current.rights = Array.isArray(rights) ? rights : current.rights;
    if (password && password.trim().length >= 6) {
      current.passwordHash = hashPassword(password.trim());
    }

    current.updatedAt = new Date().toISOString();
    users[index] = current;
    this.saveJson(this.usersFile, users);

    const { passwordHash, ...safeUser } = current;
    return safeUser;
  }

  async changePassword(userId, newPassword) {
    const newHash = hashPassword(newPassword);
    const db = await this.getDb();
    if (db) {
      const res = await db.collection('users').updateOne(
        { id: userId },
        { $set: { passwordHash: newHash, updatedAt: new Date().toISOString() } }
      );
      return res.matchedCount > 0;
    }

    const users = this.readJson(this.usersFile, []);
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) return false;

    users[index].passwordHash = newHash;
    users[index].updatedAt = new Date().toISOString();
    this.saveJson(this.usersFile, users);
    return true;
  }

  async deleteUser(id) {
    const users = await this.getUsers();
    const user = users.find(u => u.id === id);
    if (!user) return false;

    const adminCount = users.filter(u => u.role === 'admin').length;
    if (user.role === 'admin' && adminCount <= 1) {
      throw new Error('Cannot delete the last administrator account.');
    }

    const db = await this.getDb();
    if (db) {
      const res = await db.collection('users').deleteOne({ id });
      return res.deletedCount > 0;
    }

    const filtered = users.filter(u => u.id !== id);
    this.saveJson(this.usersFile, filtered);
    return true;
  }

  // --- Orders & Lipa Na M-Pesa ---
  async getOrders() {
    const db = await this.getDb();
    if (db) {
      return await db.collection('orders').find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    }
    return this.readJson(this.ordersFile, []);
  }

  async createOrder(orderData) {
    const orderId = 'CP-' + Math.floor(1000 + Math.random() * 9000);
    const newOrder = {
      id: orderId,
      customerName: orderData.customerName || 'Customer',
      phone: orderData.phone || '',
      email: orderData.email || '',
      deliveryArea: orderData.deliveryArea || 'Ruai Pickup',
      deliveryFee: Number(orderData.deliveryFee) || 0,
      deliveryAddress: orderData.deliveryAddress || '',
      items: orderData.items || [],
      subtotal: Number(orderData.subtotal) || 0,
      totalAmount: Number(orderData.totalAmount) || 0,
      paymentMethod: 'Lipa Na M-Pesa Paybill',
      paybill: orderData.paybill || '542542',
      accountNo: orderData.accountNo || '118988',
      mpesaReceipt: (orderData.mpesaReceipt || '').toUpperCase().trim(),
      notes: orderData.notes || '',
      status: orderData.mpesaReceipt ? 'Confirmed' : 'Pending Payment',
      createdAt: new Date().toISOString()
    };

    const db = await this.getDb();
    if (db) {
      await db.collection('orders').insertOne({ ...newOrder });

      // Decrement stock in MongoDB
      if (Array.isArray(orderData.items)) {
        for (const item of orderData.items) {
          const qty = Number(item.quantity) || 1;
          await db.collection('products').updateOne(
            { id: item.productId },
            { $inc: { stock: -qty } }
          );
          // Update inStock flag if stock reaches 0
          const prod = await this.getProductById(item.productId);
          if (prod && prod.stock <= 0) {
            await db.collection('products').updateOne(
              { id: item.productId },
              { $set: { inStock: false, stock: 0 } }
            );
          }
        }
      }

      return newOrder;
    }

    const orders = this.readJson(this.ordersFile, []);
    const products = this.readJson(this.productsFile, DEFAULT_PRODUCTS);
    if (Array.isArray(orderData.items)) {
      orderData.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          prod.stock = Math.max(0, prod.stock - (item.quantity || 1));
          prod.inStock = prod.stock > 0;
        }
      });
      this.saveJson(this.productsFile, products);
    }

    orders.unshift(newOrder);
    this.saveJson(this.ordersFile, orders);
    return newOrder;
  }

  async updateOrderStatus(orderId, status) {
    const db = await this.getDb();
    if (db) {
      const updatedAt = new Date().toISOString();
      await db.collection('orders').updateOne(
        { id: orderId },
        { $set: { status, updatedAt } }
      );
      return await db.collection('orders').findOne({ id: orderId }, { projection: { _id: 0 } });
    }

    const orders = this.readJson(this.ordersFile, []);
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;
    order.status = status;
    order.updatedAt = new Date().toISOString();
    this.saveJson(this.ordersFile, orders);
    return order;
  }
}

module.exports = new Store();
