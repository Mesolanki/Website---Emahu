'use client';

import { useState, useEffect, useMemo } from 'react';
import RequestCategoryModal from './RequestCategoryModal';

/**
 * Helper to trace the list of ancestor IDs for a given target category ID in the category tree.
 */
function tracePath(categories, targetId, currentPath = []) {
  for (let cat of categories) {
    const catIdStr = cat.id || cat._id?.toString();
    if (catIdStr === targetId) {
      return [...currentPath, catIdStr];
    }
    if (cat.children && cat.children.length > 0) {
      const found = tracePath(cat.children, targetId, [...currentPath, catIdStr]);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Helper to find a category node by ID in the tree
 */
function findCategoryNode(categories, targetId) {
  for (let cat of categories) {
    const catIdStr = cat.id || cat._id?.toString();
    if (catIdStr === targetId) return cat;
    if (cat.children && cat.children.length > 0) {
      const found = findCategoryNode(cat.children, targetId);
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

  // Fetch categories from Backend API
  const fetchCategories = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/categories?status=approved`);
      const data = await res.json();
      if (data.success && data.data) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
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

    // Call onChange with the deepest selected category ID, or empty if none
    const deepestId = nextPath[nextPath.length - 1] || '';
    if (onChange) {
      onChange(deepestId);
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
    return <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Loading categories...</span>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      {levels.map((levelObj) => (
        <div key={levelObj.level} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {levelObj.level === 0 ? 'Main Category *' : `Subcategory Level ${levelObj.level} *`}
          </label>
          <select
            className="select-filter"
            style={{
              height: '38px',
              width: '100%',
              backgroundColor: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              color: '#ffffff',
              padding: '0 10px',
              fontSize: '0.85rem',
              outline: 'none'
            }}
            value={levelObj.selectedValue}
            onChange={(e) => handleLevelChange(levelObj.level, e.target.value)}
            required
          >
            <option value="">Select Option...</option>
            {levelObj.options.map((opt) => (
              <option key={opt.id} value={opt.id}>
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
            color: '#f59e0b', // Merchant Gold / Orange
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
