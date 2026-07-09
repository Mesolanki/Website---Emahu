require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/emahu';

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

const PRODUCT_IMAGES = {
  'Electronics & Tech': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&q=80',
  'Apparel & Fashion': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&q=80',
  'Shoes & Footwear': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80',
  'Kitchen & Dining': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=500&q=80',
  'Lifestyle & Home': 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500&q=80',
  'Beauty & Cosmetics': 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&q=80',
  'Sports & Outdoors': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&q=80',
  'Books & Stationery': 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=500&q=80',
  'Grocery & Essentials': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80',
  'Toys & Games': 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=500&q=80',
  'Health & Wellness': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500&q=80',
  'Pet Supplies': 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=500&q=80',
  'Baby Care': 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&q=80',
  'Automotive & Tools': 'https://images.unsplash.com/photo-1530047139112-0494193b0148?w=500&q=80',
  'Office Supplies': 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=500&q=80',
  'Garden & Outdoor': 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=500&q=80',
  'Musical Instruments': 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&q=80',
  'Jewelry & Accessories': 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500&q=80',
  'Home Improvement': 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=500&q=80',
  'Travel & Luggage': 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=500&q=80'
};

const CATEGORIES_DATA = [
  { root: 'Electronics & Tech', subs: ['Smartphones', 'Laptops', 'Headphones', 'Smartwatches'] },
  { root: 'Apparel & Fashion', subs: ['Menswear', 'Womenswear', 'Activewear', 'Outerwear'] },
  { root: 'Shoes & Footwear', subs: ['Running Shoes', 'Boots', 'Sneakers', 'Sandals'] },
  { root: 'Kitchen & Dining', subs: ['Cookware', 'Tableware', 'Bakeware', 'Coffee Makers'] },
  { root: 'Lifestyle & Home', subs: ['Furniture', 'Bedding', 'Cushions', 'Organizers'] },
  { root: 'Beauty & Cosmetics', subs: ['Skincare', 'Makeup', 'Haircare', 'Fragrances'] },
  { root: 'Sports & Outdoors', subs: ['Camping Gear', 'Yoga Mats', 'Water Bottles', 'Dumbbells'] },
  { root: 'Books & Stationery', subs: ['Fiction', 'Textbooks', 'Journals', 'Pens & Pencils'] },
  { root: 'Grocery & Essentials', subs: ['Tea & Coffee', 'Healthy Snacks', 'Pasta & Rice', 'Baking Supplies'] },
  { root: 'Toys & Games', subs: ['Board Games', 'Puzzles', 'Action Figures', 'Soft Toys'] },
  { root: 'Health & Wellness', subs: ['Supplements', 'First Aid', 'Massage Rollers', 'Essential Oils'] },
  { root: 'Pet Supplies', subs: ['Dog Food', 'Cat Litter', 'Pet Toys', 'Collars & Leashes'] },
  { root: 'Baby Care', subs: ['Diapers', 'Baby Wipes', 'Strollers', 'Baby Bottles'] },
  { root: 'Automotive & Tools', subs: ['Car Wash Kits', 'Tool Sets', 'Tire Inflators', 'Car Mats'] },
  { root: 'Office Supplies', subs: ['Notebooks', 'Desk Organizers', 'Calculators', 'File Folders'] },
  { root: 'Garden & Outdoor', subs: ['Plant Pots', 'Watering Cans', 'Seeds', 'Lawn Mowers'] },
  { root: 'Musical Instruments', subs: ['Acoustic Guitars', 'Keyboards', 'Ukuleles', 'Drums'] },
  { root: 'Jewelry & Accessories', subs: ['Earrings', 'Necklaces', 'Sunglasses', 'Leather Wallets'] },
  { root: 'Home Improvement', subs: ['Wall Paint', 'LED Bulbs', 'Door Locks', 'Drill Machines'] },
  { root: 'Travel & Luggage', subs: ['Suitcases', 'Duffel Bags', 'Neck Pillows', 'Luggage Tags'] }
];

