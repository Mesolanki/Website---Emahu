'use client';

import { useState, useEffect, useMemo } from 'react';
import RequestCategoryModal from './RequestCategoryModal';

// Fallback categories used when the backend API is unreachable (Vercel cold start, DB empty, etc.)
const FALLBACK_CATEGORIES = [
  { id: 'tech', name: 'Electronics & Tech', children: [
    { id: 'smartphones', name: 'Smartphones & Tablets', children: [] },
    { id: 'computers', name: 'Computers & Accessories', children: [] },
    { id: 'audio', name: 'Audio & Headphones', children: [] },
    { id: 'cameras', name: 'Cameras & Photo', children: [] },
    { id: 'smart-devices', name: 'Smart Devices', children: [
      { id: 'smart-watches', name: 'Smart Watches', children: [] },
      { id: 'smart-thermostats', name: 'Smart Thermostats', children: [] }
    ]}
  ]},
  { id: 'apparel', name: 'Apparel & Fashion', children: [
    { id: 'mens-clothing', name: 'Men\'s Clothing', children: [] },
    { id: 'womens-clothing', name: 'Women\'s Clothing', children: [] },
    { id: 'kids-clothing', name: 'Kids\' Clothing', children: [] },
    { id: 'jewelry-accessories', name: 'Jewelry & Accessories', children: [] },
    { id: 'gym-wear', name: 'Gym Wear', children: [] },
    { id: 'outerwear', name: 'Outerwear', children: [] }
  ]},
  { id: 'shoes', name: 'Shoes & Footwear', children: [
    { id: 'running-shoes', name: 'Running Shoes', children: [] },
    { id: 'hiking-boots', name: 'Hiking Boots', children: [] },
    { id: 'sneakers', name: 'Sneakers', children: [] },
    { id: 'sandals', name: 'Sandals', children: [] }
  ]},
  { id: 'kitchen', name: 'Kitchen & Dining', children: [
    { id: 'cookware', name: 'Cookware', children: [] },
    { id: 'teaware', name: 'Teaware', children: [] },
    { id: 'kitchen-tools', name: 'Kitchen Tools', children: [] },
    { id: 'tableware', name: 'Tableware', children: [] }
  ]},
  { id: 'lifestyle', name: 'Lifestyle & Home', children: [
    { id: 'furniture', name: 'Furniture', children: [] },
    { id: 'home-decor', name: 'Home Decor', children: [] },
    { id: 'aromatherapy', name: 'Aromatherapy', children: [] },
    { id: 'bedding-linen', name: 'Bedding & Linen', children: [] }
  ]},
  { id: 'beauty', name: 'Beauty & Cosmetics', children: [
    { id: 'skincare', name: 'Skincare', children: [] },
    { id: 'makeup', name: 'Makeup', children: [] },
    { id: 'fragrances', name: 'Fragrances', children: [] },
    { id: 'haircare', name: 'Haircare', children: [] }
  ]},
  { id: 'sports', name: 'Sports & Outdoors', children: [
    { id: 'fitness-gear', name: 'Fitness Gear', children: [] },
    { id: 'activewear', name: 'Activewear', children: [] },
    { id: 'outdoor-equipment', name: 'Outdoor Equipment', children: [] },
    { id: 'camping-hiking', name: 'Camping & Hiking', children: [] }
  ]},
  { id: 'books', name: 'Books & Stationery', children: [
    { id: 'fiction-lit', name: 'Fiction & Literature', children: [] },
    { id: 'biographies', name: 'Biographies', children: [] },
    { id: 'textbooks', name: 'Textbooks', children: [] },
    { id: 'stationery-journals', name: 'Stationery & Journals', children: [] }
  ]},
  { id: 'grocery', name: 'Grocery & Essentials', children: [
    { id: 'snacks-sweets', name: 'Snacks & Sweets', children: [] },
    { id: 'beverages', name: 'Beverages', children: [] },
    { id: 'pantry-staples', name: 'Pantry Staples', children: [] },
    { id: 'organic-foods', name: 'Organic Foods', children: [] }
  ]},
  { id: 'toys', name: 'Toys & Games', children: [
    { id: 'board-games', name: 'Board Games', children: [] },
    { id: 'puzzles', name: 'Puzzles', children: [] },
    { id: 'educational-toys', name: 'Educational Toys', children: [] }
  ]},
  { id: 'health', name: 'Health & Wellness', children: [
    { id: 'vitamins-supps', name: 'Vitamins & Supplements', children: [] },
    { id: 'wellness-devices', name: 'Wellness Devices', children: [] }
  ]},
  { id: 'pets', name: 'Pet Supplies', children: [
    { id: 'dog-supplies', name: 'Dog Supplies', children: [] },
    { id: 'cat-supplies', name: 'Cat Supplies', children: [] }
  ]},
  { id: 'baby', name: 'Baby Care', children: [
    { id: 'baby-gear', name: 'Baby Gear', children: [] },
    { id: 'baby-apparel', name: 'Baby Apparel', children: [] },
    { id: 'baby-toys', name: 'Baby Toys', children: [] }
  ]},
  { id: 'automotive', name: 'Automotive & Tools', children: [
    { id: 'car-accessories', name: 'Car Accessories', children: [] },
    { id: 'hand-tools', name: 'Hand Tools', children: [] }
  ]}
];

/**
 * Helper to trace the list of ancestor IDs for a given target category ID or name in the category tree.
 */
