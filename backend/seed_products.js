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

    // 1. Fetch or create the seller user with email 'qwert@test.com'
    let seller = await User.findOne({ email: 'qwert@test.com' });
    
    if (!seller) {
      console.log('Seller with email qwert@test.com not found. Creating seller...');
      seller = new User({
        email: 'qwert@test.com',
        password: 'password123',
        role: 'seller',
      });
    }

    seller.name = 'Main Store Seller';
    seller.phone = '+91 90000 11111';
    seller.address = 'Emahu Tech Park, CG Road, Ahmedabad, Gujarat';
    seller.city = 'Ahmedabad';
    seller.currentCity = 'Ahmedabad';
    seller.coveredCities = ['Ahmedabad', 'Delhi', 'Mumbai', 'Pune', 'Bangalore', 'Kolkata', 'Hyderabad', 'Surat', 'Vadodara', 'Rajkot'];
    seller.latitude = 23.0225;
    seller.longitude = 72.5714;
    seller.status = 'approved';
    await seller.save();
    
    console.log(`Using Seller: ${seller.name} (${seller.email}) - ID: ${seller._id}`);

    // 2. Define 10 high-quality fake products matching categories: Tech, Shoes, Kitchen, Apparel, Lifestyle
    const fakeProducts = [
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
        seller: seller._id,
        approvalStatus: 'approved'
      },
      {
        name: 'Veloce Carbon Fiber Running Shoes',
        brand: 'Veloce Sport',
        sku: 'SHOE-VEL-C10',
        category: 'Shoes',
        subcategory: 'Running Shoes',
        price: 8999,
        comparePrice: 11999,
        stock: 25,
        description: 'Ultra-lightweight marathon running shoes with breathable engineered mesh, reactive carbon fiber plate, and shock-absorbing foam sole for maximum performance.',
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
        seller: seller._id,
        approvalStatus: 'approved'
      },
      {
        name: 'AeroWave Ergonomic Vertical Mouse',
        brand: 'AeroWave',
        sku: 'MOU-AERO-V2',
        category: 'Tech',
        subcategory: 'Mice',
        price: 2499,
        comparePrice: 3499,
        stock: 50,
        description: 'Wireless vertical mouse designed to reduce wrist strain. Adjustable DPI settings, silent click switches, and rechargeable long-lasting battery.',
        image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&q=80',
        seller: seller._id,
        approvalStatus: 'approved'
      },
      {
        name: 'Nordic Cast Iron Skillet Set',
        brand: 'NordicCook',
        sku: 'KIT-NORD-CIS',
        category: 'Kitchen',
        subcategory: 'Cookware',
        price: 3899,
        comparePrice: 4999,
        stock: 15,
        description: 'Pre-seasoned heavy-duty cast iron skillet set (10-inch and 12-inch). Superior heat retention and distribution, suitable for stove, oven, or campfire cooking.',
        image: 'https://images.unsplash.com/photo-1590794056226-79ef3a814c2f?w=600&q=80',
        seller: seller._id,
        approvalStatus: 'approved'
      },
      {
        name: 'AeroFlex Compression Gym Tights',
        brand: 'AeroFit',
        sku: 'APP-AERO-AGT',
        category: 'Apparel',
        subcategory: 'Gym Wear',
        price: 1899,
        comparePrice: 2499,
        stock: 60,
        description: 'Moisture-wicking, four-way stretch compression tights for workouts. Deep side pockets, reinforced stitching, and high-rise elastic waistband.',
        image: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=600&q=80',
        seller: seller._id,
        approvalStatus: 'approved'
      },
      {
        name: 'Luna Glass Infusion Teapot',
        brand: 'LunaGlass',
        sku: 'KIT-LUNA-GIT',
        category: 'Kitchen',
        subcategory: 'Teaware',
        price: 1499,
        comparePrice: 1999,
        stock: 35,
        description: 'Borosilicate clear glass teapot with removable stainless steel loose tea infuser. Stovetop safe, heat-resistant, and drip-free pouring spout.',
        image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&q=80',
        seller: seller._id,
        approvalStatus: 'approved'
      },
      {
        name: 'Urban Explorer Waterproof Windbreaker',
        brand: 'UrbanGear',
        sku: 'APP-URB-WWB',
        category: 'Apparel',
        subcategory: 'Outerwear',
        price: 3299,
        comparePrice: 4499,
        stock: 20,
        description: 'Breathable, windproof, and highly packable hooded trail windbreaker jacket. Adjustable cuffs, zippered pockets, and reflective design accents.',
        image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80',
        seller: seller._id,
        approvalStatus: 'approved'
      },
      {
        name: 'Solace Organic Linen Cushion Covers',
        brand: 'Solace Home',
        sku: 'LIF-SOL-OLC',
        category: 'Lifestyle',
        subcategory: 'Home Decor',
        price: 1299,
        comparePrice: 1799,
        stock: 45,
        description: 'Set of 4 organic linen decorative throw pillow covers. Soft, hypoallergenic, breathable, with hidden zipper closures for living room decor.',
        image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&q=80',
        seller: seller._id,
        approvalStatus: 'approved'
      },
      {
        name: 'Trailblazer Waterproof Leather Hiking Boots',
        brand: 'Trailblazer',
        sku: 'SHOE-TRB-HB9',
        category: 'Shoes',
        subcategory: 'Hiking Boots',
        price: 7499,
        comparePrice: 9999,
        stock: 18,
        description: 'Genuine leather waterproof hiking boots with anti-slip rubber traction outsole, padded ankle support, and shock-resistant EVA midsole.',
        image: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=600&q=80',
        seller: seller._id,
        approvalStatus: 'approved'
      },
      {
        name: 'GlowSphere Aromatherapy Diffuser',
        brand: 'GlowZen',
        sku: 'LIF-GLO-AD4',
        category: 'Lifestyle',
        subcategory: 'Aromatherapy',
        price: 2199,
        comparePrice: 2999,
        stock: 30,
        description: 'Ultrasonic cool mist essential oil diffuser with 7-color ambient LED glow. Silent operation, auto shut-off safety protection, and 500ml water capacity.',
        image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&q=80',
        seller: seller._id,
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
        seller: seller._id,
        approvalStatus: 'approved'
      },
      {
        name: 'SoundSphere Portable BT Speaker',
        brand: 'SoundSphere',
        sku: 'TECH-SOUND-SP1',
        category: 'Tech',
        subcategory: 'Audio & Headphones',
        price: 4999,
        comparePrice: 6999,
        stock: 18,
        description: 'IPX7 waterproof wireless outdoor speaker with deep bass, 360-degree surrounding sound, 24-hour battery life, and high-fidelity Bluetooth pairing.',
        image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80',
        seller: seller._id,
        approvalStatus: 'approved'
      },
      {
        name: 'Apex Pro Mechanical Keyboard',
        brand: 'Apex',
        sku: 'TECH-APEX-MECH',
        category: 'Tech',
        subcategory: 'Computers & Accessories',
        price: 7999,
        comparePrice: 10999,
        stock: 15,
        description: 'RGB backlit hot-swappable gaming mechanical keyboard with aluminum alloy frame, custom linear switches, and double-shot PBT keycaps.',
        image: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600&q=80',
        seller: seller._id,
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
        seller: seller._id,
        approvalStatus: 'approved'
      },
      {
        name: 'Precision Pro Kitchen Chef Knife',
        brand: 'SharpCut',
        sku: 'KIT-SHARP-CK8',
        category: 'Kitchen',
        subcategory: 'Kitchen Tools',
        price: 1999,
        comparePrice: 2799,
        stock: 28,
        description: 'Professional-grade high-carbon German steel kitchen chef knife with double-beveled razor edge and ergonomic military-grade G10 handle.',
        image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&q=80',
        seller: seller._id,
        approvalStatus: 'approved'
      },
      {
        name: 'Gourmet Stainless Steel Soup Pot',
        brand: 'CookMaster',
        sku: 'KIT-COOK-POT',
        category: 'Kitchen',
        subcategory: 'Cookware',
        price: 2899,
        comparePrice: 3899,
        stock: 10,
        description: 'Three-ply clad stainless steel induction-ready stockpot with helper handles and clear tempered glass lid for professional home cooking.',
        image: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=600&q=80',
        seller: seller._id,
        approvalStatus: 'approved'
      },
      {
        name: 'WindShield Packable Mountain Parka',
        brand: 'Outdoors',
        sku: 'APP-OUT-WMP',
        category: 'Apparel',
        subcategory: 'Outerwear',
        price: 4899,
        comparePrice: 6499,
        stock: 14,
        description: 'Packable windproof and thermal mountain parka jacket with double ventilation zippers, adjustable hood cords, and heat-retention cuffs.',
        image: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?w=600&q=80',
        seller: seller._id,
        approvalStatus: 'approved'
      },
      {
        name: 'Solace Organic Bamboo Towel Set',
        brand: 'Solace Home',
        sku: 'LIF-SOL-OBT',
        category: 'Lifestyle',
        subcategory: 'Bedding & Linen',
        price: 1899,
        comparePrice: 2499,
        stock: 32,
        description: 'Ultra-plush organic bamboo fiber bath towel set. Highly absorbent, naturally odor-resistant, quick-drying, and gentle on sensitive skin.',
        image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600&q=80',
        seller: seller._id,
        approvalStatus: 'approved'
      },
      {
        name: 'AuraGlow Lava Stone Oil Diffuser',
        brand: 'GlowZen',
        sku: 'LIF-GLO-LSD',
        category: 'Lifestyle',
        subcategory: 'Aromatherapy',
        price: 2499,
        comparePrice: 3499,
        stock: 25,
        description: 'Minimalist volcanic lava stone aroma diffuser with ambient golden light. Silent passive diffusing, ideal for workspace, yoga, or nightstand.',
        image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80',
        seller: seller._id,
        approvalStatus: 'approved'
      }
    ];

    // 3. Clear all existing products from database to ensure generic ones are removed
    console.log('Cleaning up all existing products in the database...');
    await Product.deleteMany({});

    // 4. Insert products directly into MongoDB
    console.log('Inserting 10 fake products into MongoDB database under qwert@test.com...');
    const inserted = await Product.create(fakeProducts);
    console.log(`Successfully seeded ${inserted.length} products!`);

    mongoose.disconnect();
    console.log('Database disconnected. Seeding completed.');
  } catch (error) {
    console.error('Seeding process failed:', error);
    process.exit(1);
  }
}

seed();
