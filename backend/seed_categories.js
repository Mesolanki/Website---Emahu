require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');

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

async function seed() {
  try {
    console.log('Connecting to database:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connection successful.');

    // Fetch the seller user with email 'qwert@test.com'
    let seller = await User.findOne({ email: 'qwert@test.com' });
    if (!seller) {
      console.log('Seller not found, creating one...');
      seller = await User.create({
        name: 'ds',
        email: 'qwert@test.com',
        password: 'password123',
        role: 'seller',
        phone: '+91 90000 11111',
        address: 'Emahu Tech Park, Block C, Bangalore, Karnataka'
      });
    }

    console.log(`Using user ID for creation: ${seller._id}`);

    // Clear existing categories
    console.log('Cleaning up existing categories...');
    await Category.deleteMany({});

    // Seed Level 0 (Roots)
    const roots = [
      { name: 'Electronics & Tech' },
      { name: 'Apparel & Fashion' },
      { name: 'Shoes & Footwear' },
      { name: 'Kitchen & Dining' },
      { name: 'Lifestyle & Home' },
      { name: 'Beauty & Cosmetics' },
      { name: 'Sports & Outdoors' },
      { name: 'Books & Stationery' },
      { name: 'Grocery & Essentials' },
      { name: 'Toys & Games' },
      { name: 'Health & Wellness' },
      { name: 'Pet Supplies' },
      { name: 'Baby Care' },
      { name: 'Automotive & Tools' }
    ];

    const seededRoots = [];
    for (let root of roots) {
      const cat = await Category.create({
        name: root.name,
        slug: slugify(root.name),
        parentId: null,
        status: 'approved',
        createdBy: seller._id
      });
      seededRoots.push(cat);
      console.log(`Seeded Root Category: ${cat.name} (${cat._id})`);
    }

    // Map root names to IDs for easier child assignment
    const rootMap = {};
    seededRoots.forEach(r => {
      rootMap[r.name] = r._id;
    });

    // Seed Level 1 (Children)
    const children1 = [
      // Electronics
      { name: 'Smartphones & Tablets', parentName: 'Electronics & Tech' },
      { name: 'Computers & Accessories', parentName: 'Electronics & Tech' },
      { name: 'Audio & Headphones', parentName: 'Electronics & Tech' },
      { name: 'Cameras & Photo', parentName: 'Electronics & Tech' },
      { name: 'Smart Devices', parentName: 'Electronics & Tech' },

      // Apparel
      { name: 'Men\'s Clothing', parentName: 'Apparel & Fashion' },
      { name: 'Women\'s Clothing', parentName: 'Apparel & Fashion' },
      { name: 'Kids\' Clothing', parentName: 'Apparel & Fashion' },
      { name: 'Jewelry & Accessories', parentName: 'Apparel & Fashion' },
      { name: 'Gym Wear', parentName: 'Apparel & Fashion' },
      { name: 'Outerwear', parentName: 'Apparel & Fashion' },
      
      // Shoes
      { name: 'Running Shoes', parentName: 'Shoes & Footwear' },
      { name: 'Hiking Boots', parentName: 'Shoes & Footwear' },
      { name: 'Sneakers', parentName: 'Shoes & Footwear' },
      { name: 'Sandals', parentName: 'Shoes & Footwear' },

      // Kitchen
      { name: 'Cookware', parentName: 'Kitchen & Dining' },
      { name: 'Teaware', parentName: 'Kitchen & Dining' },
      { name: 'Kitchen Tools', parentName: 'Kitchen & Dining' },
      { name: 'Tableware', parentName: 'Kitchen & Dining' },

      // Lifestyle
      { name: 'Furniture', parentName: 'Lifestyle & Home' },
      { name: 'Home Decor', parentName: 'Lifestyle & Home' },
      { name: 'Aromatherapy', parentName: 'Lifestyle & Home' },
      { name: 'Bedding & Linen', parentName: 'Lifestyle & Home' },

      // Beauty
      { name: 'Skincare', parentName: 'Beauty & Cosmetics' },
      { name: 'Makeup', parentName: 'Beauty & Cosmetics' },
      { name: 'Fragrances', parentName: 'Beauty & Cosmetics' },
      { name: 'Haircare', parentName: 'Beauty & Cosmetics' },

      // Sports
      { name: 'Fitness Gear', parentName: 'Sports & Outdoors' },
      { name: 'Activewear', parentName: 'Sports & Outdoors' },
      { name: 'Outdoor Equipment', parentName: 'Sports & Outdoors' },
      { name: 'Camping & Hiking', parentName: 'Sports & Outdoors' },

      // Books
      { name: 'Fiction & Literature', parentName: 'Books & Stationery' },
      { name: 'Biographies', parentName: 'Books & Stationery' },
      { name: 'Textbooks', parentName: 'Books & Stationery' },
      { name: 'Stationery & Journals', parentName: 'Books & Stationery' },

      // Grocery
      { name: 'Snacks & Sweets', parentName: 'Grocery & Essentials' },
      { name: 'Beverages', parentName: 'Grocery & Essentials' },
      { name: 'Pantry Staples', parentName: 'Grocery & Essentials' },
      { name: 'Organic Foods', parentName: 'Grocery & Essentials' },

      // Toys
      { name: 'Board Games', parentName: 'Toys & Games' },
      { name: 'Puzzles', parentName: 'Toys & Games' },
      { name: 'Educational Toys', parentName: 'Toys & Games' },

      // Health
      { name: 'Vitamins & Supplements', parentName: 'Health & Wellness' },
      { name: 'Wellness Devices', parentName: 'Health & Wellness' },

      // Pets
      { name: 'Dog Supplies', parentName: 'Pet Supplies' },
      { name: 'Cat Supplies', parentName: 'Pet Supplies' },

      // Baby
      { name: 'Baby Gear', parentName: 'Baby Care' },
      { name: 'Baby Apparel', parentName: 'Baby Care' },
      { name: 'Baby Toys', parentName: 'Baby Care' },

      // Automotive
      { name: 'Car Accessories', parentName: 'Automotive & Tools' },
      { name: 'Hand Tools', parentName: 'Automotive & Tools' }
    ];

    const seededChildren1 = [];
    for (let child of children1) {
      const parentId = rootMap[child.parentName];
      if (parentId) {
        const cat = await Category.create({
          name: child.name,
          slug: slugify(child.name),
          parentId: parentId,
          status: 'approved',
          createdBy: seller._id
        });
        seededChildren1.push(cat);
        console.log(`Seeded Subcategory L1: ${cat.name} under ${child.parentName} (${cat._id})`);
      }
    }

    // Map subcategory L1 names to IDs for L2 seeding
    const subL1Map = {};
    seededChildren1.forEach(c => {
      subL1Map[c.name] = c._id;
    });

    // Seed Level 2 (Sub-children under Smart Devices)
    const children2 = [
      { name: 'Smart Watches', parentName: 'Smart Devices' },
      { name: 'Smart Thermostats', parentName: 'Smart Devices' }
    ];

    for (let child of children2) {
      const parentId = subL1Map[child.parentName];
      if (parentId) {
        const cat = await Category.create({
          name: child.name,
          slug: slugify(child.name),
          parentId: parentId,
          status: 'approved',
          createdBy: seller._id
        });
        console.log(`Seeded Subcategory L2: ${cat.name} under ${child.parentName} (${cat._id})`);
      }
    }

    mongoose.disconnect();
    console.log('Database disconnected. Category seeding completed.');
  } catch (error) {
    console.error('Seeding categories process failed:', error);
    process.exit(1);
  }
}

seed();
