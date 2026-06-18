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
      { name: 'Electronics & Tech', parentId: null },
      { name: 'Shoes & Footwear', parentId: null },
      { name: 'Kitchen & Dining', parentId: null },
      { name: 'Apparel & Fashion', parentId: null },
      { name: 'Lifestyle & Home', parentId: null }
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
      { name: 'Backpacks', parentName: 'Electronics & Tech' },
      { name: 'Mice', parentName: 'Electronics & Tech' },
      { name: 'Audio & Headphones', parentName: 'Electronics & Tech' },
      { name: 'Smart Devices', parentName: 'Electronics & Tech' },
      
      // Shoes
      { name: 'Running Shoes', parentName: 'Shoes & Footwear' },
      { name: 'Hiking Boots', parentName: 'Shoes & Footwear' },
      { name: 'Sneakers', parentName: 'Shoes & Footwear' },

      // Kitchen
      { name: 'Cookware', parentName: 'Kitchen & Dining' },
      { name: 'Teaware', parentName: 'Kitchen & Dining' },
      { name: 'Kitchen Tools', parentName: 'Kitchen & Dining' },

      // Apparel
      { name: 'Gym Wear', parentName: 'Apparel & Fashion' },
      { name: 'Outerwear', parentName: 'Apparel & Fashion' },

      // Lifestyle
      { name: 'Home Decor', parentName: 'Lifestyle & Home' },
      { name: 'Aromatherapy', parentName: 'Lifestyle & Home' }
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
