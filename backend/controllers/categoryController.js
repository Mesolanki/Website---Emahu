const Category = require('../models/Category');

/**
 * Helper to generate a URL-friendly slug from category name
 */
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

/**
 * Recursive utility function to build category tree
 * @param {Array} categories Flat list of all categories fetched from DB
 * @param {ObjectId|null} parentId The ID of the parent to find children for
 * @returns {Array} Nested hierarchical category tree
 */
const buildCategoryTree = (categories, parentId = null) => {
  const categoryTree = [];
  let filteredList;

  if (parentId === null) {
    // Root level categories have parentId as null or undefined
    filteredList = categories.filter(
      (cat) => cat.parentId === null || cat.parentId === undefined
    );
  } else {
    // Child level categories match the parentId
    filteredList = categories.filter(
      (cat) => cat.parentId && cat.parentId.toString() === parentId.toString()
    );
  }

  for (let cat of filteredList) {
    const catObj = cat.toObject ? cat.toObject() : cat;
    catObj.id = catObj._id.toString();

    // Recurse to populate subcategories (children)
    catObj.children = buildCategoryTree(categories, catObj._id);

    categoryTree.push(catObj);
  }

  return categoryTree;
};

/**
 * @desc    Get all categories formatted as hierarchical tree
 * @route   GET /api/categories
 * @access  Public
 */
exports.getCategories = async (req, res) => {
  try {
    // Optionally filter by status (default to only approved categories)
    const statusFilter = req.query.status || 'approved';
    const query = {};
    if (statusFilter !== 'all') {
      query.status = statusFilter;
    }

    const categories = await Category.find(query).sort({ name: 1 });
    const categoryTree = buildCategoryTree(categories, null);

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categoryTree
    });
  } catch (err) {
    console.error('Error in getCategories:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Propose/request a new category
 * @route   POST /api/categories/request
 * @access  Private (Seller/Admin)
 */
exports.requestCategory = async (req, res) => {
  try {
    const { name, parentId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a category name'
      });
    }

    // Verify parent category if parentId is provided
    if (parentId) {
      const parentExists = await Category.findById(parentId);
      if (!parentExists) {
        return res.status(404).json({
          success: false,
          error: 'Parent category not found'
        });
      }
    }

    const category = await Category.create({
      name,
      slug: slugify(name),
      parentId: parentId || null,
      status: 'approved', // Automatically approved so seller can use it immediately
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Category added successfully.',
      data: category
    });
  } catch (err) {
    console.error('Error in requestCategory:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Approve a pending category request
 * @route   PUT /api/categories/approve/:id
 * @access  Private (Admin)
 */
exports.approveCategory = async (req, res) => {
  try {
    let category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Update status to approved
    category = await Category.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Category approved successfully',
      data: category
    });
  } catch (err) {
    console.error('Error in approveCategory:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Seed default categories into the database (Admin only)
 *          Useful for Vercel / production environments where you can't run local seed scripts.
 *          WARNING: Clears all existing categories before seeding.
 * @route   POST /api/categories/seed
 * @access  Private (Admin only)
 */
exports.seedDefaultCategories = async (req, res) => {
  try {
    const adminId = req.user._id;

    const DEFAULT_CATEGORIES = [
      { name: 'Electronics & Tech', children: [
        { name: 'Smartphones & Tablets' }, { name: 'Computers & Accessories' }, { name: 'Audio & Headphones' },
        { name: 'Cameras & Photo' }, { name: 'Smart Devices', children: [
          { name: 'Smart Watches' }, { name: 'Smart Thermostats' }
        ]}
      ]},
      { name: 'Apparel & Fashion', children: [
        { name: 'Men\'s Clothing' }, { name: 'Women\'s Clothing' }, { name: 'Kids\' Clothing' },
        { name: 'Jewelry & Accessories' }, { name: 'Gym Wear' }, { name: 'Outerwear' }
      ]},
      { name: 'Shoes & Footwear', children: [
        { name: 'Running Shoes' }, { name: 'Hiking Boots' }, { name: 'Sneakers' }, { name: 'Sandals' }
      ]},
      { name: 'Kitchen & Dining', children: [
        { name: 'Cookware' }, { name: 'Teaware' }, { name: 'Kitchen Tools' }, { name: 'Tableware' }
      ]},
      { name: 'Lifestyle & Home', children: [
        { name: 'Furniture' }, { name: 'Home Decor' }, { name: 'Aromatherapy' }, { name: 'Bedding & Linen' }
      ]},
      { name: 'Beauty & Cosmetics', children: [
        { name: 'Skincare' }, { name: 'Makeup' }, { name: 'Fragrances' }, { name: 'Haircare' }
      ]},
      { name: 'Sports & Outdoors', children: [
        { name: 'Fitness Gear' }, { name: 'Activewear' }, { name: 'Outdoor Equipment' }, { name: 'Camping & Hiking' }
      ]},
      { name: 'Books & Stationery', children: [
        { name: 'Fiction & Literature' }, { name: 'Biographies' }, { name: 'Textbooks' }, { name: 'Stationery & Journals' }
      ]},
      { name: 'Grocery & Essentials', children: [
        { name: 'Snacks & Sweets' }, { name: 'Beverages' }, { name: 'Pantry Staples' }, { name: 'Organic Foods' }
      ]},
      { name: 'Toys & Games', children: [
        { name: 'Board Games' }, { name: 'Puzzles' }, { name: 'Educational Toys' }
      ]},
      { name: 'Health & Wellness', children: [
        { name: 'Vitamins & Supplements' }, { name: 'Wellness Devices' }
      ]},
      { name: 'Pet Supplies', children: [
        { name: 'Dog Supplies' }, { name: 'Cat Supplies' }
      ]},
      { name: 'Baby Care', children: [
        { name: 'Baby Gear' }, { name: 'Baby Apparel' }, { name: 'Baby Toys' }
      ]},
      { name: 'Automotive & Tools', children: [
        { name: 'Car Accessories' }, { name: 'Hand Tools' }
      ]}
    ];

    // Clear existing categories
    await Category.deleteMany({});
    let totalCreated = 0;

    // Recursive insert helper
    const insertCategories = async (items, parentId = null) => {
      for (const item of items) {
        const cat = await Category.create({
          name: item.name,
          slug: slugify(item.name),
          parentId,
          status: 'approved',
          createdBy: adminId
        });
        totalCreated++;
        if (item.children && item.children.length > 0) {
          await insertCategories(item.children, cat._id);
        }
      }
    };

    await insertCategories(DEFAULT_CATEGORIES);

    res.status(200).json({
      success: true,
      message: `Successfully seeded ${totalCreated} categories into the database.`,
      totalCreated
    });
  } catch (err) {
    console.error('Error in seedDefaultCategories:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error while seeding categories: ' + err.message
    });
  }
};
