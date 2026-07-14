'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BuyerHeader from '@/components/buyer_home/buyer_header';
import { logAnalyticsEvent } from '@/utils/analytics';
import './products.css';

import { STATIC_PRODUCTS } from '@/utils/mockProducts';

/* ─── DATA ─── */
const CATEGORY_IMAGES = {
  'electronics & tech': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80',
  'apparel & fashion': 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&q=80',
  'shoes & footwear': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
  'kitchen & dining': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80',
  'lifestyle & home': 'https://images.unsplash.com/photo-1608181831718-c9e37e3b9d70?w=400&q=80',
  'beauty & cosmetics': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80',
  'sports & outdoors': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&q=80',
  'books & stationery': 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&q=80',
  'grocery & essentials': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
  'toys & games': 'https://images.unsplash.com/photo-1539627831859-a911cf04d3cd?w=400&q=80',
  'health & wellness': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80',
  'pet supplies': 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=400&q=80',
  'baby care': 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400&q=80',
  'automotive & tools': 'https://images.unsplash.com/photo-1530047139112-0494193b0148?w=400&q=80'
};

const FALLBACK_CATEGORY_TILES = [
  { label: 'Electronics & Tech', value: 'Electronics & Tech', img: CATEGORY_IMAGES['electronics & tech'] },
  { label: 'Apparel & Fashion', value: 'Apparel & Fashion', img: CATEGORY_IMAGES['apparel & fashion'] },
  { label: 'Shoes & Footwear', value: 'Shoes & Footwear', img: CATEGORY_IMAGES['shoes & footwear'] },
  { label: 'Kitchen & Dining', value: 'Kitchen & Dining', img: CATEGORY_IMAGES['kitchen & dining'] },
  { label: 'Lifestyle & Home', value: 'Lifestyle & Home', img: CATEGORY_IMAGES['lifestyle & home'] },
  { label: 'Beauty & Cosmetics', value: 'Beauty & Cosmetics', img: CATEGORY_IMAGES['beauty & cosmetics'] },
  { label: 'Sports & Outdoors', value: 'Sports & Outdoors', img: CATEGORY_IMAGES['sports & outdoors'] },
  { label: 'Books & Stationery', value: 'Books & Stationery', img: CATEGORY_IMAGES['books & stationery'] },
  { label: 'Grocery & Essentials', value: 'Grocery & Essentials', img: CATEGORY_IMAGES['grocery & essentials'] }
];

const ALL_PRODUCTS = STATIC_PRODUCTS;


