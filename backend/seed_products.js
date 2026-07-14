require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/emahu';

async function seed() {
  try {
    console.log('Connecting to database:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connection successful.');

    // Clear existing test users and products to start fresh
    const testEmails = [
      'ahmedabad_seller@test.com',
      'surat_seller@test.com',
      'national_seller@test.com',
      'ahmedabad_buyer@test.com',
      'surat_buyer@test.com',
      'delhi_buyer@test.com',
      'qwert@test.com'
    ];
    console.log('Cleaning up existing test users...');
    await User.deleteMany({ email: { $in: testEmails } });

    console.log('Cleaning up all existing products...');
    await Product.deleteMany({});

    // 1. Create Sellers
    console.log('Creating test sellers...');
    
    // Local Ahmedabad Seller
    const ahmedabadSeller = await User.create({
      name: 'Ahmedabad Local Store',
      email: 'ahmedabad_seller@test.com',
      password: 'password123',
      role: 'seller',
      phone: '+91 91111 11111',
      address: 'CG Road, Ahmedabad, Gujarat',
      city: 'Ahmedabad',
      state: 'Gujarat',
      coveredCities: ['Ahmedabad'],
      latitude: 23.0225,
      longitude: 72.5714,
      status: 'approved'
    });

    // Local Surat Seller
    const suratSeller = await User.create({
      name: 'Surat Textile Hub',
      email: 'surat_seller@test.com',
      password: 'password123',
      role: 'seller',
      phone: '+91 92222 22222',
      address: 'Ring Road, Surat, Gujarat',
      city: 'Surat',
      state: 'Gujarat',
      coveredCities: ['Surat'],
      latitude: 21.1702,
      longitude: 72.8311,
      status: 'approved'
    });

    // National Seller (All India)
    const nationalSeller = await User.create({
      name: 'National Electronics Co',
      email: 'national_seller@test.com',
      password: 'password123',
      role: 'seller',
      phone: '+91 93333 33333',
      address: 'Nehru Place, Delhi',
      city: 'Delhi',
      state: 'Delhi',
      coveredCities: ['All India', 'Delhi', 'Ahmedabad', 'Surat', 'Mumbai', 'Bangalore'],
      latitude: 28.6139,
      longitude: 77.2090,
      status: 'approved'
    });

    // 2. Create Buyers
    console.log('Creating test buyers...');
    
    await User.create({
      name: 'Ahmedabad Test Buyer',
      email: 'ahmedabad_buyer@test.com',
      password: 'password123',
      role: 'buyer',
      phone: '+91 98888 11111',
      city: 'Ahmedabad',
      state: 'Gujarat',
      isPhoneVerified: true,
      isEmailVerified: true
    });

    await User.create({
      name: 'Surat Test Buyer',
      email: 'surat_buyer@test.com',
      password: 'password123',
      role: 'buyer',
      phone: '+91 98888 22222',
      city: 'Surat',
      state: 'Gujarat',
      isPhoneVerified: true,
      isEmailVerified: true
    });

    await User.create({
      name: 'Delhi Test Buyer',
      email: 'delhi_buyer@test.com',
      password: 'password123',
      role: 'buyer',
      phone: '+91 98888 33333',
      city: 'Delhi',
      state: 'Delhi',
      isPhoneVerified: true,
      isEmailVerified: true
    });

    // 3. Create Products for Local Ahmedabad Seller
    const ahmedabadProducts = [
      {
        name: 'Traditional Gujarati Embroidered Bag',
        brand: 'KutchCrafts',
        sku: 'BAG-GUJ-AMD1',
        category: 'Apparel',
        subcategory: 'Bags',
        price: 899,
        comparePrice: 1299,
        stock: 50,
        description: 'Authentic handmade Kutch embroidered bag with mirrors and tassels. Perfect local Gujarati design.',
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80',
        seller: ahmedabadSeller._id,
        approvalStatus: 'approved'
      },
      {
        name: 'Premium Gujarati Khakra & Namkeen Combo',
        brand: 'AmdavadTaste',
        sku: 'FOOD-AMD-KHAK',
        category: 'Grocery',
        subcategory: 'Snacks',
        price: 349,
        comparePrice: 450,
        stock: 100,
        description: 'Pack of 5 different flavored crispy khakhras (Methi, Jeera, Masala, Garlic, Plain) with local pickle.',
        image: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=600&q=80',
        seller: ahmedabadSeller._id,
        approvalStatus: 'approved'
      }
    ];

    // 4. Create Products for Local Surat Seller
    const suratProducts = [
      {
        name: 'Surati Designer Georgette Saree',
        brand: 'SuratSilk',
        sku: 'APP-SRT-SAR1',
        category: 'Apparel',
        subcategory: 'Sarees',
        price: 2499,
        comparePrice: 3999,
        stock: 30,
        description: 'Beautiful Georgette saree with intricate zari embroidery border work direct from Surat textile markets.',
        image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
        seller: suratSeller._id,
        approvalStatus: 'approved'
      },
      {
        name: 'Surati Ghaari & Locho Combo Box',
        brand: 'SuratSweets',
        sku: 'FOOD-SRT-LOCHO',
        category: 'Grocery',
        subcategory: 'Snacks',
        price: 499,
        comparePrice: 600,
        stock: 45,
        description: 'Box containing fresh Surat special Butter Locho with chutney and 4 pieces of premium mawa Ghari.',
        image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80',
        seller: suratSeller._id,
        approvalStatus: 'approved'
      }
    ];

    // 5. Create Products for National Seller (All India)
    const nationalProducts = [
      {
        name: 'OmniShield Premium Tech Backpack',
        brand: 'OmniPack',
        sku: 'BAG-OMNI-001',
        category: 'Tech',
        subcategory: 'Backpacks',
        price: 4599,
        comparePrice: 5999,
        stock: 40,
        description: 'Water-resistant travel backpack with built-in USB charging port, anti-theft design, TSA-friendly laptop compartment, and ergonomic shoulder straps.',
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80',
        seller: nationalSeller._id,
        approvalStatus: 'approved'
      },
      {
        name: 'ZoneSync Noise Cancelling Headphones',
        brand: 'ZoneSync',
        sku: 'TECH-ZONE-XM5',
        category: 'Tech',
        subcategory: 'Audio & Headphones',
        price: 12999,
        comparePrice: 15999,
        stock: 12,
        description: 'Industry-leading noise cancelling wireless headphones with dual device pairing, clear voice calls, and up to 30 hours of continuous playback.',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
        seller: nationalSeller._id,
        approvalStatus: 'approved'
      },
      {
        name: 'SwiftStride Pro Air Sneakers',
        brand: 'SwiftStride',
        sku: 'SHOE-SWIFT-AIR',
        category: 'Shoes',
        subcategory: 'Sneakers',
        price: 5499,
        comparePrice: 7999,
        stock: 22,
        description: 'Responsive cushioned training sneakers for daily running, gym, and street walks. Breathable mesh panels and shock-absorbing air bubbles.',
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
        seller: nationalSeller._id,
        approvalStatus: 'approved'
      }
    ];

    // Combine all products
    const allProducts = [...ahmedabadProducts, ...suratProducts, ...nationalProducts];
    
    console.log('Inserting products into MongoDB...');
    const inserted = await Product.create(allProducts);
    console.log(`Successfully seeded ${inserted.length} products!`);

    console.log('\n--- TEST ACCOUNTS CREATED ---');
    console.log('Sellers (Password: password123):');
    console.log(`1. Ahmedabad Local: ahmedabad_seller@test.com (City: Ahmedabad)`);
    console.log(`2. Surat Local:    surat_seller@test.com     (City: Surat)`);
    console.log(`3. National Hub:    national_seller@test.com  (City: Delhi - ALL INDIA)`);
    console.log('\nBuyers (Password: password123):');
    console.log(`1. Ahmedabad Buyer: ahmedabad_buyer@test.com  (City: Ahmedabad)`);
    console.log(`2. Surat Buyer:     surat_buyer@test.com      (City: Surat)`);
    console.log(`3. Delhi Buyer:     delhi_buyer@test.com      (City: Delhi)`);
    console.log('-----------------------------\n');

    mongoose.disconnect();
    console.log('Database disconnected. Seeding completed.');
  } catch (error) {
    console.error('Seeding process failed:', error);
    process.exit(1);
  }
}

seed();
