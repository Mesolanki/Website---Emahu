'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './selector.css';

// ─── DATA DEFINITIONS ───
const CATEGORIES = [
  {
    id: 'tech',
    name: 'Electronics & Tech',
    icon: '💻',
    desc: 'High-performance laptops, gadgets, smart devices, and premium accessories.',
    subcategories: ['All Tech', 'Backpacks', 'Mice', 'Audio & Headphones', 'Smart Devices'],
    gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
    accent: '#6366f1'
  },
  {
    id: 'shoes',
    name: 'Shoes & Footwear',
    icon: '👟',
    desc: 'Premium athletic footwear, durable hiking boots, and designer sneakers.',
    subcategories: ['All Shoes', 'Running Shoes', 'Hiking Boots', 'Sneakers', 'Accessories'],
    gradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.08) 0%, rgba(239, 68, 68, 0.08) 100%)',
    accent: '#ec4899'
  },
  {
    id: 'kitchen',
    name: 'Kitchen & Dining',
    icon: '🍳',
    desc: 'Eco-friendly cookware, glass infusion teapots, and luxury kitchen tools.',
    subcategories: ['All Kitchen', 'Cookware', 'Teaware', 'Kitchen Tools', 'Tableware'],
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(20, 184, 166, 0.08) 100%)',
    accent: '#10b981'
  },
  {
    id: 'apparel',
    name: 'Apparel & Fashion',
    icon: '👕',
    desc: 'Organic cotton fabrics, active compression gym wear, and windbreakers.',
    subcategories: ['All Apparel', 'Gym Wear', 'Outerwear', 'Tops', 'Bottoms'],
    gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(234, 88, 12, 0.08) 100%)',
    accent: '#f59e0b'
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle & Home',
    icon: '🏠',
    desc: 'Botanic decorative cushion covers, aromatherapy diffusers, and comfort goods.',
    subcategories: ['All Lifestyle', 'Home Decor', 'Aromatherapy', 'Organizers', 'Comfort'],
    gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(236, 72, 153, 0.08) 100%)',
    accent: '#8b5cf6'
  }
];

// Image URL cleaning utilities (handles extra quotes, brackets from DB)
const cleanImageUrl = (img) => {
  if (!img || typeof img !== 'string') return '';
  let clean = img.trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }
  if (clean.startsWith('[') && clean.endsWith(']')) {
    try {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed) && parsed.length > 0) return cleanImageUrl(parsed[0]);
    } catch (e) {
      clean = clean.slice(1, -1).trim();
      if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
        clean = clean.slice(1, -1).trim();
      }
    }
  }
  return clean;
};

const isRealImage = (img) => {
  const clean = cleanImageUrl(img);
  return clean.startsWith('http') || clean.startsWith('data:image');
};