async function seed() {
  try {
    console.log('Connecting to database:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connection successful.');

    // 1. Create or retrieve 10 distinct sellers
    console.log('Setting up 10 distinct seller accounts...');
    const sellers = [];
    for (let i = 1; i <= 10; i++) {
      const email = `seller${i}@emahu.com`;
      let seller = await User.findOne({ email });
      if (!seller) {
        seller = await User.create({
          name: `Seller Company ${i}`,
          email,
          password: 'password123',
          role: 'seller',
          phone: `990000000${i}`,
          storeName: `Shop of Seller ${i}`,
          address: `Industrial Area, Sector ${i}, Bangalore, Karnataka`,
          status: 'approved',
          isEmailVerified: true,
          isPhoneVerified: true
        });
        console.log(`Created seller: ${email}`);
      } else {
        // Ensure approved status
        seller.status = 'approved';
        await seller.save();
      }
      sellers.push(seller);
    }

    // 2. Clear old categories & products
    console.log('Clearing existing categories and products...');
    await Category.deleteMany({});
    await Product.deleteMany({});

    // 3. Seed 100 Categories (20 Root + 80 Subcategories)
    console.log('Seeding 100 categories...');
    const categoryList = [];
    const dbCategoryDocs = [];

    for (const catData of CATEGORIES_DATA) {
      // Create Root
      const rootCat = await Category.create({
        name: catData.root,
        slug: slugify(catData.root),
        parentId: null,
        status: 'approved',
        createdBy: sellers[0]._id
      });
      dbCategoryDocs.push(rootCat);
      categoryList.push({ name: catData.root, rootName: catData.root });

      // Create Subcategories
      for (const subName of catData.subs) {
        const subCat = await Category.create({
          name: subName,
          slug: slugify(subName),
          parentId: rootCat._id,
          status: 'approved',
          createdBy: sellers[0]._id
        });
        dbCategoryDocs.push(subCat);
        categoryList.push({ name: subName, rootName: catData.root });
      }
    }
    console.log(`Successfully seeded ${dbCategoryDocs.length} categories!`);

    // 4. Seed 10 Products for every category (10 categories * 10 products = 1,000 products total)
    // Each of the 10 products in a category belongs to a DIFFERENT seller from our 10 sellers!
    console.log('Seeding 10 products per category (1000 products total)...');
    const productsToInsert = [];

    for (let catIdx = 0; catIdx < categoryList.length; catIdx++) {
      const { name: catName, rootName } = categoryList[catIdx];
      const imageUrl = PRODUCT_IMAGES[rootName] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80';

      for (let pIdx = 0; pIdx < 10; pIdx++) {
        const seller = sellers[pIdx]; // Use seller 1 to 10
        const price = Math.floor(299 + Math.random() * 9500);
        const comparePrice = Math.floor(price * (1.15 + Math.random() * 0.3));
        const cleanCatName = catName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase();
        
        productsToInsert.push({
          name: `Premium ${catName} Item ${pIdx + 1}`,
          brand: `${rootName.split(' ')[0]} Brand ${pIdx + 1}`,
          sku: `EM-PROD-${cleanCatName}-${pIdx + 1}-${Math.floor(1000 + Math.random() * 9000)}`,
          category: catName,
          subcategory: catName,
          price,
          comparePrice,
          stock: Math.floor(15 + Math.random() * 80),
          description: `This is a premium high-quality product from the ${catName} category. It is manufactured using the finest materials and is verified for professional-level performance.`,
          image: imageUrl,
          seller: seller._id,
          approvalStatus: 'approved',
          status: 'in-stock',
          lowStockAlert: 5,
          rating: parseFloat((4.0 + Math.random() * 1.0).toFixed(1)),
          reviews: Math.floor(10 + Math.random() * 200)
        });
      }
    }

    console.log('Inserting products into database...');
    const insertedProducts = await Product.insertMany(productsToInsert);
    console.log(`Successfully seeded ${insertedProducts.length} products!`);

    await mongoose.disconnect();
    console.log('Database disconnected. Seeding completed.');
  } catch (error) {
    console.error('Seeding large dataset failed:', error);
    process.exit(1);
  }
}

seed();
