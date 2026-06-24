'use client';

import { useState, useEffect, useMemo } from 'react';
import RequestCategoryModal from './RequestCategoryModal';

// Fallback categories used when the backend API is unreachable (Vercel cold start, DB empty, etc.)
const FALLBACK_CATEGORIES = [
  { id: 'tech', name: 'Electronics & Tech', children: [
    { id: 'backpacks', name: 'Backpacks', children: [] },
    { id: 'mice', name: 'Mice', children: [] },
    { id: 'audio', name: 'Audio & Headphones', children: [] },
    { id: 'smart-devices', name: 'Smart Devices', children: [
      { id: 'smart-watches', name: 'Smart Watches', children: [] },
      { id: 'smart-thermostats', name: 'Smart Thermostats', children: [] }
    ]}
  ]},
  { id: 'shoes', name: 'Shoes & Footwear', children: [
    { id: 'running-shoes', name: 'Running Shoes', children: [] },
    { id: 'hiking-boots', name: 'Hiking Boots', children: [] },
    { id: 'sneakers', name: 'Sneakers', children: [] }
  ]},
  { id: 'kitchen', name: 'Kitchen & Dining', children: [
    { id: 'cookware', name: 'Cookware', children: [] },
    { id: 'teaware', name: 'Teaware', children: [] },
    { id: 'kitchen-tools', name: 'Kitchen Tools', children: [] }
  ]},
  { id: 'apparel', name: 'Apparel & Fashion', children: [
    { id: 'gym-wear', name: 'Gym Wear', children: [] },
    { id: 'outerwear', name: 'Outerwear', children: [] }
  ]},
  { id: 'lifestyle', name: 'Lifestyle & Home', children: [
    { id: 'home-decor', name: 'Home Decor', children: [] },
    { id: 'aromatherapy', name: 'Aromatherapy', children: [] }
  ]},
  { id: 'beauty', name: 'Beauty & Cosmetics', children: [
    { id: 'skincare', name: 'Skincare', children: [] },
    { id: 'makeup', name: 'Makeup', children: [] }
  ]},
  { id: 'sports', name: 'Sports & Outdoors', children: [
    { id: 'fitness-gear', name: 'Fitness Gear', children: [] },
    { id: 'activewear', name: 'Activewear', children: [] }
  ]},
  { id: 'grocery', name: 'Grocery & Essentials', children: [
    { id: 'snacks', name: 'Snacks', children: [] },
    { id: 'beverages', name: 'Beverages', children: [] }
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

export default function CategorySelector({ value, onChange }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    fetchCategories();
  }, []);

  // Sync selectedPath when external value changes or categories load
  useEffect(() => {
    if (categories.length > 0 && value) {
      const path = tracePath(categories, value);
      if (path) {
        setSelectedPath(path);
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