const cleanImageUrl = (img) => {
  if (!img || typeof img !== 'string') return '';
  let clean = img.trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }
  if (clean.startsWith('[') && clean.endsWith(']')) {
    try {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return cleanImageUrl(parsed[0]);
      }
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

function Stars({ rating }) {
  return (
    <div className="bp-card__stars">
      {[1,2,3,4,5].map(s => (
        <svg key={s} className={`bp-star ${s <= Math.round(rating) ? '' : 'bp-star--empty'}`} viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  );
}

function getPaginationRange(currentPage, totalPages) {
  const delta = 2;
  const range = [];
  const rangeWithDots = [];
  let l;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
      range.push(i);
    }
  }

  for (let i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l > 2) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    l = i;
  }

  return rangeWithDots;
}

export default function ProductsPage() {
  const router = useRouter();
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  useEffect(() => {
    setIsUserLoggedIn(!!localStorage.getItem('emahu_buyer_token'));
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      const goOnline = () => setIsOffline(false);
      const goOffline = () => setIsOffline(true);
      window.addEventListener('online', goOnline);
      window.addEventListener('offline', goOffline);
      return () => {
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
      };
    }
  }, []);

  const [category, setCategory]           = useState('All');
  const [activeSubcategory, setActiveSubcategory] = useState('All');
  const [sortBy, setSortBy]               = useState('popular');
  const [maxPrice, setMaxPrice]           = useState(160000);
  const [maxPriceLimit, setMaxPriceLimit] = useState(160000);
  const [brands, setBrands]               = useState([]);
  const [showVerified, setShowVerified]   = useState(false);
  const [showOnSale, setShowOnSale]       = useState(false);
  const [showNew, setShowNew]             = useState(false);
  const [viewMode, setViewMode]           = useState('grid');
  const [wishlist, setWishlist]           = useState([]);
  const [selectedCity, setSelectedCity]   = useState('Ahmedabad');
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const locationDropdownRef               = useRef(null);
  const [cartAdded, setCartAdded]         = useState([]);
  const [searchQuery, setSearchQuery]     = useState('');
  const [page, setPage]                   = useState(1);
  const [dbProducts, setDbProducts]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [categoryTiles, setCategoryTiles] = useState(FALLBACK_CATEGORY_TILES);
  const [categoryParentMap, setCategoryParentMap] = useState({});

  // Category Slider Scroll Hooks & Logic
  const catRowRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const updateScrollButtons = () => {
    if (catRowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = catRowRef.current;
      setShowLeftArrow(scrollLeft > 5);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  const scrollCategories = (direction) => {
    if (catRowRef.current) {
      const scrollAmount = 360; // scroll by 2 tiles roughly
      catRowRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const row = catRowRef.current;
    if (row) {
      updateScrollButtons();
      row.addEventListener('scroll', updateScrollButtons);
      window.addEventListener('resize', updateScrollButtons);
      return () => {
        row.removeEventListener('scroll', updateScrollButtons);
        window.removeEventListener('resize', updateScrollButtons);
      };
    }
  }, [categoryTiles]);

  // Lock body scroll when mobile filter drawer is open
  useEffect(() => {
    if (showMobileFilters) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMobileFilters]);

  // Fetch dynamic categories for buyer search page
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/categories?status=approved`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          // Dynamic category-parent mapping traversal
          const parentMap = {};
          const traverse = (cats, rootName) => {
            cats.forEach(cat => {
              parentMap[cat.name.toLowerCase()] = rootName || cat.name;
              if (cat.children && cat.children.length > 0) {
                traverse(cat.children, rootName || cat.name);
              }
            });
          };
          traverse(data.data, null);
          setCategoryParentMap(parentMap);

          const seenValues = new Set();
          const mapped = data.data.map(cat => {
            const nameLC = cat.name.toLowerCase();
            let img = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80'; // default
            for (const [key, url] of Object.entries(CATEGORY_IMAGES)) {
              if (nameLC.includes(key) || key.includes(nameLC)) {
                img = url;
                break;
              }
            }
            
            // Normalize values so filtering is robust and aligns with products page categories
            let mappedValue = cat.name;
            const cleanCat = mappedValue.toLowerCase();
            if (parentMap[cleanCat]) {
              mappedValue = parentMap[cleanCat];
            } else {
              if (cleanCat === 'electronics' || cleanCat === 'tech' || cleanCat === 'tech & gadgets') {
                mappedValue = 'Electronics & Tech';
              } else if (cleanCat === 'apparel' || cleanCat === 'fashion') {
                mappedValue = 'Apparel & Fashion';
              } else if (cleanCat === 'shoes') {
                mappedValue = 'Shoes & Footwear';
              } else if (cleanCat === 'kitchen') {
                mappedValue = 'Kitchen & Dining';
              } else if (cleanCat === 'lifestyle' || cleanCat === 'fitness' || cleanCat === 'furniture') {
                mappedValue = 'Lifestyle & Home';
              } else if (cleanCat === 'grocery' || cleanCat === 'groceries') {
                mappedValue = 'Grocery & Essentials';
              }
            }
            const formattedLabel = mappedValue.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            return {
              label: formattedLabel,
              value: mappedValue,
              img
            };
          }).filter(tile => {
            if (seenValues.has(tile.value)) return false;
            seenValues.add(tile.value);
            return true;
          });
          setCategoryTiles(mapped);
        } else {
          setCategoryTiles(FALLBACK_CATEGORY_TILES);
        }
      } catch (err) {
        console.error('Error fetching categories in buyer products:', err);
        setCategoryTiles(FALLBACK_CATEGORY_TILES);
      }
    };
    fetchCategories();
  }, []);

  // Fetch products from database
  useEffect(() => {
    const fetchDbProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products`);
        const data = await res.json();
        if (data.success) {
          setDbProducts(data.products);
        }
      } catch (err) {
        console.error('Error fetching backend products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDbProducts();
  }, []);

  // Format database products to match buyer product dashboard structure
  const formattedDbProducts = useMemo(() => {
    return dbProducts.map(p => {
      // Smart category mapping to align dynamic categories
      let mappedCategory = p.category || 'Lifestyle & Home';
      const cleanCat = mappedCategory.toLowerCase();
      if (categoryParentMap[cleanCat]) {
        mappedCategory = categoryParentMap[cleanCat];
      } else {
        const catLC = mappedCategory.toLowerCase();
        if (catLC === 'electronics' || catLC === 'tech' || catLC === 'tech & gadgets') {
          mappedCategory = 'Electronics & Tech';
        } else if (catLC === 'apparel' || catLC === 'fashion') {
          mappedCategory = 'Apparel & Fashion';
        } else if (catLC === 'shoes') {
          mappedCategory = 'Shoes & Footwear';
        } else if (catLC === 'kitchen') {
          mappedCategory = 'Kitchen & Dining';
        } else if (catLC === 'lifestyle' || catLC === 'fitness' || catLC === 'furniture') {
          mappedCategory = 'Lifestyle & Home';
        } else if (catLC === 'grocery' || catLC === 'groceries') {
          mappedCategory = 'Grocery & Essentials';
        }
      }

      const cleanedImg = cleanImageUrl(p.image);
      const imageToShow = isRealImage(p.image) ? cleanedImg : (p.image || '📦');

      return {
        id: p.id || p._id,
        name: p.name,
        brand: p.brand || p.seller?.name || 'Emahu Seller',
        category: mappedCategory,
        subcategory: p.subcategory || 'General',
        price: p.price,
        original: p.comparePrice || p.price,
        discount: p.comparePrice ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100) : 0,
        rating: p.rating || 4.7,
        reviews: p.reviews || 84,
        img: imageToShow,
        stock: p.stock,
        status: p.status,
        verified: true,
        isNew: true,
        isHot: false,
        onSale: p.comparePrice ? (p.price < p.comparePrice) : false,
        seller: p.seller,
        sellerStore: p.seller?.storeName || 'Emahu Store',
        sellerName: p.seller?.name || 'Emahu Merchant'
      };
    });
  }, [dbProducts, categoryParentMap]);

  // Combine database products (shown at top) with default static ones
  const allProductsCombined = useMemo(() => {
    const formattedStatic = ALL_PRODUCTS.map((p, idx) => {
      let mappedCategory = p.category || 'Lifestyle & Home';
      const catLC = mappedCategory.toLowerCase();
      if (catLC === 'electronics' || catLC === 'tech' || catLC === 'tech & gadgets') {
        mappedCategory = 'Electronics & Tech';
      } else if (catLC === 'apparel' || catLC === 'fashion') {
        mappedCategory = 'Apparel & Fashion';
      } else if (catLC === 'shoes') {
        mappedCategory = 'Shoes & Footwear';
      } else if (catLC === 'kitchen') {
        mappedCategory = 'Kitchen & Dining';
      } else if (catLC === 'lifestyle' || catLC === 'fitness' || catLC === 'furniture') {
        mappedCategory = 'Lifestyle & Home';
      } else if (catLC === 'grocery' || catLC === 'groceries') {
        mappedCategory = 'Grocery & Essentials';
      }

      let mockCity = 'Ahmedabad';
      const mod = idx % 6;
      if (mod === 0) mockCity = 'Ahmedabad';
      else if (mod === 1) mockCity = 'Delhi';
      else if (mod === 2) mockCity = 'Mumbai';
      else if (mod === 3) mockCity = 'Bangalore';
      else if (mod === 4) mockCity = 'Kolkata';
      else if (mod === 5) {
        if (idx % 12 === 5) mockCity = 'Gandhinagar';
        else mockCity = 'Vadodara';
      }

      return {
        ...p,
        category: mappedCategory,
        sellerStore: p.seller || 'Emahu Store',
        sellerName: p.brand,
        seller: {
          ...p.seller,
          city: mockCity,
          currentCity: mockCity
        }
      };
    });
    return [...formattedDbProducts, ...formattedStatic];
  }, [formattedDbProducts]);

  // Helper: does this seller serve the selected city?
  const sellerServesLocation = (seller, city) => {
    if (!seller) return false;
    const cityLower = (city || 'Ahmedabad').toLowerCase().trim();

    // All India buyer selection shows all products
    if (cityLower === 'all india' || cityLower === 'india') return true;

    if (typeof seller === 'string') return true;

    // 1. Calculate distance using coordinates from localStorage if available
    try {
      const coordsStr = typeof window !== 'undefined' ? localStorage.getItem('emahu_buyer_coordinates') : null;
      if (coordsStr) {
        const coords = JSON.parse(coordsStr);
        const bLat = parseFloat(coords.latitude);
        const bLon = parseFloat(coords.longitude);
        const sLat = parseFloat(seller.latitude);
        const sLon = parseFloat(seller.longitude);
        
        if (!isNaN(bLat) && !isNaN(bLon) && !isNaN(sLat) && !isNaN(sLon)) {
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
            return true;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to calculate distance in sellerServesLocation:', err);
    }

    const sellerCity = (seller.city || seller.currentCity || seller.location || seller.address || '').toLowerCase().trim();
    
    // Check if seller delivers to All India/India (coveredCities has All India)
    const coveredCities = Array.isArray(seller.coveredCities)
      ? seller.coveredCities.map(c => c.toLowerCase().trim())
      : [];
    if (coveredCities.includes('all india') || coveredCities.includes('india')) return true;

    // Exact or contains match on city
    if (sellerCity === cityLower) return true;
    if (sellerCity.includes(cityLower) || cityLower.includes(sellerCity)) return true;

    // Buyer city specifically in covered cities
    if (coveredCities.includes(cityLower) || coveredCities.some(c => cityLower.includes(c) || c.includes(cityLower))) return true;

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

  // Filter products by selected buyer location first
  const locationFilteredProducts = useMemo(() => {
    return allProductsCombined.filter(p => sellerServesLocation(p.seller, selectedCity));
  }, [allProductsCombined, selectedCity]);

  // Dynamic brand cleanup effect to reset selected brands not available in the new location
  useEffect(() => {
    const availableBrandsInNewCity = new Set(locationFilteredProducts.map(p => p.brand).filter(Boolean));
    setBrands(prev => prev.filter(b => availableBrandsInNewCity.has(b)));
    setPage(1);
  }, [selectedCity, locationFilteredProducts]);

  // Dynamically update maxPriceLimit based on all products in database and static catalog
  useEffect(() => {
    if (allProductsCombined.length > 0) {
      const highestPrice = Math.max(...allProductsCombined.map(p => p.price || 0));
      // Round up to nearest 10,000 for clean steps
      const roundedMax = Math.ceil(highestPrice / 10000) * 10000;
      const finalMaxLimit = roundedMax || 160000;
      
      setMaxPriceLimit(finalMaxLimit);
      setMaxPrice(prev => {
        if (prev === 160000 || prev > finalMaxLimit) {
          return finalMaxLimit;
        }
        return prev;
      });
    }
  }, [allProductsCombined]);

  // Sync state on mount
  useEffect(() => {
    try {
      const storedWish = localStorage.getItem('emahu_wishlist');
      if (storedWish) {
        const parsedWish = JSON.parse(storedWish);
        setTimeout(() => setWishlist(parsedWish), 0);
      }
      
      const storedCart = localStorage.getItem('emahu_cart');
      if (storedCart) {
        const parsed = JSON.parse(storedCart);
        setTimeout(() => setCartAdded(parsed.map(x => typeof x === 'object' ? x.id : x)), 0);
      }

      const storedCity = localStorage.getItem('emahu_buyer_city');
      if (storedCity) {
        setSelectedCity(storedCity);
      } else {
        const storedUser = localStorage.getItem('emahu_buyer_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed.city) {
            setSelectedCity(parsed.city);
            localStorage.setItem('emahu_buyer_city', parsed.city);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Sync selected city on storage changes & close dropdown on click outside
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const storedCity = localStorage.getItem('emahu_buyer_city');
        if (storedCity) {
          setSelectedCity(storedCity);
        } else {
          const storedUser = localStorage.getItem('emahu_buyer_user');
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (parsed.city) {
              setSelectedCity(parsed.city);
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    const handleClickOutside = (e) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target)) {
        setLocationDropdownOpen(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCityChange = (city) => {
    setSelectedCity(city);
    localStorage.setItem('emahu_buyer_city', city);
    window.dispatchEvent(new Event('storage'));
    setPage(1);
  };

  const addToCart = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUserLoggedIn) {
      router.push('/buyer/login');
      return;
    }
    if (cartAdded.includes(id)) return;
    
    setCartAdded(prev => [...prev, id]);

    try {
      const storedCartStr = localStorage.getItem('emahu_cart') || '[]';
      const storedCart = JSON.parse(storedCartStr);
      if (!storedCart.some(x => (typeof x === 'object' ? x.id : x) === id)) {
        storedCart.push({ id, quantity: 1, color: 'Default', size: 'Default' });
        localStorage.setItem('emahu_cart', JSON.stringify(storedCart));
        window.dispatchEvent(new Event('storage'));

        // Log analytics event
        const prod = allProductsCombined.find(p => p.id === id || p._id === id);
        if (prod) {
          logAnalyticsEvent({
            type: 'add_to_cart',
            productId: id,
            sellerId: prod.seller?._id || prod.seller?.id || prod.seller
          });
        }
      }
    } catch (err) {
      console.error(err);
    }

    setTimeout(() => setCartAdded(prev => prev.filter(x => x !== id)), 2000);
  };
  const PER_PAGE = 9;

  const toggleBrand = b =>
    setBrands(p => p.includes(b) ? p.filter(x => x !== b) : [...p, b]);
  const toggleWishlist = id => {
    if (!isUserLoggedIn) {
      router.push('/buyer/login');
      return;
    }
    const next = wishlist.includes(id) ? wishlist.filter(x => x !== id) : [...wishlist, id];
    setWishlist(next);
    try {
      localStorage.setItem('emahu_wishlist', JSON.stringify(next));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error(err);
    }
  };

  const clearAll = () => {
    setCategory('All'); setActiveSubcategory('All'); setMaxPrice(maxPriceLimit); setBrands([]);
    setShowVerified(false); setShowOnSale(false); setShowNew(false);
    setSearchQuery(''); setPage(1);
  };

  /* Active tags for the pills row */
  const activeTags = useMemo(() => {
    const tags = [];
    if (searchQuery.trim())  tags.push({ label: `Search: "${searchQuery}"`, clear: () => setSearchQuery('') });
    if (category !== 'All') tags.push({ label: category, clear: () => setCategory('All') });
    if (showVerified)        tags.push({ label: 'Verified', clear: () => setShowVerified(false) });
    if (showOnSale)          tags.push({ label: 'On Sale',  clear: () => setShowOnSale(false) });
    if (showNew)             tags.push({ label: 'New In',   clear: () => setShowNew(false) });
    brands.forEach(b => tags.push({ label: b, clear: () => toggleBrand(b) }));
    if (maxPrice < maxPriceLimit)   tags.push({ label: `Under ₹${maxPrice.toLocaleString('en-IN')}`, clear: () => setMaxPrice(maxPriceLimit) });
    return tags;
  }, [category, showVerified, showOnSale, showNew, brands, maxPrice, maxPriceLimit, searchQuery]);

  // Collect unique subcategories for the active category
  const availableSubcategories = useMemo(() => {
    const base = category === 'All' ? locationFilteredProducts : locationFilteredProducts.filter(p => p.category === category);
    const subs = Array.from(new Set(base.map(p => p.subcategory).filter(s => s && s !== 'General')));
    return subs;
  }, [locationFilteredProducts, category]);

  const filtered = useMemo(() => {
    let items = [...locationFilteredProducts];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(q))
      );
    }
    if (category !== 'All')            items = items.filter(p => p.category === category);
    if (activeSubcategory !== 'All')   items = items.filter(p => p.subcategory === activeSubcategory);
    if (showVerified)                  items = items.filter(p => p.verified);
    if (showOnSale)                    items = items.filter(p => p.onSale);
    if (showNew)                       items = items.filter(p => p.isNew);
    if (brands.length)                 items = items.filter(p => brands.includes(p.brand));
    items = items.filter(p => p.price <= maxPrice);
    if (sortBy === 'price-asc')  items.sort((a,b) => a.price - b.price);
    if (sortBy === 'price-desc') items.sort((a,b) => b.price - a.price);
    if (sortBy === 'rating')     items.sort((a,b) => b.rating - a.rating);
    if (sortBy === 'discount')   items.sort((a,b) => b.discount - a.discount);
    if (sortBy === 'newest')     items.sort((a,b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    return items;
  }, [locationFilteredProducts, category, activeSubcategory, showVerified, showOnSale, showNew, brands, maxPrice, sortBy, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged      = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const catCount   = v => v === 'All' ? locationFilteredProducts.length : locationFilteredProducts.filter(p => p.category === v).length;

  return (
    <div className="bp-page">
      <BuyerHeader />

      {/* Breadcrumb */}
      <nav className="bp-breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/buyer/products">Buyer</Link>
        <span>/</span>
        <span style={{ color: '#1a1a1a' }}>Collection</span>
      </nav>

      {/* Hero + Category tiles */}
      <div className="bp-hero">
        <h1 className="bp-hero__title">
          {category === 'All' ? 'All Products' : (categoryTiles.find(c => c.value === category)?.label || category)}
        </h1>

      </div>

      {/* Amazon-style Search Bar */}
      <div className="amazon-search-container">
        <div className="amazon-search-bar">
          <div className="amazon-search-select-wrap">
            <select 
              className="amazon-search-select"
              value={category}
              onChange={e => { setCategory(e.target.value); setActiveSubcategory('All'); setPage(1); }}
            >
              <option value="All">All Departments</option>
              {categoryTiles.map(tile => (
                <option key={tile.value} value={tile.value}>{tile.label}</option>
              ))}
            </select>
            <span className="amazon-search-select-arrow">▼</span>
          </div>
          
          <div className="amazon-search-input-wrap">
            <input
              type="text"
              className="amazon-search-input"
              placeholder="Search products by name, brand or category..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            />
            {searchQuery && (
              <button className="amazon-search-clear" onClick={() => { setSearchQuery(''); setPage(1); }} aria-label="Clear search">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
          
          <button className="amazon-search-submit-btn" aria-label="Submit Search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="bp-divider" />

      {/* Meta bar */}
      <div className="bp-metabar">
        <span className="bp-metabar__count">
          {filtered.length} of {locationFilteredProducts.length} results
        </span>
        <div className="bp-metabar__right">
          <button className="bp-filter-toggle-btn" onClick={() => setShowMobileFilters(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filters
          </button>
          <span className="bp-metabar__sort-label">Sort By</span>
          <select className="bp-sort-select" value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }}>
            <option value="popular">Relevance</option>
            <option value="newest">Newest First</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
            <option value="rating">Top Rated</option>
            <option value="discount">Best Discount</option>
          </select>
          <div className="bp-view-toggle">
            <button
              className={`bp-view-btn ${viewMode==='list'?'bp-view-btn--active':''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <button
              className={`bp-view-btn ${viewMode==='grid'?'bp-view-btn--active':''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="bp-layout">

        {/* ── Mobile Filter Drawer Backdrop ── */}
        {showMobileFilters && (
          <div className="bp-sidebar-backdrop" onClick={() => setShowMobileFilters(false)} />
        )}

        {/* ── SIDEBAR ── */}
        <aside className={`bp-sidebar ${showMobileFilters ? 'bp-sidebar--open' : ''}`}>
          {/* Mobile Header inside drawer */}
          <div className="bp-sidebar-header-mobile">
            <h3>Filters</h3>
            <button type="button" className="bp-sidebar-close-btn" onClick={() => setShowMobileFilters(false)}>×</button>
          </div>

          {/* Availability */}
          <div className="bp-filter-group">
            <div className="bp-filter-group__head">
              <span className="bp-filter-group__title">Availability</span>
              <svg className="bp-filter-group__arrow bp-filter-group__arrow--open" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            <label className="bp-check-item">
              <input type="checkbox" checked={showVerified} onChange={e => { setShowVerified(e.target.checked); setPage(1); }} />
              EMAHU Verified
              <span className="bp-check-item__count">{locationFilteredProducts.filter(p=>p.verified).length}</span>
            </label>
            <label className="bp-check-item">
              <input type="checkbox" checked={showOnSale} onChange={e => { setShowOnSale(e.target.checked); setPage(1); }} />
              On Sale
              <span className="bp-check-item__count">{locationFilteredProducts.filter(p=>p.onSale).length}</span>
            </label>
            <label className="bp-check-item">
              <input type="checkbox" checked={showNew} onChange={e => { setShowNew(e.target.checked); setPage(1); }} />
              New Arrivals
              <span className="bp-check-item__count">{locationFilteredProducts.filter(p=>p.isNew).length}</span>
            </label>
          </div>

          {/* Category */}
          <div className="bp-filter-group">
            <div className="bp-filter-group__head">
              <span className="bp-filter-group__title">Category</span>
              <svg className="bp-filter-group__arrow bp-filter-group__arrow--open" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            <div className="bp-filter-scroll-container">
              {[{ label: 'All Products', value: 'All' }, ...categoryTiles].map(item => (
                <label key={item.value} className="bp-check-item" style={{ cursor:'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={category === item.value} 
                    onChange={() => { setCategory(item.value); setActiveSubcategory('All'); setPage(1); }} 
                    style={{ accentColor:'#0d0d0d', cursor: 'pointer' }} 
                  />
                  {item.label}
                  <span className="bp-check-item__count">{catCount(item.value)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price */}
          <div className="bp-filter-group">
            <div className="bp-filter-group__head">
              <span className="bp-filter-group__title">Price Range</span>
              <svg className="bp-filter-group__arrow bp-filter-group__arrow--open" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            <div className="bp-price-vals">
              <span>₹0</span>
              <span>₹{maxPrice.toLocaleString('en-IN')}</span>
            </div>
            <input type="range" className="bp-price-slider"
              min={0} max={maxPriceLimit} step={1000} value={maxPrice}
              onChange={e => { setMaxPrice(+e.target.value); setPage(1); }}
            />
          </div>

          {/* Subcategory — only show when a category is active and subcategories exist */}
          {availableSubcategories.length > 0 && (
            <div className="bp-filter-group">
              <div className="bp-filter-group__head">
                <span className="bp-filter-group__title">Subcategory</span>
                <svg className="bp-filter-group__arrow bp-filter-group__arrow--open" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </div>
              <div className="bp-filter-scroll-container">
                <label className="bp-check-item" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={activeSubcategory === 'All'}
                    onChange={() => { setActiveSubcategory('All'); setPage(1); }}
                    style={{ accentColor: '#0d0d0d', cursor: 'pointer' }}
                  />
                  All Subcategories
                  <span className="bp-check-item__count">
                    {category === 'All' ? locationFilteredProducts.length : locationFilteredProducts.filter(p => p.category === category).length}
                  </span>
                </label>
                {availableSubcategories.map(sub => (
                  <label key={sub} className="bp-check-item" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={activeSubcategory === sub}
                      onChange={() => { setActiveSubcategory(activeSubcategory === sub ? 'All' : sub); setPage(1); }}
                      style={{ accentColor: '#0d0d0d', cursor: 'pointer' }}
                    />
                    {sub}
                    <span className="bp-check-item__count">
                      {locationFilteredProducts.filter(p => p.subcategory === sub && (category === 'All' || p.category === category)).length}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Brands */}
          <div className="bp-filter-group">
            <div className="bp-filter-group__head">
              <span className="bp-filter-group__title">Brand</span>
              <svg className="bp-filter-group__arrow bp-filter-group__arrow--open" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            <div className="bp-filter-scroll-container">
              {Array.from(new Set(locationFilteredProducts.map(p => p.brand).filter(Boolean))).slice(0, 30).map(b => (
                <label key={b} className="bp-check-item">
                  <input type="checkbox" checked={brands.includes(b)} onChange={() => { toggleBrand(b); setPage(1); }} />
                  {b}
                  <span className="bp-check-item__count">{locationFilteredProducts.filter(p=>p.brand===b).length}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="bp-main">

          {/* Offline Warning Banner */}
          {isOffline && (
            <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️ No internet connection detected. Displaying offline YouTube-style skeleton grids.</span>
            </div>
          )}

          {/* Active filter tags */}
          {activeTags.length > 0 && !isOffline && (
            <div className="bp-active-tags">
              {activeTags.map((tag, i) => (
                <button key={i} className="bp-active-tag" onClick={tag.clear}>
                  {tag.label}
                  <span className="bp-active-tag__x">×</span>
                </button>
              ))}
              <button className="bp-clear-all-tag" onClick={clearAll}>Clear All</button>
            </div>
          )}

          {/* Grid */}
          <div className={`bp-grid ${viewMode==='list' ? 'bp-grid--list' : ''}`}>
            {loading ? (
              <>
                <style>{`
                  @keyframes skeleton-pulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 1; }
                    100% { opacity: 0.6; }
                  }
                  .sk-pulse {
                    animation: skeleton-pulse 1.5s infinite ease-in-out;
                    background-color: rgba(0, 0, 0, 0.06);
                    border-radius: 8px;
                  }
                  .sk-card {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    padding: 16px;
                    background: #ffffff;
                    border: 1px solid #ebebeb;
                    border-radius: 12px;
                  }
                  .sk-thumb {
                    width: 100%;
                    aspect-ratio: 4/3;
                  }
                  .sk-row {
                    display: flex;
                    gap: 12px;
                    align-items: flex-start;
                  }
                  .sk-avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    flex-shrink: 0;
                  }
                  .sk-text-container {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    width: 100%;
                  }
                  .sk-title {
                    height: 14px;
                    width: 80%;
                  }
                  .sk-sub {
                    height: 10px;
                    width: 50%;
                  }
                `}</style>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="sk-card">
                    <div className="sk-pulse sk-thumb" />
                    <div className="sk-row">
                      <div className="sk-pulse sk-avatar" />
                      <div className="sk-text-container">
                        <div className="sk-pulse sk-title" />
                        <div className="sk-pulse sk-sub" />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : paged.length === 0 ? (
              <div className="bp-empty">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <h3>No products found</h3>
                <p>Try adjusting your filters or <button onClick={clearAll} style={{background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>clear all</button></p>
              </div>
            ) : paged.map(p => (
              <Link key={p.id} href={`/buyer/products/${p.id}`} className="bp-card" style={{textDecoration:'none',color:'inherit'}}>
                <div className="bp-card__img-wrap">
                  {!isRealImage(p.img) ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: '4.5rem', background: '#f4f4f5' }}>
                      {p.img || '📦'}
                    </div>
                  ) : (
                    <img src={p.img} alt={p.name} className="bp-card__img" loading="lazy" />
                  )}

                  {/* Category chip */}
                  <span className="bp-card__cat-chip">{p.category}</span>

                  {/* Sale badge — only if no wishlist overlap */}
                  {p.onSale && <span className="bp-card__sale-badge" style={{right: p.onSale ? '46px' : '10px'}}>−{p.discount}%</span>}

                  {/* Out of Stock badge */}
                  {p.stock <= 0 && (
                    <span className="bp-card__sale-badge" style={{ left: '10px', right: 'auto', backgroundColor: '#ef4444', color: '#fff' }}>
                      Out of Stock
                    </span>
                  )}

                  {/* Wishlist — always top right */}
                  <button
                    className={`bp-card__wishlist ${wishlist.includes(p.id) ? 'bp-card__wishlist--active' : ''}`}
                    onClick={e => { e.preventDefault(); e.stopPropagation(); toggleWishlist(p.id); }}
                    aria-label="Wishlist"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={wishlist.includes(p.id) ? '#ef4444' : 'none'} stroke={wishlist.includes(p.id) ? '#ef4444' : '#374151'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </button>
                </div>

                <div className="bp-card__body">
                  <p className="bp-card__brand">
                    {p.brand}
                    {p.sellerStore && (
                      <>
                        <span style={{ margin: '0 5px', color: '#d1d5db' }}>•</span>
                        <span style={{ textTransform: 'none', color: '#4b5563', letterSpacing: '0.2px', fontWeight: '600' }}>
                          Store: {p.sellerStore}
                        </span>
                      </>
                    )}
                  </p>
                  <p className="bp-card__name">{p.name}</p>
                  {p.subcategory && p.subcategory !== 'General' && (
                    <span style={{
                      display: 'inline-block',
                      fontSize: '0.68rem',
                      fontWeight: '600',
                      color: '#4b5563',
                      background: '#f3f4f6',
                      border: '1px solid #e5e7eb',
                      borderRadius: '10px',
                      padding: '2px 8px',
                      marginBottom: '4px',
                      letterSpacing: '0.2px'
                    }}>
                      {p.subcategory}
                    </span>
                  )}
                  <div className="bp-card__rating">
                    <Stars rating={p.rating} />
                    <span className="bp-card__rc">({p.reviews.toLocaleString()})</span>
                  </div>
                  <div className="bp-card__price-row">
                    <span className="bp-card__price">₹{p.price.toLocaleString('en-IN')}</span>
                    {p.onSale && <span className="bp-card__price-orig">₹{p.original.toLocaleString('en-IN')}</span>}
                    {p.onSale && <span className="bp-card__discount">{p.discount}% off</span>}
                  </div>
                  {p.verified && (
                    <span className="bp-card__verified">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#12b7b2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      EMAHU Verified
                    </span>
                  )}
                </div>

                {/* Permanent Add to Cart — full width footer */}
                <button
                  className={`bp-card__add-cart ${cartAdded.includes(p.id) ? 'bp-card__add-cart--added' : ''}`}
                  onClick={e => addToCart(e, p.id)}
                  disabled={p.stock <= 0}
                  style={p.stock <= 0 ? { opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#4b5563' } : {}}
                >
                  {p.stock <= 0 ? (
                    'Out of Stock'
                  ) : cartAdded.includes(p.id) ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Added to Cart!
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                      Add to Cart
                    </>
                  )}
                </button>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bp-pagination">
              <button className="bp-page-btn" onClick={() => setPage(p=>p-1)} disabled={page===1}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              {getPaginationRange(page, totalPages).map((n, idx) => {
                if (n === '...') {
                  return (
                    <span key={`dots-${idx}`} className="bp-page-dots">
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={`page-${n}`}
                    className={`bp-page-btn ${page===n?'bp-page-btn--active':''}`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                );
              })}
              <button className="bp-page-btn" onClick={() => setPage(p=>p+1)} disabled={page===totalPages}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