function tracePath(categories, target, currentPath = []) {
  for (let cat of categories) {
    const catIdStr = cat.id || cat._id?.toString();
    if (catIdStr === target || cat.name === target) {
      return [...currentPath, catIdStr];
    }
    if (cat.children && cat.children.length > 0) {
      const found = tracePath(cat.children, target, [...currentPath, catIdStr]);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Helper to find a category node by ID or name in the tree
 */
function findCategoryNode(categories, target) {
  for (let cat of categories) {
    const catIdStr = cat.id || cat._id?.toString();
    if (catIdStr === target || cat.name === target) return cat;
    if (cat.children && cat.children.length > 0) {
      const found = findCategoryNode(cat.children, target);
      if (found) return found;
    }
  }
  return null;
}

function flattenCategories(categoriesList) {
  let flat = [];
  for (let cat of categoriesList) {
    flat.push(cat);
    if (cat.children && cat.children.length > 0) {
      flat = flat.concat(flattenCategories(cat.children));
    }
  }
  return flat;
}

export default function CategorySelector({ value, onChange }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Flatten categories list for searching
  const flatCategories = useMemo(() => {
    return flattenCategories(categories);
  }, [categories]);

  // Filter categories matching search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return flatCategories.filter(cat => 
      cat.name.toLowerCase().includes(query)
    );
  }, [flatCategories, searchQuery]);

  // Fetch categories from Backend API, fall back to hardcoded list if API fails
  const fetchCategories = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/categories?status=approved`);
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        setCategories(data.data);
      } else {
        // API returned empty or failed — use fallback so seller isn't stuck
        console.warn('Categories API returned empty. Using fallback categories.');
        setCategories(FALLBACK_CATEGORIES);
      }
    } catch (err) {
      console.error('Error fetching categories, using fallback:', err);
      setCategories(FALLBACK_CATEGORIES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      fetchCategories();
    }, 0);
    const interval = setInterval(() => {
      fetchCategories();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Sync selectedPath when external value changes or categories load
  useEffect(() => {
    if (categories.length > 0 && value) {
      const path = tracePath(categories, value);
      if (path) {
        setTimeout(() => {
          setSelectedPath(path);
        }, 0);
      }
    }
  }, [value, categories]);

  // Compute the cascading levels to display
  const levels = useMemo(() => {
    const dropdownLevels = [];
    
    // Level 0 options (Root categories)
    dropdownLevels.push({
      level: 0,
      options: categories,
      selectedValue: selectedPath[0] || ''
    });

    // Sub-levels options based on current selection path
    for (let i = 0; i < selectedPath.length; i++) {
      const currentId = selectedPath[i];
      const currentNode = findCategoryNode(categories, currentId);
      
      if (currentNode && currentNode.children && currentNode.children.length > 0) {
        dropdownLevels.push({
          level: i + 1,
          options: currentNode.children,
          selectedValue: selectedPath[i + 1] || ''
        });
      }
    }

    return dropdownLevels;
  }, [categories, selectedPath]);

  // Handle select option change at a specific dropdown level
  const handleLevelChange = (level, val) => {
    const nextPath = selectedPath.slice(0, level);
    if (val) {
      nextPath.push(val);
    }

    setSelectedPath(nextPath);

    // Call onChange with the deepest selected category Name, or empty if none
    const deepestId = nextPath[nextPath.length - 1] || '';
    let deepestName = '';
    if (deepestId) {
      const node = findCategoryNode(categories, deepestId);
      deepestName = node ? node.name : '';
    }

    if (onChange) {
      onChange(deepestName);
    }
  };

  // Determine active parent details to pre-fill the Request Category Modal
  const currentParentInfo = useMemo(() => {
    const deepestId = selectedPath[selectedPath.length - 1];
    if (!deepestId) return { id: null, name: 'Root / None' };

    const node = findCategoryNode(categories, deepestId);
    return {
      id: deepestId,
      name: node ? node.name : 'Unknown'
    };
  }, [selectedPath, categories]);

  if (loading) {
    return <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading categories...</span>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      {/* Category Search Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Search Category
        </label>
        <input
          type="text"
          placeholder="Type to search categories (e.g., electric, shoe, beauty)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="select-filter"
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        {filteredCategories.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            maxHeight: '200px',
            overflowY: 'auto',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-surface)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            marginTop: '4px',
            zIndex: 9999,
            boxSizing: 'border-box'
          }}>
            {filteredCategories.map((cat) => (
              <div
                key={cat.id || cat._id}
                onClick={() => {
                  if (onChange) {
                    onChange(cat.name);
                  }
                  setSearchQuery('');
                }}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  borderBottom: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-surface)',
                  transition: 'background-color 0.2s',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
              >
                {cat.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {levels.map((levelObj) => (
        <div key={levelObj.level} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {levelObj.level === 0 ? 'Main Category *' : `Subcategory Level ${levelObj.level} *`}
          </label>
          <select
            className="select-filter"
            style={{
              width: '100%',
              outline: 'none'
            }}
            value={levelObj.selectedValue}
            onChange={(e) => handleLevelChange(levelObj.level, e.target.value)}
            required
          >
            <option value="" style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)' }}>Select Option...</option>
            {levelObj.options.map((opt) => (
              <option key={opt.id} value={opt.id} style={{ color: 'var(--text-primary)', background: 'var(--bg-surface)' }}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      ))}

      {/* Fallback proposal action */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '4px' }}>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#d97706', // Merchant Gold / Orange (darker for high contrast)
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline'
          }}
        >
          Can&apos;t find your category? Request a new one.
        </button>
      </div>

      <RequestCategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        parentId={currentParentInfo.id}
        parentName={currentParentInfo.name}
        onSuccess={fetchCategories}
      />
    </div>
  );
}