// Default icon/accent palette for dynamically loaded categories
const DYNAMIC_CATEGORY_ICONS = {
  'electronics': '💻', 'tech': '💻', 'computers': '🖥️', 'mobile': '📱', 'phones': '📱',
  'shoes': '👟', 'footwear': '👟', 'kitchen': '🍳', 'dining': '🍽️', 'food': '🍔',
  'apparel': '👕', 'fashion': '👗', 'clothing': '👔', 'lifestyle': '🏠', 'home': '🏡',
  'beauty': '💄', 'cosmetics': '💅', 'sports': '⚽', 'fitness': '🏋️', 'books': '📚',
  'toys': '🧸', 'games': '🎮', 'automotive': '🚗', 'jewelry': '💍', 'watches': '⌚',
  'grocery': '🛒', 'health': '💊', 'music': '🎵', 'pets': '🐾', 'garden': '🌱',
  'baby': '👶', 'tools': '🔧', 'art': '🎨', 'travel': '✈️', 'stationery': '📝', 'office': '🖊️'
};
const DYNAMIC_ACCENTS = ['#0ea5e9', '#d946ef', '#14b8a6', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#e11d48', '#7c3aed'];

import { STATIC_PRODUCTS } from '@/utils/mockProducts';

function Stars({ rating, reviews }) {
  const rounded = Math.round(rating);
  return (
    <div className="sel-stars">
      <div className="sel-stars-row">
        {[1, 2, 3, 4, 5].map(s => (
          <svg
            key={s}
            className={`sel-star ${s <= rounded ? 'sel-star--active' : 'sel-star--empty'}`}
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="currentColor"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      <span className="sel-stars-text">{rating.toFixed(1)} ({reviews})</span>
    </div>
  );
}

export default function RoleSelector() {
  const router = useRouter();
  
  // App-level States
  const [cartCount, setCartCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  
  // Category Explorer States
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeSubcategory, setActiveSubcategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbProducts, setDbProducts] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  
  // Portal & Dropdown States
  const [deliveryDropdownOpen, setDeliveryDropdownOpen] = useState(false);
  const deliveryDropdownRef = useRef(null);

  // Sync cart & login details on mount
  useEffect(() => {
    const syncStates = () => {
      try {
        const cart = localStorage.getItem('emahu_cart');
        setCartCount(cart ? JSON.parse(cart).length : 0);
        
        const logged = localStorage.getItem('emahu_buyer_logged_in') === 'true' || 
                       localStorage.getItem('emahu_buyer_registered') === 'true';
        setIsLoggedIn(logged);
        
        const userData = localStorage.getItem('emahu_buyer_user');
        if (userData) {
          setUserProfile(JSON.parse(userData));
        } else {
          setUserProfile(null);
        }
      } catch (e) {
        console.error(e);
      }
    };

    syncStates();
    window.addEventListener('storage', syncStates);
    return () => window.removeEventListener('storage', syncStates);
  }, []);

  // Fetch dbProducts from Backend API to support live seller items
  useEffect(() => {
    const fetchDbProducts = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products`);
        const data = await res.json();
        if (data.success && data.products) {
          setDbProducts(data.products);
        }
      } catch (err) {
        console.error('Error fetching backend products:', err);
      }
    };
    fetchDbProducts();
  }, []);

  // Fetch dynamic categories from Backend API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/categories?status=approved`);
        const data = await res.json();
        if (data.success && data.data) {
          setDbCategories(data.data);
        }
      } catch (err) {
        console.error('Error fetching backend categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Close delivery dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (deliveryDropdownRef.current && !deliveryDropdownRef.current.contains(e.target)) {
        setDeliveryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Merge hardcoded + dynamic backend categories for the welcome screen
  const mergedCategories = useMemo(() => {
    if (!dbCategories.length) return CATEGORIES;
    
    const hardcodedSlugs = CATEGORIES.map(c => c.id);
    const hardcodedNamesLC = CATEGORIES.map(c => c.name.toLowerCase());
    
    const dynamicCats = [];
    let accentIdx = 0;
    
    dbCategories.forEach(dbCat => {
      const nameLC = dbCat.name.toLowerCase();
      const slug = dbCat.slug || nameLC.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      // Skip if this DB category already matches a hardcoded one
      const matchesHardcoded = hardcodedSlugs.includes(slug) ||
        hardcodedNamesLC.some(hn => hn.includes(nameLC) || nameLC.includes(hn));
      
      if (!matchesHardcoded) {
        let icon = '📦';
        for (const [key, emoji] of Object.entries(DYNAMIC_CATEGORY_ICONS)) {
          if (nameLC.includes(key)) { icon = emoji; break; }
        }
        
        const accent = DYNAMIC_ACCENTS[accentIdx % DYNAMIC_ACCENTS.length];
        accentIdx++;
        const r = parseInt(accent.slice(1, 3), 16);
        const g = parseInt(accent.slice(3, 5), 16);
        const b = parseInt(accent.slice(5, 7), 16);
        
        const subcats = ['All ' + dbCat.name];
        if (dbCat.children && dbCat.children.length > 0) {
          dbCat.children.forEach(child => subcats.push(child.name));
        }
        
        dynamicCats.push({
          id: slug,
          name: dbCat.name,
          icon,
          desc: `Browse ${dbCat.name} products from verified sellers on EMAHU.`,
          subcategories: subcats,
          gradient: `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.08) 0%, rgba(${r}, ${g}, ${b}, 0.04) 100%)`,
          accent
        });
      }
    });
    
    return [...CATEGORIES, ...dynamicCats];
  }, [dbCategories]);

  // Build category name → root category ID lookup for product mapping
  const categoryNameToId = useMemo(() => {
    const lookup = {};
    
    // Hardcoded mappings (legacy support)
    lookup['electronics'] = 'tech';
    lookup['furniture'] = 'lifestyle';
    lookup['fitness'] = 'lifestyle';
    
    // Map DB root categories to hardcoded IDs where they overlap
    const dbRootToResolvedId = {};
    dbCategories.forEach(dbCat => {
      const nameLC = dbCat.name.toLowerCase();
      const slug = dbCat.slug || nameLC.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (lookup[nameLC]) {
        dbRootToResolvedId[slug] = lookup[nameLC];
      } else {
        for (const hc of CATEGORIES) {
          const hcNameLC = hc.name.toLowerCase();
          if (hcNameLC.includes(nameLC) || nameLC.includes(hcNameLC)) {
            dbRootToResolvedId[slug] = hc.id;
            break;
          }
        }
      }
    });
    
    // Map all DB categories (at any depth) → resolved root category ID
    const mapTree = (cats, rootId) => {
      cats.forEach(cat => {
        const catSlug = cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const nameLC = cat.name.toLowerCase();
        const effectiveRootId = rootId || dbRootToResolvedId[catSlug] || catSlug;
        if (!lookup[nameLC]) {
          lookup[nameLC] = effectiveRootId;
        }
        if (cat.children && cat.children.length > 0) {
          mapTree(cat.children, effectiveRootId);
        }
      });
    };
    mapTree(dbCategories, null);
    
    return lookup;
  }, [dbCategories]);

  // Combine DB & static products
  const allProducts = useMemo(() => {
    const mappedDb = dbProducts.map(p => {
      let cat = p.category ? p.category.toLowerCase() : '';
      // Use dynamic category lookup, then hardcoded fallbacks
      if (categoryNameToId[cat]) {
        cat = categoryNameToId[cat];
      } else if (cat === 'electronics') {
        cat = 'tech';
      } else if (cat === 'furniture' || cat === 'fitness') {
        cat = 'lifestyle';
      }
      
      const cleanedImg = cleanImageUrl(p.image);
      
      return {
        id: p.id || p._id,
        name: p.name,
        brand: p.brand || p.seller?.name || 'Emahu Seller',
        category: cat,
        subcategory: p.subcategory || 'General',
        price: p.price,
        originalPrice: p.comparePrice || p.price,
        rating: p.rating || 4.7,
        reviews: p.reviews || 84,
        seller: p.seller?.name || p.brand || 'Emahu Seller',
        image: isRealImage(p.image) ? cleanedImg : (p.image || '📦'),
        stock: p.stock
      };
    });
    
    // De-duplicate items with same ID or name for smooth UI experience
    const seen = new Set();
    return [...mappedDb, ...STATIC_PRODUCTS].filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [dbProducts, categoryNameToId]);

  // Filtered products based on active categories and search
  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return [];

    return allProducts.filter(p => {
      // Category check
      if (p.category !== selectedCategory.id) return false;
      
      // Subcategory check
      if (activeSubcategory !== 'All' && !activeSubcategory.startsWith('All')) {
        if (p.subcategory.toLowerCase() !== activeSubcategory.toLowerCase()) return false;
      }

      // Search query check
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query) ||
          p.seller.toLowerCase().includes(query) ||
          p.subcategory.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [selectedCategory, activeSubcategory, searchQuery, allProducts]);

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setActiveSubcategory('All');
    setSearchQuery('');
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setActiveSubcategory('All');
    setSearchQuery('');
  };

  return (
    <div className="sel-wrapper">
      {/* Background Soft Pastel Ambient Glowing Blobs */}
      <div className="sel-bg-container">
        <div className="sel-blob sel-blob--buyer" />
        <div className="sel-blob sel-blob--seller" />
        <div className="sel-blob sel-blob--delivery" />
      </div>

      {/* Main Top Header Navigation */}
      <header className="sel-navbar">
        <div className="sel-navbar__container">
          <Link href="/" className="sel-logo">
            <div className="sel-logo__icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="EMAHU Logo">
                <rect width="32" height="32" rx="10" fill="url(#selNavbarGrad)" />
                <path d="M8 12h16M8 16h12M8 20h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
                <defs>
                  <linearGradient id="selNavbarGrad" x1="0" y1="0" x2="32" y2="32">
                    <stop stopColor="#63b3ed" />
                    <stop offset="1" stopColor="#4169e1" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="sel-logo__glow" />
            </div>
            <span className="sel-logo__text">EMAHU</span>
          </Link>

          {/* Top Right Buttons (Login/Signup, Cart, Buyer Hub) */}
          <div className="sel-nav-actions">
            {/* 1. Buyer Hub Button */}
            <Link href="/buyer/products" className="sel-nav-btn sel-nav-btn--buyer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span>Buyer Hub</span>
            </Link>

            {/* 2. Cart Button with count badge */}
            <Link href="/buyer/cart" className="sel-nav-btn sel-nav-btn--cart">
              <div className="sel-cart-icon-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                {cartCount > 0 && <span className="sel-cart-badge">{cartCount}</span>}
              </div>
              <span>Cart</span>
            </Link>

            {/* 3. Login/Signup Button */}
            {isLoggedIn ? (
              <Link href="/buyer/products" className="sel-nav-btn sel-nav-btn--profile">
                <div className="sel-profile-avatar">
                  {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span>{userProfile?.name?.split(' ')[0] || 'Account'}</span>
              </Link>
            ) : (
              <Link href="/buyer/login" className="sel-nav-btn sel-nav-btn--login">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
                </svg>
                <span>Login / Signup</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="sel-container">
        {/* Middle Screen Title Block */}
        <header className="sel-header animate-fade-in">
          <h1 className="sel-title">EMAHU Hub Marketplace</h1>
          <p className="sel-subtitle">
            Search verified premium products across key retail categories, register as a merchant seller, or apply to the logistics dispatch network.
          </p>
        </header>

        {/* ── MIDDLE BOARD: CATEGORIES EXPLORER & SEARCH ── */}
        <div className="sel-explorer animate-fade-in">
          {!selectedCategory ? (
            /* Main Categories Grid */
            <div className="sel-categories-view">
              <h2 className="sel-section-title">Explore Main Categories</h2>
              <div className="sel-cat-grid">
                {mergedCategories.map((cat) => (
                  <button
                    key={cat.id}
                    className="sel-cat-card"
                    onClick={() => handleCategorySelect(cat)}
                    style={{
                      '--cat-accent': cat.accent,
                      '--cat-gradient': cat.gradient
                    }}
                  >
                    <div className="sel-cat-card__glow" />
                    <div className="sel-cat-card__icon">{cat.icon}</div>
                    <h3 className="sel-cat-card__title">{cat.name}</h3>
                    <p className="sel-cat-card__desc">{cat.desc}</p>
                    <div className="sel-cat-card__arrow">
                      <span>Explore</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Subcategory & Search Section */
            <div className="sel-subcategory-view">
              {/* Back to main categories */}
              <div className="sel-view-controls">
                <button className="sel-back-btn" onClick={handleBackToCategories}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  <span>Back to Categories</span>
                </button>
                <span className="sel-active-path">
                  Collections / <strong>{selectedCategory.name}</strong>
                </span>
              </div>

              {/* Subcategories Selector Row */}
              <div className="sel-subcat-row-container">
                <div className="sel-subcat-row">
                  {selectedCategory.subcategories.map((sub) => {
                    const isAll = sub.startsWith('All');
                    const isActive = isAll ? (activeSubcategory === 'All') : (activeSubcategory === sub);
                    return (
                      <button
                        key={sub}
                        className={`sel-subcat-pill ${isActive ? 'sel-subcat-pill--active' : ''}`}
                        onClick={() => {
                          setActiveSubcategory(isAll ? 'All' : sub);
                        }}
                        style={{
                          '--pill-accent': selectedCategory.accent
                        }}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Central Searchbar */}
              <div className="sel-searchbar-container">
                <div className="sel-searchbar-wrapper">
                  <svg className="sel-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    type="text"
                    className="sel-search-input"
                    placeholder={`Search products in ${selectedCategory.name}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="sel-search-clear" onClick={() => setSearchQuery('')}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Products Catalog Grid */}
              <div className="sel-product-container">
                <h3 className="sel-product-grid-title">
                  {searchQuery ? `Search Results for "${searchQuery}"` : `${activeSubcategory} Catalog`}
                  <span className="sel-product-count">({filteredProducts.length} items)</span>
                </h3>

                {filteredProducts.length > 0 ? (
                  <div className="sel-product-grid">
                    {filteredProducts.map((p) => (
                      <Link
                        key={p.id}
                        href={`/buyer/products/${p.id}`}
                        className="sel-prod-card"
                      >
                        <div className="sel-prod-card__img-wrap">
                          {typeof p.image === 'string' && (p.image.startsWith('http') || p.image.startsWith('data:image')) ? (
                            <img src={p.image} alt={p.name} className="sel-prod-card__img" loading="lazy" />
                          ) : (
                            <div className="sel-prod-card__placeholder">{p.image || '📦'}</div>
                          )}
                          <span className="sel-prod-card__badge">{selectedCategory.name}</span>
                        </div>

                        <div className="sel-prod-card__body">
                          <span className="sel-prod-card__brand">{p.brand}</span>
                          <h4 className="sel-prod-card__title">{p.name}</h4>
                          
                          {/* Rating and Seller details */}
                          <Stars rating={p.rating} reviews={p.reviews} />
                          
                          <div className="sel-prod-card__seller-info">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                            <span>Seller: <strong>{p.seller}</strong></span>
                          </div>

                          <div className="sel-prod-card__price-row">
                            <span className="sel-prod-card__price">₹{p.price.toLocaleString('en-IN')}</span>
                            {p.originalPrice > p.price && (
                              <span className="sel-prod-card__price-orig">₹{p.originalPrice.toLocaleString('en-IN')}</span>
                            )}
                          </div>
                        </div>

                        <div className="sel-prod-card__footer">
                          <span>View Product Details</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="sel-no-products">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="11" cy="11" r="8"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <h4>No Products Found</h4>
                    <p>Try matching spelling or clear current search criteria to browse all items.</p>
                    <button className="sel-reset-search-btn" onClick={() => { setSearchQuery(''); setActiveSubcategory('All'); }}>
                      Reset Filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── DOWNSIDE PORTAL: MERCHANT SELLER & DELIVERY PARTNER ACTIONS ── */}
        <div className="sel-portals animate-fade-in-delayed">
          <h2 className="sel-portals-title">Emahu Business Hubs</h2>
          
          <div className="sel-portals-grid">
            {/* Option 1: Merchant / Seller */}
            <div className="sel-portal-box sel-portal-box--seller">
              <div className="sel-portal-box__icon">🏪</div>
              <h3 className="sel-portal-box__title">Merchant Seller Portal</h3>
              <p className="sel-portal-box__desc">
                Onboard as a vendor, list inventory, configure delivery fee rates, and grow your retail storefront.
              </p>
              <Link href="/seller" className="sel-portal-btn sel-portal-btn--seller">
                <span>Enter Seller Hub</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>
            </div>

            {/* Option 2: Delivery Partner Options */}
            <div className="sel-portal-box sel-portal-box--delivery" ref={deliveryDropdownRef}>
              <div className="sel-portal-box__icon">🚚</div>
              <h3 className="sel-portal-box__title">Logistics Partner Portal</h3>
              <p className="sel-portal-box__desc">
                Register dispatch assets, coordinate local city orders, and manage last-mile transport logistics.
              </p>
              
              <div className="sel-delivery-dropdown-container">
                <button 
                  className={`sel-portal-btn sel-portal-btn--delivery ${deliveryDropdownOpen ? 'sel-portal-btn--active' : ''}`}
                  onClick={() => setDeliveryDropdownOpen(!deliveryDropdownOpen)}
                >
                  <span>Access Logistics Hub</span>
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5"
                    style={{
                      transform: deliveryDropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.3s ease'
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {deliveryDropdownOpen && (
                  <div className="sel-delivery-dropdown-menu">
                    <Link href="/delivery" className="sel-dropdown-item" onClick={() => setDeliveryDropdownOpen(false)}>
                      <span className="sel-dropdown-item__emoji">🛵</span>
                      <div className="sel-dropdown-item__text">
                        <strong>Single/Two Boy Delivery</strong>
                        <span>Independent local driver dispatch.</span>
                      </div>
                    </Link>
                    <Link href="/delivery" className="sel-dropdown-item" onClick={() => setDeliveryDropdownOpen(false)}>
                      <span className="sel-dropdown-item__emoji">🏢</span>
                      <div className="sel-dropdown-item__text">
                        <strong>Delivery Agency</strong>
                        <span>Fleet dispatcher operations.</span>
                      </div>
                    </Link>
                    <Link href="/delivery" className="sel-dropdown-item" onClick={() => setDeliveryDropdownOpen(false)}>
                      <span className="sel-dropdown-item__emoji">🤝</span>
                      <div className="sel-dropdown-item__text">
                        <strong>Delivery Partner</strong>
                        <span>Regional logistics enterprise.</span>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="sel-footer animate-fade-in-delayed" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <p>© 2026 EMAHU Inc. All professional rights reserved.</p>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
            Developed by <a href="https://sanmora.in" target="_blank" rel="noopener noreferrer" style={{ color: '#4169e1', fontWeight: '600', textDecoration: 'none' }}>sanmora.in</a>
          </p>
          <div className="sel-footer__links" style={{ marginTop: '4px' }}>
            <Link href="#help">Get Portal Support</Link>
            <span className="sel-footer__dot" />
            <Link href="#terms">Terms & Partner Conditions</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
