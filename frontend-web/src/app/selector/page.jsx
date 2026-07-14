'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './selector.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  heroContainer, heroWord, heroSubtitle, navbarReveal,
  staggerContainer, cardReveal, cardHoverProps, cardTapProps,
  howCardReveal, portalReveal, buttonHoverProps, buttonTapProps,
  floatVariant, modalOverlay, modalContent, scrollReveal,
} from '@/animations/variants';
import { useMouseParallax } from '@/animations/useAnimations';

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
  },
  {
    id: 'beauty',
    name: 'Beauty & Cosmetics',
    icon: '💄',
    desc: 'Botanical skincare serums, organic cosmetics, fragrances, and premium haircare.',
    subcategories: ['All Beauty', 'Skincare', 'Makeup', 'Fragrance', 'Haircare'],
    gradient: 'linear-gradient(135deg, rgba(217, 70, 239, 0.08) 0%, rgba(236, 72, 153, 0.08) 100%)',
    accent: '#d946ef'
  },
  {
    id: 'sports',
    name: 'Sports & Outdoors',
    icon: '⚽',
    desc: 'High-performance activewear, premium fitness gear, and outdoor expedition equipment.',
    subcategories: ['All Sports', 'Fitness Gear', 'Footwear', 'Activewear', 'Outdoor Equipment'],
    gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
    accent: '#06b6d4'
  },
  {
    id: 'books',
    name: 'Books & Stationery',
    icon: '📚',
    desc: 'Refined leather journals, premium planner notebooks, fiction, and writing tools.',
    subcategories: ['All Books', 'Fiction', 'Self-Help', 'Stationery', 'Journals'],
    gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
    accent: '#a855f7'
  },
  {
    id: 'grocery',
    name: 'Grocery & Essentials',
    icon: '🛒',
    desc: 'Organic matcha tea, healthy nuts mix, gourmet snacks, and daily kitchen pantry essentials.',
    subcategories: ['All Grocery', 'Snacks', 'Beverages', 'Pantry', 'Organic'],
    gradient: 'linear-gradient(135deg, rgba(20, 184, 166, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
    accent: '#14b8a6'
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

const sellerServesLocation = (seller, city) => {
  if (!seller) return false;
  const cityLower = (city || 'Ahmedabad').toLowerCase().trim();

  const sObj = typeof seller === 'object' ? seller : {};

  // 1. Calculate distance using coordinates from localStorage if available
  try {
    const coordsStr = typeof window !== 'undefined' ? localStorage.getItem('emahu_buyer_coordinates') : null;
    if (coordsStr) {
      const coords = JSON.parse(coordsStr);
      const bLat = parseFloat(coords.latitude);
      const bLon = parseFloat(coords.longitude);
      const sLat = parseFloat(sObj.latitude);
      const sLon = parseFloat(sObj.longitude);
      
      if (!isNaN(bLat) && !isNaN(bLon) && !isNaN(sLat) && !isNaN(sLon)) {
        // Simple Haversine calculation inline
        const R = 6371; // km
        const dLat = (sLat - bLat) * Math.PI / 180;
        const dLon = (sLon - bLon) * Math.PI / 180;
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(bLat * Math.PI / 180) * Math.cos(sLat * Math.PI / 180) * 
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        
        if (distance <= 30) {
          return true; // within 30 km delivery range!
        }
      }
    }
  } catch (err) {
    console.warn('Failed to calculate distance in sellerServesLocation:', err);
  }

  // 2. City name matching and hub matching fallback
  const sellerCity = (sObj.city || sObj.currentCity || sObj.location || '').toLowerCase().trim();
  
  if (sellerCity === cityLower) return true;
  if (sellerCity.includes(cityLower) || cityLower.includes(sellerCity)) return true;

  const coveredCities = Array.isArray(sObj.coveredCities)
    ? sObj.coveredCities.map(c => c.toLowerCase().trim())
    : [];
  if (coveredCities.includes(cityLower)) return true;

  // Hub check helper
  const AHMEDABAD_HUBS = ['ahmedabad', 'amdavad', 'ghatlodiya', 'bopal', 'maninagar', 'navrangpura', 'vastrapur', 'satellite', 'bodakdev', 'prahlad', 'chandkheda', 'motera', 'sabarmati', 'nikol', 'naranpura', 'gota', 'shela', 'thaltej', 'vastral', 'odhav', 'gandhinagar', 'sanand'];
  const DELHI_HUBS = ['delhi', 'noida', 'gurugram', 'gurgaon', 'faridabad', 'ghaziabad', 'dwarka', 'rohini'];
  const MUMBAI_HUBS = ['mumbai', 'bombay', 'thane', 'navi mumbai', 'bandra', 'andheri', 'dadar', 'kurla', 'mulund', 'worli', 'lower parel'];
  const PUNE_HUBS = ['pune', 'pimpri', 'chinchwad', 'kothrud', 'hadapsar', 'wakad', 'aundh', 'baner'];
  const BANGALORE_HUBS = ['bangalore', 'bengaluru', 'koramangala', 'indiranagar', 'whitefield', 'marathahalli', 'jayanagar', 'electronic city'];
  const KOLKATA_HUBS = ['kolkata', 'calcutta', 'salt lake', 'howrah', 'jadavpur', 'new town'];
  const HYDERABAD_HUBS = ['hyderabad', 'secunderabad', 'gachibowli', 'hitech city', 'kondapur', 'madhapur'];
  const SURAT_HUBS = ['surat', 'adajan', 'vesu', 'katargam', 'varachha', 'althan'];
  const VADODARA_HUBS = ['vadodara', 'baroda', 'alkapuri', 'manjalpur', 'waghodia'];
  const RAJKOT_HUBS = ['rajkot', 'kalavad', 'gondal'];

  const matchHub = (hubs) => {
    const userInHub = hubs.some(h => cityLower.includes(h));
    const sellerInHub = hubs.some(h => sellerCity.includes(h));
    return userInHub && sellerInHub;
  };

  if (matchHub(AHMEDABAD_HUBS)) return true;
  if (matchHub(DELHI_HUBS)) return true;
  if (matchHub(MUMBAI_HUBS)) return true;
  if (matchHub(PUNE_HUBS)) return true;
  if (matchHub(BANGALORE_HUBS)) return true;
  if (matchHub(KOLKATA_HUBS)) return true;
  if (matchHub(HYDERABAD_HUBS)) return true;
  if (matchHub(SURAT_HUBS)) return true;
  if (matchHub(VADODARA_HUBS)) return true;
  if (matchHub(RAJKOT_HUBS)) return true;

  return false;
};

// Default icon/accent palette for dynamically loaded categories
const DYNAMIC_CATEGORY_ICONS = {
  'electronics': '💻', 'tech': '💻', 'computers': '🖥️', 'mobile': '📱', 'phones': '📱',
  'shoes': '👟', 'footwear': '👟', 'kitchen': '🍳', 'dining': '🍽️', 'food': '🍔',
  'apparel': '👕', 'fashion': '👗', 'clothing': '👔', 'lifestyle': '🏠', 'home': '🏡',
  'beauty': '💄', 'cosmetics': '💅', 'sports': '⚽', 'fitness': '🏋️', 'books': '📚',
  'toys': '🧸', 'games': '🎮', 'automotive': '🚗', 'jewelry': '💍', 'watches': '⌚',
  'grocery': '🛒', 'gourmet': '🍷', 'health': '💊', 'wellness': '🧘', 'music': '🎵', 'pets': '🐾', 'pet': '🐾', 'garden': '🌱',
  'baby': '👶', 'tools': '🔧', 'hand-tools': '🔨', 'art': '🎨', 'travel': '✈️', 'stationery': '📝', 'office': '🖊️', 'outdoor': '⛺'
};
const DYNAMIC_ACCENTS = ['#0ea5e9', '#d946ef', '#14b8a6', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#e11d48', '#7c3aed'];

import { STATIC_PRODUCTS } from '@/utils/mockProducts';
import API_BASE from '@/utils/config';
import { useScrollProgress } from '@/utils/animate';

// ─── SPLIT TITLE into words for blur-reveal animation ───────────────────────
function AnimatedTitle({ text, className }) {
  const words = text.split(' ');
  return (
    <motion.h1
      className={className}
      variants={heroContainer}
      initial="hidden"
      animate="show"
      style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25em', justifyContent: 'center' }}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          variants={heroWord}
          style={{ display: 'inline-block' }}
        >
          {word}
        </motion.span>
      ))}
    </motion.h1>
  );
}

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
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState('All');
  
  // Portal & Dropdown States
  const [deliveryDropdownOpen, setDeliveryDropdownOpen] = useState(false);
  const deliveryDropdownRef = useRef(null);

  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportRole, setSupportRole] = useState('buyer');
  const [supportMsg, setSupportMsg] = useState('');
  const [supportSubmitted, setSupportSubmitted] = useState(false);

  const [selectedCity, setSelectedCity] = useState('');
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  // Mouse parallax for background blobs
  const mouseOffset = useMouseParallax(0.015);

  // Sync cart & login details on mount, and handle geolocation auto-detection
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

    const syncCity = () => {
      try {
        const storedCity = localStorage.getItem('emahu_buyer_city');
        if (storedCity) {
          setSelectedCity(storedCity);
          setHasLocationPermission(true);
        } else {
          const storedUser = localStorage.getItem('emahu_buyer_user');
          if (storedUser) {
            try {
              const parsed = JSON.parse(storedUser);
              if (parsed.city) {
                setSelectedCity(parsed.city);
                localStorage.setItem('emahu_buyer_city', parsed.city);
                setHasLocationPermission(true);
                return;
              }
            } catch (_) {}
          }
          
          if (typeof window !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                try {
                  const lat = position.coords.latitude;
                  const lon = position.coords.longitude;
                  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                  const data = await res.json();
                  if (data && data.address) {
                    const cityVal = data.address.city || data.address.town || data.address.village || data.address.state_district || '';
                    if (cityVal) {
                      const cleanCity = cityVal.replace(/District|Corporation/gi, '').trim();
                      const capitalized = cleanCity.charAt(0).toUpperCase() + cleanCity.slice(1);
                      setSelectedCity(capitalized);
                      localStorage.setItem('emahu_buyer_city', capitalized);
                      setHasLocationPermission(true);
                      window.dispatchEvent(new Event('storage'));
                    }
                  }
                } catch (err) {
                  console.warn('Geolocation reverse lookup failed:', err);
                }
              },
              (err) => {
                console.warn('Geolocation permission denied:', err);
                setHasLocationPermission(false);
              }
            );
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    syncStates();
    syncCity();
    window.addEventListener('storage', syncStates);
    window.addEventListener('storage', syncCity);
    return () => {
      window.removeEventListener('storage', syncStates);
      window.removeEventListener('storage', syncCity);
    };
  }, []);

  // Fetch dbProducts from Backend API to support live seller items
  useEffect(() => {
    const fetchDbProducts = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products`);
        const data = await res.json();
        if (data.success && data.products) {
          setDbProducts(data.products);
        }
      } catch (err) {
        console.error('Error fetching backend products:', err);
      }
    };
    fetchDbProducts();
    const interval = setInterval(fetchDbProducts, 4000);
    return () => clearInterval(interval);
  }, []);

  // Fetch dynamic categories from Backend API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories?status=approved`);
        const data = await res.json();
        if (data.success && data.data) {
          setDbCategories(data.data);
        }
      } catch (err) {
        console.error('Error fetching backend categories:', err);
      }
    };
    fetchCategories();
    const interval = setInterval(fetchCategories, 4000);
    return () => clearInterval(interval);
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

  // Merge hardcoded + dynamic backend categories for the welcome screen.
  const mergedCategories = useMemo(() => {
    // Start with a copy of the hardcoded categories
    const baseCategories = [...CATEGORIES];

    if (!dbCategories || !dbCategories.length) {
      return baseCategories;
    }
    
    let accentIdx = 0;
    
    dbCategories.forEach(dbCat => {
      const nameLC = dbCat.name.toLowerCase();
      const slug = dbCat.slug || nameLC.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      // Check if this category matches a hardcoded category by ID, slug, or name
      const existingIdx = baseCategories.findIndex(hc => 
        hc.id === slug || 
        hc.name.toLowerCase() === nameLC || 
        hc.name.toLowerCase().includes(nameLC) || 
        nameLC.includes(hc.name.toLowerCase())
      );

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

      if (existingIdx !== -1) {
        // Merge dynamic subcategories into the existing hardcoded category
        const current = baseCategories[existingIdx];
        const mergedSubcategories = Array.from(new Set([
          ...current.subcategories,
          ...subcats
        ]));

        baseCategories[existingIdx] = {
          ...current,
          subcategories: mergedSubcategories
        };
      } else {
        // Append as a new dynamic category
        baseCategories.push({
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
    
    return baseCategories;
  }, [dbCategories]);

  // Build category name → root category ID lookup for product mapping
  const categoryNameToId = useMemo(() => {
    const lookup = {};
    
    lookup['electronics'] = 'tech';
    lookup['furniture'] = 'lifestyle';
    lookup['fitness'] = 'lifestyle';
    
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
        brand: p.brand || 'Emahu Brand',
        category: cat,
        subcategory: p.subcategory || 'General',
        price: p.price,
        originalPrice: p.comparePrice || p.price,
        rating: p.rating || 4.7,
        reviews: p.reviews || 84,
        sellerName: p.seller?.name || 'Emahu Merchant',
        sellerStore: p.seller?.storeName || 'Emahu Store',
        image: isRealImage(p.image) ? cleanedImg : (p.image || '📦'),
        stock: p.stock,
        seller: p.seller
      };
    });
    
    const seen = new Set();
    const formattedStatic = STATIC_PRODUCTS.map((p, idx) => {
      const mockCities = ['Ahmedabad', 'Surat', 'Mumbai', 'Delhi', 'Bangalore', 'Kolkata', 'Vadodara'];
      const city = mockCities[idx % mockCities.length];
      const stateMap = {
        'Ahmedabad': 'Gujarat', 'Surat': 'Gujarat', 'Vadodara': 'Gujarat',
        'Mumbai': 'Maharashtra', 'Delhi': 'Delhi', 'Bangalore': 'Karnataka', 'Kolkata': 'West Bengal'
      };
      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        subcategory: p.subcategory || 'General',
        price: p.price,
        originalPrice: p.originalPrice || p.price,
        rating: p.rating || 4.7,
        reviews: p.reviews || 84,
        sellerName: p.brand,
        sellerStore: p.seller || 'Emahu Store',
        image: p.image,
        stock: 10,
        seller: {
          name: p.seller || 'Emahu Seller',
          storeName: p.seller || 'Emahu Store',
          city: city,
          state: stateMap[city],
          serviceAreaCity: city,
          serviceAreaState: stateMap[city]
        }
      };
    });

    return [...mappedDb, ...formattedStatic].filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [dbProducts, categoryNameToId]);

  // Get unique sellers for the currently selected category
  const uniqueSellers = useMemo(() => {
    if (!selectedCategory) return [];
    
    const catProducts = allProducts.filter(p => p.category === selectedCategory.id);
    
    const sellersMap = new Map();
    catProducts.forEach(p => {
      if (p.sellerStore) {
        sellersMap.set(p.sellerStore, p.sellerName || p.sellerStore);
      }
    });
    
    return Array.from(sellersMap.entries()).map(([store, name]) => ({
      storeName: store,
      merchantName: name
    }));
  }, [allProducts, selectedCategory]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return [];

    let base = allProducts.filter(p => p.category === selectedCategory.id);

    if (hasLocationPermission && selectedCity) {
      base = base.filter(p => sellerServesLocation(p.seller, selectedCity));
    } else {
      base = base.slice(0, 8);
    }

    if (activeSubcategory !== 'All' && !activeSubcategory.startsWith('All')) {
      const exactMatches = base.filter(
        p => p.subcategory && p.subcategory.toLowerCase() === activeSubcategory.toLowerCase()
      );
      if (exactMatches.length > 0) {
        base = exactMatches;
      }
    }

    if (selectedSeller !== 'All') {
      base = base.filter(p => p.sellerStore === selectedSeller);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      base = base.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query) ||
        (p.sellerName && p.sellerName.toLowerCase().includes(query)) ||
        (p.sellerStore && p.sellerStore.toLowerCase().includes(query)) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(query))
      );
    }

    return base;
  }, [selectedCategory, activeSubcategory, selectedSeller, searchQuery, allProducts, selectedCity, hasLocationPermission]);

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setActiveSubcategory('All');
    setSelectedSeller('All');
    setSearchQuery('');
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setActiveSubcategory('All');
    setSelectedSeller('All');
    setSearchQuery('');
  };

  return (
    <div className="sel-wrapper">
      {/* Background Soft Pastel Ambient Glowing Blobs — with mouse parallax */}
      <div className="sel-bg-container">
        <motion.div
          className="sel-blob sel-blob--buyer"
          style={{
            x: mouseOffset.x * -1.2,
            y: mouseOffset.y * -1.2,
          }}
        />
        <motion.div
          className="sel-blob sel-blob--seller"
          style={{
            x: mouseOffset.x * 0.8,
            y: mouseOffset.y * 0.8,
          }}
        />
        <motion.div
          className="sel-blob sel-blob--delivery"
          style={{
            x: mouseOffset.x * -0.6,
            y: mouseOffset.y * -0.6,
          }}
        />
      </div>

      {/* Main Top Header Navigation — animated fade-in from top */}
      <motion.header
        className="sel-navbar"
        variants={navbarReveal}
        initial="hidden"
        animate="show"
      >
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

          {/* Top Right Buttons */}
          <motion.div
            className="sel-nav-actions"
            variants={heroContainer}
            initial="hidden"
            animate="show"
          >
            {/* 1. Buyer Hub Button */}
            <motion.div variants={heroSubtitle} whileHover={buttonHoverProps} whileTap={buttonTapProps}>
              <Link href="/buyer/products" className="sel-nav-btn sel-nav-btn--buyer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <span>Buyer Hub</span>
              </Link>
            </motion.div>

            {/* 2. Cart Button with count badge */}
            <motion.div variants={heroSubtitle} whileHover={buttonHoverProps} whileTap={buttonTapProps}>
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
            </motion.div>

            {/* 3. Login/Signup Button */}
            <motion.div variants={heroSubtitle} whileHover={buttonHoverProps} whileTap={buttonTapProps}>
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
            </motion.div>
          </motion.div>
        </div>
      </motion.header>

        {/* SNAP SECTION 1: Welcome Header & How Emahu Works */}
        <div className="sel-snap-section sel-container">
          {/* Middle Screen Title Block — word-by-word blur reveal */}
          <motion.header
            className="sel-header animate-fade-in"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <AnimatedTitle text="EMAHU Hub Marketplace" className="sel-title" />
            <motion.p
              className="sel-subtitle"
              variants={heroSubtitle}
              initial="hidden"
              animate="show"
            >
              Search verified premium products across key retail categories, register as a merchant seller, or apply to the logistics dispatch network.
            </motion.p>
          </motion.header>

          {/* ── HOW EMAHU WORKS (SCROLL REVEAL) ── */}
          <motion.section 
            className="sel-how-section"
            variants={scrollReveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
          >
            <motion.h2
              className="sel-how-title"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              How EMAHU Hub Marketplace Works
            </motion.h2>
            <motion.p
              className="sel-how-subtitle"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            >
              EMAHU is a modern multi-portal commerce network that links local buyers, verified merchant sellers, and independent delivery partners seamlessly.
            </motion.p>

            <motion.div
              className="sel-how-grid"
              variants={staggerContainer}
            >
              {/* Step 1: Buyer Ecosystem */}
              <motion.div className="sel-how-card" variants={howCardReveal} whileHover={{ y: -6, transition: { duration: 0.3 } }}>
                <div className="sel-how-card__icon-badge" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>
                  🛒
                </div>
                <h3 className="sel-how-card__title">1. Dynamic Buyer Search</h3>
                <p className="sel-how-card__desc">
                  When buyers open the portal, the system automatically detects their location. It dynamically displays products and brands from nearby sellers. Payments are held in a secure escrow vault until delivery is completed.
                </p>
              </motion.div>

              {/* Step 2: Seller Ecosystem */}
              <motion.div className="sel-how-card" variants={howCardReveal} whileHover={{ y: -6, transition: { duration: 0.3 } }}>
                <div className="sel-how-card__icon-badge" style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b' }}>
                  🏪
                </div>
                <h3 className="sel-how-card__title">2. Merchant Shop Operations</h3>
                <p className="sel-how-card__desc">
                  Sellers register their store name, input their address, and set their delivery covered cities. Listed catalog items are approved automatically and made instantly available to buyers within the configured shipping zones.
                </p>
              </motion.div>

              {/* Step 3: Delivery Ecosystem */}
              <motion.div className="sel-how-card" variants={howCardReveal} whileHover={{ y: -6, transition: { duration: 0.3 } }}>
                <div className="sel-how-card__icon-badge" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
                  🛵
                </div>
                <h3 className="sel-how-card__title">3. Logistics OTP Verification</h3>
                <p className="sel-how-card__desc">
                  Logistics dispatchers and riders register vehicle details and track regional shipments. To release the buyer's payment from escrow to the seller, the rider enters the secure 6-digit Delivery OTP provided by the buyer upon arrival.
                </p>
              </motion.div>
            </motion.div>
          </motion.section>
        </div>

        {/* SNAP SECTION 2: Categories Explorer (The Bottom Sheet) */}
        <div className="sel-snap-section sel-container" style={{ justifyContent: 'flex-start', paddingTop: '40px' }}>
          {/* ── MIDDLE BOARD: CATEGORIES EXPLORER & SEARCH ── */}
          <motion.div 
            className="sel-explorer"
            variants={scrollReveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
          >
            {/* Bottom Sheet Drag Handle */}
            <div className="sel-sheet-handle" />

            {!selectedCategory ? (
            /* Main Categories Grid */
            <div className="sel-categories-view" style={{ minHeight: '620px', position: 'relative' }}>
              <div className="sel-categories-view-sticky-header">
                <motion.h2
                  className="sel-section-title"
                  style={{ margin: 0, paddingBottom: '20px' }}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                >
                  Explore Main Categories
                </motion.h2>
              </div>
              
              <motion.div 
                className="sel-cat-grid-scroll-wrapper"
                style={{
                  position: 'relative',
                  zIndex: 5,
                  marginTop: '20px',
                }}
              >
                <motion.div
                  className="sel-cat-grid"
                  variants={staggerContainer}
                  animate="show"
                >
                  {(showAllCategories ? mergedCategories : mergedCategories.slice(0, 6)).map((cat, idx) => (
                    <motion.button
                      key={cat.id}
                      className="sel-cat-card"
                      onClick={() => handleCategorySelect(cat)}
                      style={{
                        '--cat-accent': cat.accent,
                        '--cat-gradient': cat.gradient,
                        perspective: '1000px',
                      }}
                      variants={cardReveal}
                      whileHover={cardHoverProps}
                      whileTap={cardTapProps}
                    >
                      <div className="sel-cat-card__glow" />
                      <div className="sel-cat-card__icon">{cat.icon}</div>
                      <h3 className="sel-cat-card__title">{cat.name}</h3>
                      <p className="sel-cat-card__desc">{cat.desc}</p>
                      <div className="sel-cat-card__arrow">
                        <span>Explore</span>
                        <motion.svg
                          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                          whileHover={{ x: 4 }}
                          transition={{ duration: 0.25 }}
                        >
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </motion.svg>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>

              {/* Explore More / Show Less Button */}
              {mergedCategories.length > 6 && (
                <motion.div
                  style={{ textAlign: 'center', marginTop: '24px' }}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <motion.button
                    onClick={() => setShowAllCategories(!showAllCategories)}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 28px',
                      borderRadius: '50px',
                      border: '2px solid rgba(99,102,241,0.3)',
                      background: showAllCategories
                        ? 'rgba(99,102,241,0.08)'
                        : 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.12) 100%)',
                      color: '#6366f1',
                      fontWeight: '700',
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      letterSpacing: '0.01em'
                    }}
                  >
                    {showAllCategories ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="18 15 12 9 6 15" />
                        </svg>
                        Show Less
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                        Explore More Categories ({mergedCategories.length - 6} more)
                      </>
                    )}
                  </motion.button>
                </motion.div>
              )}
            </div>
          ) : (
            /* Subcategory & Search Section */
            <motion.div
              className="sel-subcategory-view animate__animated animate__slideInUp"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Back to main categories */}
              <div className="sel-view-controls">
                <motion.button
                  className="sel-back-btn"
                  onClick={handleBackToCategories}
                  whileHover={{ scale: 1.03, x: -2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  <span>Back to Categories</span>
                </motion.button>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span className="sel-active-path" style={{ margin: 0 }}>
                    Collections /
                  </span>
                  <select
                    value={selectedCategory.id}
                    onChange={(e) => {
                      const found = mergedCategories.find(c => c.id === e.target.value);
                      if (found) handleCategorySelect(found);
                    }}
                    style={{
                      background: 'rgba(99, 102, 241, 0.05)',
                      border: '1px solid rgba(99, 102, 241, 0.15)',
                      borderRadius: '10px',
                      padding: '6px 12px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      color: '#6366f1',
                      cursor: 'pointer',
                      outline: 'none',
                      boxShadow: '0 2px 8px rgba(99, 102, 241, 0.04)'
                    }}
                  >
                    {mergedCategories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subcategories Selector Row */}
              <div className="sel-subcat-row-container">
                <div className="sel-subcat-row">
                  {selectedCategory.subcategories.map((sub) => {
                    const isAll = sub.startsWith('All');
                    const isActive = isAll ? (activeSubcategory === 'All') : (activeSubcategory === sub);
                    return (
                      <motion.button
                        key={sub}
                        className={`sel-subcat-pill ${isActive ? 'sel-subcat-pill--active' : ''}`}
                        onClick={() => {
                          setActiveSubcategory(isAll ? 'All' : sub);
                        }}
                        style={{
                          '--pill-accent': selectedCategory.accent
                        }}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                      >
                        {sub}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Central Searchbar & Seller Filter Controls */}
              <div className="sel-controls-row">
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

                <div className="sel-seller-filter-wrapper">
                  <select
                    className="sel-seller-select"
                    value={selectedSeller}
                    onChange={(e) => setSelectedSeller(e.target.value)}
                  >
                    <option value="All">All Sellers / Shops</option>
                    {uniqueSellers.map(s => (
                      <option key={s.storeName} value={s.storeName}>
                        {s.storeName} ({s.merchantName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Products Catalog Grid */}
              <div className="sel-product-container">
                <h3 className="sel-product-grid-title">
                  {searchQuery ? `Search Results for "${searchQuery}"` : `${activeSubcategory} Catalog`}
                  <span className="sel-product-count">({filteredProducts.length} items)</span>
                </h3>

                {filteredProducts.length > 0 ? (
                  <motion.div
                    className="sel-product-grid"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                  >
                    {filteredProducts.map((p) => (
                      <motion.div
                        key={p.id}
                        variants={cardReveal}
                        whileHover={{ scale: 1.02, y: -5, transition: { duration: 0.28 } }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Link
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
                            {/* Company Brand and Subcategory Row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span className="sel-prod-card__brand">{p.brand}</span>
                              <span style={{ fontSize: '0.72rem', color: '#475569', background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                                {p.subcategory}
                              </span>
                            </div>

                            <h4 className="sel-prod-card__title">{p.name}</h4>
                            
                            {/* Rating details */}
                            <Stars rating={p.rating} reviews={p.reviews} />
                            
                            {/* Seller & Shop details */}
                            <div className="sel-prod-card__seller-info" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '8px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginTop: '2px' }}>
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                <span>Shop: <strong>{p.sellerStore}</strong></span>
                                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Company: {p.sellerName}</span>
                              </div>
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
                      </motion.div>
                    ))}
                  </motion.div>
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
            </motion.div>
          )}
          </motion.div>
        </div>

      {/* SNAP SECTION 3: Portals & Footer */}
      <div className="sel-snap-section sel-container">
        {/* ── DOWNSIDE PORTAL: MERCHANT SELLER & DELIVERY PARTNER ACTIONS ── */}
        <motion.div
          className="sel-portals animate-fade-in-delayed"
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.h2
            className="sel-portals-title"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            Emahu Business Hubs
          </motion.h2>
          
          <motion.div
            className="sel-portals-grid"
            variants={staggerContainer}
          >
            {/* Option 1: Merchant / Seller */}
            <motion.div
              className="sel-portal-box sel-portal-box--seller"
              variants={portalReveal}
              whileHover={{ y: -6, scale: 1.01, transition: { duration: 0.3 } }}
            >
              <div className="sel-portal-box__icon">🏪</div>
              <h3 className="sel-portal-box__title">Shop Seller Portal</h3>
              <p className="sel-portal-box__desc">
                Whether you sell from home or run a large business list your products, manage stock, set delivery charges, and start growing your sales on EMAHU today.
              </p>
              <motion.div whileHover={buttonHoverProps} whileTap={buttonTapProps}>
                <Link href="/seller" className="sel-portal-btn sel-portal-btn--seller">
                  <span>Enter Seller Hub</span>
                  <motion.svg
                    width="16" height="16" viewBox="0 0 16 16" fill="none"
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.25 }}
                  >
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </motion.svg>
                </Link>
              </motion.div>
            </motion.div>

            {/* Option 2: Delivery Partner Options */}
            <motion.div
              className="sel-portal-box sel-portal-box--delivery"
              ref={deliveryDropdownRef}
              variants={portalReveal}
              whileHover={{ y: -6, scale: 1.01, transition: { duration: 0.3 } }}
            >
              <div className="sel-portal-box__icon">🚚</div>
              <h3 className="sel-portal-box__title">Dehlivery Partner Portal</h3>
              <p className="sel-portal-box__desc">
                Register dispatch assets, coordinate local city orders, and manage last-mile transport logistics.
              </p>
              
              <div className="sel-delivery-dropdown-container">
                <motion.button 
                  className={`sel-portal-btn sel-portal-btn--delivery ${deliveryDropdownOpen ? 'sel-portal-btn--active' : ''}`}
                  onClick={() => setDeliveryDropdownOpen(!deliveryDropdownOpen)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span>Access Logistics Hub</span>
                  <motion.svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5"
                    animate={{ rotate: deliveryDropdownOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </motion.svg>
                </motion.button>

                <AnimatePresence>
                  {deliveryDropdownOpen && (
                    <motion.div
                      className="sel-delivery-dropdown-menu"
                      initial={{ opacity: 0, y: -10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    >
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <motion.footer
          className="sel-footer animate-fade-in-delayed"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >
          <p>© 2026 EMAHU Inc. All professional rights reserved.</p>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
            Developed by <a href="https://sanmora.in" target="_blank" rel="noopener noreferrer" style={{ color: '#4169e1', fontWeight: '600', textDecoration: 'none' }}>sanmora.in</a>
          </p>
          <div className="sel-footer__links" style={{ marginTop: '4px' }}>
            <a href="#" onClick={(e) => { e.preventDefault(); setIsSupportModalOpen(true); setSupportSubmitted(false); }} style={{ color: '#64748b', textDecoration: 'none', cursor: 'pointer', transition: 'color 0.2s' }}>Get Portal Support</a>
            <span className="sel-footer__dot" />
            <a href="#" onClick={(e) => { e.preventDefault(); setIsTermsModalOpen(true); }} style={{ color: '#64748b', textDecoration: 'none', cursor: 'pointer', transition: 'color 0.2s' }}>Terms & Partner Conditions</a>
          </div>
        </motion.footer>
      </div>

      {/* ── INTERACTIVE PORTAL SUPPORT MODAL ── */}
      <AnimatePresence>
        {isSupportModalOpen && (
          <motion.div
            variants={modalOverlay}
            initial="hidden"
            animate="show"
            exit="exit"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(8px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <motion.div
              variants={modalContent}
              initial="hidden"
              animate="show"
              exit="exit"
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '520px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                maxHeight: '90vh'
              }}
            >
              {/* Header */}
              <div style={{
                padding: '24px 28px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>🛠️ Portal Help & Support</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>EMAHU Platform Services Center</p>
                </div>
                <motion.button 
                  onClick={() => setIsSupportModalOpen(false)}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </motion.button>
              </div>

              {/* Content Body */}
              <div style={{ padding: '28px', overflowY: 'auto', flexGrow: 1 }}>
                {supportSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ textAlign: 'center', padding: '20px 0' }}
                  >
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#059669', margin: '0 0 8px 0' }}>Request Submitted!</h4>
                    <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0, lineHeight: 1.6 }}>
                      Thank you, <strong>{supportName}</strong>. Our support desk has received your ticket regarding your <strong>{supportRole}</strong> account. We will contact you at <strong>{supportEmail}</strong> within 2 hours.
                    </p>
                    <motion.button
                      onClick={() => setIsSupportModalOpen(false)}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        marginTop: '24px',
                        padding: '12px 28px',
                        background: '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(15,23,42,0.15)'
                      }}
                    >
                      Done
                    </motion.button>
                  </motion.div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); setSupportSubmitted(true); }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>Your Full Name</label>
                        <input 
                          type="text" 
                          required
                          placeholder="John Doe"
                          value={supportName}
                          onChange={(e) => setSupportName(e.target.value)}
                          style={{ height: '44px', padding: '0 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>Email Address</label>
                        <input 
                          type="email" 
                          required
                          placeholder="john@example.com"
                          value={supportEmail}
                          onChange={(e) => setSupportEmail(e.target.value)}
                          style={{ height: '44px', padding: '0 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>Your Role / Portal</label>
                        <select 
                          value={supportRole}
                          onChange={(e) => setSupportRole(e.target.value)}
                          style={{ height: '44px', padding: '0 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#fff' }}
                        >
                          <option value="buyer">Buyer / Customer</option>
                          <option value="seller">Merchant Seller</option>
                          <option value="delivery">Delivery Partner / Dispatcher</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>Message / Help needed</label>
                        <textarea 
                          required
                          rows="4"
                          placeholder="Describe your issue or question in detail..."
                          value={supportMsg}
                          onChange={(e) => setSupportMsg(e.target.value)}
                          style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit' }}
                        />
                      </div>

                      <motion.button
                        type="submit"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          height: '48px',
                          background: '#6366f1',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '12px',
                          fontWeight: '700',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(99,102,241,0.2)',
                          transition: 'all 0.2s',
                          marginTop: '8px'
                        }}
                      >
                        Submit Ticket
                      </motion.button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── INTERACTIVE TERMS AND CONDITIONS MODAL ── */}
      <AnimatePresence>
        {isTermsModalOpen && (
          <motion.div
            variants={modalOverlay}
            initial="hidden"
            animate="show"
            exit="exit"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(8px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <motion.div
              variants={modalContent}
              initial="hidden"
              animate="show"
              exit="exit"
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '640px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                maxHeight: '85vh'
              }}
            >
              {/* Header */}
              <div style={{
                padding: '24px 28px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>📜 Terms & Partner Conditions</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>EMAHU Platform Legal Agreement</p>
                </div>
                <motion.button 
                  onClick={() => setIsTermsModalOpen(false)}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </motion.button>
              </div>

              {/* Document body */}
              <div style={{ padding: '28px', overflowY: 'auto', fontSize: '0.875rem', color: '#334155', lineHeight: '1.6', flexGrow: 1 }}>
                <h4 style={{ color: '#0f172a', fontWeight: '800', margin: '0 0 8px 0' }}>1. General Overview</h4>
                <p style={{ margin: '0 0 16px 0' }}>
                  EMAHU Hub Marketplace functions as a decentralized local retail connector linking independent customers, registered stores, and third-party logistics dispatchers. By entering any platform portal, you agree to these legal conditions.
                </p>

                <h4 style={{ color: '#0f172a', fontWeight: '800', margin: '0 0 8px 0' }}>2. Buyer Protection & Escrow Holding</h4>
                <p style={{ margin: '0 0 16px 0' }}>
                  Payments executed during checkout are securely managed by the EMAHU Team holding account. Funds are released to the merchant only after delivery is successfully verified by entering the correct 6-digit OTP code at the buyer's shipping address.
                </p>

                <h4 style={{ color: '#0f172a', fontWeight: '800', margin: '0 0 8px 0' }}>3. Merchant Seller Policies</h4>
                <p style={{ margin: '0 0 16px 0' }}>
                  Sellers must supply physical store addresses and accurate regional coordinates. It is the seller's responsibility to set valid deliverable states and cities. Listing illegal, mislabeled, or out-of-stock items will lead to store suspension.
                </p>

                <h4 style={{ color: '#0f172a', fontWeight: '800', margin: '0 0 8px 0' }}>4. Delivery Logistics Conduct</h4>
                <p style={{ margin: '0 0 16px 0' }}>
                   Regional delivery riders are independent contractors. They must operate in verified local coordinates and confirm arrival with the buyer. Releasing cash settlements requires successful submission of the buyer's unique Delivery OTP on the application.
                </p>
              </div>

              {/* Footer buttons */}
              <div style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
                <motion.button
                  onClick={() => setIsTermsModalOpen(false)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '10px 24px',
                    background: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '750',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Close Agreement
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
