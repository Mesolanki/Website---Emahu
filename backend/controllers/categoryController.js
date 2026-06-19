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
