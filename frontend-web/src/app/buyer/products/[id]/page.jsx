'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import BuyerHeader from '@/components/buyer_home/buyer_header';
import { logAnalyticsEvent } from '@/utils/analytics';
import './product-detail.css';
import { STATIC_PRODUCTS } from '@/utils/mockProducts';

const ALL_PRODUCTS = STATIC_PRODUCTS;

const REVIEWS = [
  { id:1, name:'Rahul M.',   rating:5, date:'May 2025', text:'Absolutely premium quality! Packaging was immaculate and delivery was super fast. EMAHU verification seal was intact. 100% legit product.', tags:['Fast Delivery','Authentic'], color:'#4169e1', verified:true },
  { id:2, name:'Priya S.',   rating:4, date:'Apr 2025', text:'Great product, looks exactly like the images. Slightly delayed shipping but customer support was very helpful. Would recommend.', tags:['Good Quality','Helpful Support'], color:'#12b7b2', verified:true },
  { id:3, name:'Arjun K.',   rating:5, date:'Apr 2025', text:'Best deal I\'ve ever got! The EMAHU quality inspection report gave me full confidence. No compromise on quality whatsoever.', tags:['Best Deal','Quality Checked'], color:'#f59e0b', verified:false },
  { id:4, name:'Sneha R.',   rating:5, date:'Mar 2025', text:'I was skeptical at first but the verified badge and inspection scores convinced me. Zero regrets — perfect purchase!', tags:['Trusted Platform','Premium Feel'], color:'#10b981', verified:true },
];

const STATIC_RELATED = [
  { id:3,  name:'Sony WH-1000XM5',      brand:'Sony',    price:26999, img:'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80' },
  { id:4,  name:'MacBook Air M3',        brand:'Apple',   price:114999, img:'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80' },
  { id:14, name:'Samsung 55" QLED 4K',   brand:'Samsung', price:69999, img:'https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=400&q=80' },
  { id:6,  name:'Adidas Ultraboost 22',  brand:'Adidas',  price:12499, img:'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&q=80' },
];

function Stars({ rating, size = 14 }) {
  return (
    <div className="pd-stars">
      {[1,2,3,4,5].map(s => (
        <svg key={s} width={size} height={size} className={`pd-star ${s <= Math.round(rating) ? '' : 'pd-star--empty'}`} viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  );
}

const RATING_DIST = [
  { label:'5★', pct:72 }, { label:'4★', pct:16 }, { label:'3★', pct:7 },
  { label:'2★', pct:3  }, { label:'1★', pct:2  },
];

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

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id;
  const router = useRouter();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg,   setActiveImg]   = useState(0);
  const [activeColor, setActiveColor] = useState(0);
    const [activeSize,  setActiveSize]  = useState('');
  const [qty,         setQty]         = useState(1);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);

    const currentPrice = useMemo(() => {
    if (product && product.variants && product.variants[activeVariantIndex] && product.variants[activeVariantIndex].price) {
      return product.variants[activeVariantIndex].price;
    }
    return product ? product.price : 0;
  }, [product, activeVariantIndex]);

  const currentComparePrice = useMemo(() => {
    if (product && product.variants && product.variants[activeVariantIndex]) {
      const v = product.variants[activeVariantIndex];
      if (v.price) {
        if (product.original > v.price) {
          return product.original;
        }
        return null;
      }
    }
    return product ? product.original : 0;
  }, [product, activeVariantIndex]);

  const currentDiscount = useMemo(() => {
    if (!currentComparePrice || currentComparePrice <= currentPrice) return 0;
    return Math.round(((currentComparePrice - currentPrice) / currentComparePrice) * 100);
  }, [currentPrice, currentComparePrice]);

  const currentStock = useMemo(() => {
    if (product && product.variants && product.variants[activeVariantIndex] && product.variants[activeVariantIndex].stock !== undefined) {
      return product.variants[activeVariantIndex].stock;
    }
    return product ? product.stock : 0;
  }, [product, activeVariantIndex]);

  const currentImages = useMemo(() => {
    if (product && product.variants && product.variants[activeVariantIndex] && product.variants[activeVariantIndex].images && product.variants[activeVariantIndex].images.length > 0) {
      return product.variants[activeVariantIndex].images.map(img => cleanImageUrl(img)).filter(Boolean);
    }
    return product ? product.imgs : [];
  }, [product, activeVariantIndex]);

  const currentDescription = useMemo(() => {
    if (product && product.variants && product.variants[activeVariantIndex] && product.variants[activeVariantIndex].description) {
      return product.variants[activeVariantIndex].description;
    }
    return product ? product.desc : '';
  }, [product, activeVariantIndex]);

  const currentSku = useMemo(() => {
    if (product && product.variants && product.variants[activeVariantIndex] && product.variants[activeVariantIndex].sku) {
      return product.variants[activeVariantIndex].sku;
    }
    return product ? product.sku : '';
  }, [product, activeVariantIndex]);

  const currentSpecs = useMemo(() => {
    if (!product) return [];
    return product.specs.map(([k, v]) => {
      if (k === 'SKU Identifier' && currentSku) {
        return [k, currentSku];
      }
      if (k === 'Available Inventory') {
        return [k, `${currentStock} units`];
      }
      if (k === 'Status') {
        return [k, currentStock === 0 ? 'Out of Stock' : currentStock <= 10 ? 'Low Stock' : 'In Stock'];
      }
      return [k, v];
    });
  }, [product, currentSku, currentStock]);

  useEffect(() => {
    setActiveImg(0);
  }, [activeVariantIndex]);
  const [wishlist,    setWishlist]    = useState(false);
  const [added,       setAdded]       = useState(false);
  const [activeTab,   setActiveTab]   = useState('desc');
  const [relatedProducts, setRelatedProducts] = useState([]);

  // Load related products dynamically from database/static fallback
  useEffect(() => {
    if (!product) return;
    const fetchRelated = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products`);
        const data = await res.json();
        if (data.success && data.products) {
          const productCategory = product.category;
          
          // Helper to normalize category name comparison
          const getNormCat = (c) => {
            const clean = String(c || '').toLowerCase();
            if (clean.includes('electronics') || clean.includes('tech')) return 'tech';
            if (clean.includes('apparel') || clean.includes('fashion') || clean.includes('clothing')) return 'apparel';
            if (clean.includes('shoes') || clean.includes('footwear')) return 'shoes';
            if (clean.includes('kitchen') || clean.includes('dining')) return 'kitchen';
            if (clean.includes('lifestyle') || clean.includes('furniture') || clean.includes('home')) return 'lifestyle';
            if (clean.includes('beauty') || clean.includes('cosmetics')) return 'beauty';
            if (clean.includes('sports') || clean.includes('fitness') || clean.includes('outdoor')) return 'sports';
            if (clean.includes('books') || clean.includes('stationery')) return 'books';
            if (clean.includes('grocery') || clean.includes('essentials') || clean.includes('food')) return 'grocery';
            return clean;
          };

          const prodCatNorm = getNormCat(productCategory);

          // Filter products in the same category, excluding current product, delivering to selectedCity
          let matched = data.products.filter(p => {
            return getNormCat(p.category) === prodCatNorm && 
                   String(p._id || p.id) !== String(product.id) &&
                   sellerServesLocation(p.seller, selectedCity);
          });

          // Fallback if not enough category items
          if (matched.length < 4) {
            const extra = data.products.filter(p => String(p._id || p.id) !== String(product.id) && sellerServesLocation(p.seller, selectedCity));
            extra.forEach(p => {
              if (matched.length < 4 && !matched.some(m => String(m._id || m.id) === String(p._id || p.id))) {
                matched.push(p);
              }
            });
          }

          // Format dynamic related products
          const formatted = matched.slice(0, 4).map(p => {
            const cleanedImg = cleanImageUrl(p.image);
            const imageToShow = isRealImage(p.image) ? cleanedImg : (p.image || '📦');
            return {
              id: p.id || p._id,
              name: p.name,
              brand: p.brand || p.seller?.name || 'Emahu Seller',
              price: p.price,
              img: imageToShow,
              isEmoji: (!p.image || !isRealImage(p.image))
            };
          });
          setRelatedProducts(formatted);
        } else {
          setRelatedProducts(STATIC_RELATED);
        }
      } catch (err) {
        console.error('Error fetching related products:', err);
        setRelatedProducts(STATIC_RELATED);
      }
    };
    fetchRelated();
  }, [product, selectedCity]);

  // ── Review system state ──
  const [hasPurchased,   setHasPurchased]   = useState(false);
  const [userReviews,    setUserReviews]    = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating,   setReviewRating]   = useState(5);
  const [reviewHover,    setReviewHover]    = useState(0);
  const [reviewText,     setReviewText]     = useState('');
  const [reviewSubmitted,setReviewSubmitted]= useState(false);
  const [reviewError,    setReviewError]    = useState('');

  // Check buyer login session
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  useEffect(() => {
    setIsUserLoggedIn(!!localStorage.getItem('emahu_buyer_token'));
  }, []);

  // Selected buyer city for delivery validation
  const [selectedCity, setSelectedCity] = useState('Ahmedabad');

  useEffect(() => {
    const syncCity = () => {
      const storedCity = localStorage.getItem('emahu_buyer_city');
      if (storedCity) {
        setSelectedCity(storedCity);
      } else {
        const storedUser = localStorage.getItem('emahu_buyer_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            if (parsed.city) {
              setSelectedCity(parsed.city);
            }
          } catch (_) {}
        }
      }
    };
    syncCity();
    window.addEventListener('storage', syncCity);
    return () => window.removeEventListener('storage', syncCity);
  }, []);

  // Helper: check if seller serves the buyer location
  const sellerServesLocation = (seller, city) => {
    if (!seller) return false;
    const cityLower = (city || 'Ahmedabad').toLowerCase().trim();

    // All India option
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


  const isDeliverable = useMemo(() => {
    if (!product) return false;
    if (!product.seller) return true;
    return sellerServesLocation(product.seller, selectedCity);
  }, [product, selectedCity]);

  // Sync wishlist on mount
  useEffect(() => {
    try {
      const storedWish = localStorage.getItem('emahu_wishlist');
      if (storedWish) {
        const ids = JSON.parse(storedWish);
        setTimeout(() => setWishlist(ids.includes(id)), 0);
      }
    } catch (e) {
      console.error(e);
    }
  }, [id]);

  // ── Check if the current user has purchased this product ──
  useEffect(() => {
    const checkPurchase = async () => {
      try {
        // Get buyer/guest identity
        let buyerUserId = '';
        const buyerUserStr = localStorage.getItem('emahu_buyer_user');
        if (buyerUserStr) {
          try { buyerUserId = JSON.parse(buyerUserStr).id || JSON.parse(buyerUserStr)._id || ''; } catch (_) {}
        }
        if (!buyerUserId) buyerUserId = localStorage.getItem('emahu_guest_id') || '';

        // Try fetching from API first
        let orders = [];
        if (buyerUserId) {
          try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/orders?userId=${buyerUserId}`);
            const data = await res.json();
            if (data.success && data.orders) orders = data.orders;
          } catch (_) {}
        }

        // Fallback to localStorage
        if (orders.length === 0) {
          const stored = localStorage.getItem('emahu_orders');
          if (stored) orders = JSON.parse(stored);
        }

        // Check if any order contains an item matching this product id
        const bought = orders.some(ord =>
          ord.items && ord.items.some(item => {
            const itemId = String(item.id || item._id || item.productId || '');
            return itemId === String(id);
          })
        );
        setHasPurchased(bought);
      } catch (e) {
        console.error('Purchase check error:', e);
      }
    };
    checkPurchase();
  }, [id]);

  // ── Load user reviews from localStorage for this product ──
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`emahu_reviews_${id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setTimeout(() => setUserReviews(parsed), 0);
      }
    } catch (e) {
      console.error(e);
    }
  }, [id]);

  // ── Handle review submission ──
  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!reviewText.trim()) { setReviewError('Please write your review text.'); return; }
    if (reviewRating < 1)   { setReviewError('Please select a star rating.');  return; }

    // Build review buyer name
    let buyerName = 'Verified Buyer';
    try {
      const u = JSON.parse(localStorage.getItem('emahu_buyer_user') || '{}');
      if (u.name) buyerName = u.name.split(' ')[0] + ' ' + (u.name.split(' ')[1]?.[0] || '') + '.';
    } catch (_) {}

    const newReview = {
      id: Date.now(),
      name: buyerName,
      rating: reviewRating,
      date: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      text: reviewText.trim(),
      tags: ['Verified Purchase'],
      color: '#4169e1',
      verified: true,
      userSubmitted: true
    };

    const updated = [newReview, ...userReviews];
    setUserReviews(updated);
    localStorage.setItem(`emahu_reviews_${id}`, JSON.stringify(updated));

    // Reset form
    setReviewText('');
    setReviewRating(5);
    setReviewHover(0);
    setReviewError('');
    setReviewSubmitted(true);
    setShowReviewForm(false);
    setTimeout(() => setReviewSubmitted(false), 4000);
  };

  // Load product details from database
  useEffect(() => {
    const fetchDbProduct = async () => {
      let fetchedSuccessfully = false;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products/${id}`);
        const data = await res.json();
        if (data.success && data.product) {
          const p = data.product;

          // Smart category mapping
          let mappedCategory = p.category;
          if (p.category === 'Electronics') mappedCategory = 'Tech';
          else if (p.category === 'Fitness' || p.category === 'Furniture') mappedCategory = 'Lifestyle';

          setProduct({
            id: p.id || p._id,
            name: p.name,
            brand: p.brand || p.seller?.name || 'Emahu Seller',
            category: mappedCategory,
            price: p.price,
            original: p.comparePrice || p.price,
            discount: p.comparePrice ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100) : 0,
            rating: p.rating || 4.7,
            reviews: p.reviews || 84,
            imgs: (p.images && p.images.length > 0) ? p.images.map(img => cleanImageUrl(img)).filter(Boolean) : (p.image && isRealImage(p.image)) ? [cleanImageUrl(p.image)] : [],
            imageEmoji: (!p.image || !isRealImage(p.image)) ? p.image : null,
                        colors: p.colors || [],
            sizes: p.sizes || [],
            variants: p.variants || [],
            sku: p.sku || '',
            desc: p.description || 'Premium quality product listing verified by EMAHU.',
            stock: p.stock,
            status: p.status,
            specs: [
              ['Category', p.category],
              ['Subcategory', p.subcategory || 'General'],
              ['Available Inventory', `${p.stock} units`],
              ['Status', p.status === 'in-stock' ? 'In Stock' : p.status === 'low-stock' ? 'Low Stock' : 'Out of Stock'],
              ['SKU Identifier', p.sku],
              ['Seller Name', p.seller?.name || 'Authorized Merchant'],
              ['Seller Shop', p.seller?.storeName || 'Authorized Store']
            ],
            verified: true,
            isHot: false,
            onSale: p.comparePrice ? (p.price < p.comparePrice) : false,
            seller: p.seller,
            sellerStore: p.seller?.storeName || 'Emahu Store',
            sellerName: p.seller?.name || 'Emahu Merchant'
          });

          // Log analytics event for product view
          logAnalyticsEvent({
            type: 'view',
            productId: p.id || p._id,
            sellerId: p.seller?._id || p.seller?.id || p.seller
          });
          fetchedSuccessfully = true;
        }
      } catch (err) {
        console.error('Error fetching database product, falling back to static:', err);
      }

      if (!fetchedSuccessfully) {
        // Fallback to STATIC_PRODUCTS
        const staticIndex = STATIC_PRODUCTS.findIndex(p => String(p.id) === String(id));
        const staticProd = STATIC_PRODUCTS[staticIndex];
        if (staticProd) {
          let mappedCategory = staticProd.category;
          if (staticProd.category === 'Electronics' || staticProd.category === 'tech') mappedCategory = 'Tech';
          else if (staticProd.category === 'Fitness' || staticProd.category === 'Furniture' || staticProd.category === 'lifestyle') mappedCategory = 'Lifestyle';

          let mockCity = 'Ahmedabad';
          const mod = staticIndex % 6;
          if (mod === 0) mockCity = 'Ahmedabad';
          else if (mod === 1) mockCity = 'Delhi';
          else if (mod === 2) mockCity = 'Mumbai';
          else if (mod === 3) mockCity = 'Bangalore';
          else if (mod === 4) mockCity = 'Kolkata';
          else if (mod === 5) {
            if (staticIndex % 12 === 5) mockCity = 'Gandhinagar';
            else mockCity = 'Vadodara';
          }

          setProduct({
            id: staticProd.id,
            name: staticProd.name,
            brand: staticProd.brand || (typeof staticProd.seller === 'string' ? staticProd.seller : 'Emahu Brand'),
            category: mappedCategory,
            price: staticProd.price,
            original: staticProd.originalPrice || staticProd.price,
            discount: staticProd.originalPrice ? Math.round(((staticProd.originalPrice - staticProd.price) / staticProd.originalPrice) * 100) : 0,
            rating: staticProd.rating || 4.7,
            reviews: staticProd.reviews || 84,
            imgs: (staticProd.images && staticProd.images.length > 0) ? staticProd.images.map(img => cleanImageUrl(img)).filter(Boolean) : (staticProd.image && isRealImage(staticProd.image)) ? [cleanImageUrl(staticProd.image)] : [],
            imageEmoji: (!staticProd.image || !isRealImage(staticProd.image)) ? staticProd.image : null,
                        colors: [],
            sizes: [],
            variants: [],
            sku: staticProd.sku || '',
            desc: staticProd.desc || 'Premium quality product listing verified by EMAHU.',
            stock: 10,
            status: 'in-stock',
            specs: [
              ['Category', staticProd.category],
              ['Subcategory', staticProd.subcategory || 'General'],
              ['Available Inventory', '10 units'],
              ['Status', 'In Stock'],
              ['Seller Name', typeof staticProd.seller === 'string' ? staticProd.seller : 'Authorized Merchant'],
              ['Seller Shop', typeof staticProd.seller === 'string' ? staticProd.seller : 'Authorized Store']
            ],
            verified: true,
            isHot: false,
            onSale: staticProd.originalPrice ? (staticProd.price < staticProd.originalPrice) : false,
            seller: {
              ...(typeof staticProd.seller === 'string' ? { name: staticProd.seller, id: 'static-seller-' + staticProd.id } : staticProd.seller),
              city: mockCity,
              currentCity: mockCity
            },
            sellerStore: typeof staticProd.seller === 'string' ? staticProd.seller : 'Emahu Store',
            sellerName: staticProd.brand
          });
        }
      }
      setLoading(false);
    };
    fetchDbProduct();
  }, [id]);

    const handleAddCart = () => {
    if (!isUserLoggedIn) {
      router.push('/buyer/login');
      return;
    }
    try {
      const storedCartStr = localStorage.getItem('emahu_cart') || '[]';
      const storedCart = JSON.parse(storedCartStr);
      
      const selectedVariant = product.variants && product.variants[activeVariantIndex]
        ? product.variants[activeVariantIndex]
        : null;
      const sizeValue = selectedVariant ? selectedVariant.name : 'Default';

      const existingItemIndex = storedCart.findIndex(x => 
        (typeof x === 'object' ? x.id : x) === product.id && 
        (typeof x === 'object' ? x.size === sizeValue : sizeValue === 'Default')
      );

      if (existingItemIndex > -1) {
        storedCart[existingItemIndex].quantity += qty;
      } else {
        storedCart.push({
          id: product.id,
          quantity: qty,
          color: 'Default',
          size: sizeValue
        });
      }
      
      localStorage.setItem('emahu_cart', JSON.stringify(storedCart));
      window.dispatchEvent(new Event('storage'));

      // Log analytics event
      logAnalyticsEvent({
        type: 'add_to_cart',
        productId: product.id,
        sellerId: product.seller?._id || product.seller?.id || product.seller
      });

      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBuyNow = () => {
    if (!isUserLoggedIn) {
      router.push('/buyer/login');
      return;
    }
    try {
      const storedCartStr = localStorage.getItem('emahu_cart') || '[]';
      const storedCart = JSON.parse(storedCartStr);
      
      const selectedVariant = product.variants && product.variants[activeVariantIndex]
        ? product.variants[activeVariantIndex]
        : null;
      const sizeValue = selectedVariant ? selectedVariant.name : 'Default';

      const existingItemIndex = storedCart.findIndex(x => 
        (typeof x === 'object' ? x.id : x) === product.id && 
        (typeof x === 'object' ? x.size === sizeValue : sizeValue === 'Default')
      );

      if (existingItemIndex > -1) {
        storedCart[existingItemIndex].quantity += qty;
      } else {
        storedCart.push({
          id: product.id,
          quantity: qty,
          color: 'Default',
          size: sizeValue
        });
      }
      
      localStorage.setItem('emahu_cart', JSON.stringify(storedCart));
      window.dispatchEvent(new Event('storage'));

      // Log analytics event
      logAnalyticsEvent({
        type: 'add_to_cart',
        productId: product.id,
        sellerId: product.seller?._id || product.seller?.id || product.seller
      });

      router.push('/buyer/checkout');
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickAddRelatedProduct = (e, relatedProd) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUserLoggedIn) {
      router.push('/buyer/login');
      return;
    }
    try {
      const storedCartStr = localStorage.getItem('emahu_cart') || '[]';
      const storedCart = JSON.parse(storedCartStr);
      const prodId = relatedProd.id || relatedProd._id;
      if (!storedCart.some(x => (typeof x === 'object' ? x.id : x).toString() === prodId.toString())) {
        storedCart.push({
          id: prodId,
          quantity: 1,
          color: relatedProd.colors?.[0] || 'Default',
          size: relatedProd.sizes?.[0] || 'Default'
        });
        localStorage.setItem('emahu_cart', JSON.stringify(storedCart));
        window.dispatchEvent(new Event('storage'));
        
        logAnalyticsEvent({
          type: 'add_to_cart',
          productId: prodId,
          sellerId: relatedProd.seller?._id || relatedProd.seller?.id || relatedProd.seller
        });
        
        alert(`🛒 Added "${relatedProd.name}" to your cart!`);
      } else {
        alert(`🛒 "${relatedProd.name}" is already in your cart!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleWishlist = () => {
    if (!isUserLoggedIn) {
      router.push('/buyer/login');
      return;
    }
    try {
      const storedWish = localStorage.getItem('emahu_wishlist') || '[]';
      let ids = JSON.parse(storedWish);
      if (ids.includes(product.id)) {
        ids = ids.filter(x => x !== product.id);
        setWishlist(false);
      } else {
        ids.push(product.id);
        setWishlist(true);
      }
      localStorage.setItem('emahu_wishlist', JSON.stringify(ids));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !product) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#fafafa', color: '#111' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>Loading product details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pd-page">
      <BuyerHeader />

      {/* Breadcrumb */}
      <nav className="pd-breadcrumb">
        <Link href="/">Home</Link> <span>/</span>
        <Link href="/buyer/products">Buyer</Link> <span>/</span>
        <Link href="/buyer/products">Collection</Link> <span>/</span>
        <span style={{ color:'#0d0d0d' }}>{product.name}</span>
      </nav>

      {/* Main layout: gallery + info */}
      <div className="pd-main">

        {/* ── LEFT: Gallery ── */}
        <div className="pd-gallery">
          {/* Thumbnails */}
          <div className="pd-thumbs">
            {product.imageEmoji ? (
              <div className="pd-thumb pd-thumb--active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', width: '60px', height: '60px', background: '#f4f4f5', borderRadius: '8px' }}>
                {product.imageEmoji}
              </div>
            ) : (
              currentImages.map((img, i) => (
                <button key={i} className={`pd-thumb ${activeImg === i ? 'pd-thumb--active' : ''}`} onClick={() => setActiveImg(i)}>
                  <img src={img} alt={`View ${i+1}`} />
                </button>
              ))
            )}
          </div>

          {/* Big image */}
          <div className="pd-main-img-wrap">
            {product.imageEmoji ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', minHeight: '350px', fontSize: '8rem', background: '#f4f4f5', borderRadius: '16px' }}>
                {product.imageEmoji}
              </div>
            ) : (
              <img src={currentImages[activeImg]} alt={product.name} className="pd-main-img" />
            )}
            
            {/* Badges */}
            <div className="pd-img-badges">
              {product.verified && <span className="pd-img-badge pd-img-badge--verified">✓ EMAHU Verified</span>}
              {product.onSale   && <span className="pd-img-badge pd-img-badge--sale">−{product.discount}% OFF</span>}
              {product.isHot    && <span className="pd-img-badge pd-img-badge--hot">🔥 Hot Deal</span>}
            </div>

            <div className="pd-zoom-hint">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              Hover to zoom
            </div>
          </div>
        </div>

        {/* ── RIGHT: Info ── */}
        <div className="pd-info">
          {!isUserLoggedIn && (
            <div style={{ padding: '12px 16px', backgroundColor: 'rgba(49, 151, 149, 0.1)', color: '#319795', border: '1px solid rgba(49, 151, 149, 0.2)', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔒 You are browsing as a guest.</span>
              <Link href="/buyer/login" style={{ textDecoration: 'underline', fontWeight: '700', color: '#319795' }}>Sign in</Link>
              <span>to purchase or save items.</span>
            </div>
          )}
          <p className="pd-info__brand">
            {product.brand}
            {product.sellerStore && (
              <>
                <span style={{ margin: '0 6px', color: '#cbd5e1' }}>•</span>
                <span style={{ textTransform: 'none', color: '#475569', fontWeight: '500' }}>
                  Sold by: <strong>{product.sellerStore}</strong>
                </span>
              </>
            )}
          </p>
          <h1 className="pd-info__name">{product.name}</h1>

          {/* Rating */}
          <div className="pd-rating-row">
            <Stars rating={product.rating} />
            <span className="pd-rating-score">{product.rating}</span>
            <span className="pd-rating-sep">·</span>
            <span className="pd-rating-count">{product.reviews.toLocaleString()} reviews</span>
            {product.verified && (
              <span className="pd-verified-tag">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#12b7b2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                EMAHU Verified
              </span>
            )}
          </div>

                    {/* Price */}
          <div className="pd-price-block">
            <span className="pd-price">₹{currentPrice.toLocaleString('en-IN')}</span>
            {currentComparePrice && currentComparePrice > currentPrice && <>
              <span className="pd-price-orig">₹{currentComparePrice.toLocaleString('en-IN')}</span>
              <span className="pd-price-off">{currentDiscount}% off</span>
            </>}
          </div>
          <p className="pd-price-note">Inclusive of all taxes</p>

          <div className="pd-divider" />

                    {/* Variants Selector */}
          {product.variants && product.variants.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <p className="pd-selector-label" style={{ marginBottom: '8px', color: '#475569', fontWeight: '700', fontSize: '0.8rem' }}>🎨 Select Option / Variant</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {product.variants.map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`pd-size-btn ${activeVariantIndex === i ? 'pd-size-btn--active' : ''}`}
                    onClick={() => {
                      setActiveVariantIndex(i);
                      if (v.linkedProductId) {
                        router.push('/buyer/products/' + v.linkedProductId);
                      }
                    }}
                    style={{
                      height: '38px',
                      padding: '0 16px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      border: activeVariantIndex === i ? '2px solid #0f172a' : '1px solid #cbd5e1',
                      background: activeVariantIndex === i ? '#0f172a' : '#ffffff',
                      color: activeVariantIndex === i ? '#ffffff' : '#0f172a',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {v.name} {v.price && v.price !== product.price ? `(₹${v.price.toLocaleString('en-IN')})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Original Colors & Sizes (if any exist independently of variants) */}
          {product.colors.length > 0 && <>
            <p className="pd-selector-label">Color — <span style={{fontWeight:400,textTransform:'none',letterSpacing:0,color:'#6b7280'}}>Option {activeColor+1}</span></p>
            <div className="pd-colors">
              {product.colors.map((c, i) => (
                <div key={i} className={`pd-color-dot ${activeColor===i?'pd-color-dot--active':''}`}
                  style={{ background: c }} onClick={() => setActiveColor(i)} title={c} />
              ))}
            </div>
          </>}

          {product.sizes.length > 0 && <>
            <p className="pd-selector-label">Size</p>
            <div className="pd-sizes">
              {product.sizes.map(s => (
                <button key={s} className={`pd-size-btn ${activeSize===s?'pd-size-btn--active':''}`}
                  onClick={() => setActiveSize(s)}>{s}</button>
              ))}
            </div>
            <button className="pd-size-guide">Size guide →</button>
          </>}

                    {/* Qty */}
          <div className="pd-qty-row">
            <span className="pd-qty-label">Qty</span>
            <div className="pd-qty-ctrl">
              <button className="pd-qty-btn" onClick={() => setQty(q => Math.max(1, q-1))} disabled={currentStock <= 0}>−</button>
              <span className="pd-qty-val">{currentStock <= 0 ? 0 : qty}</span>
              <button className="pd-qty-btn" onClick={() => setQty(q => Math.min(currentStock, q+1))} disabled={currentStock <= 0 || qty >= currentStock}>+</button>
            </div>
            {currentStock > 0 ? (
              <span style={{fontSize:'0.78rem',color:'#16a34a',fontWeight:600}}>✓ In Stock</span>
            ) : (
              <span style={{fontSize:'0.78rem',color:'#dc2626',fontWeight:600}}>✕ Out of Stock</span>
            )}
          </div>

          {/* Deliverability Warning Banner */}
          {!isDeliverable && (
            <div className="pd-delivery-warning" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: '#fffbeb',
              border: '1.5px solid #fef3c7',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '20px',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.05)'
            }}>
              <span style={{ fontSize: '1.3rem' }}>⚠️</span>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#b45309', fontFamily: "'Inter', sans-serif" }}>
                  Not Deliverable to {selectedCity}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#d97706', marginTop: '3px', lineHeight: '1.4', fontFamily: "'Inter', sans-serif" }}>
                  The seller <strong>{product.sellerStore || 'Emahu Seller'}</strong> does not serve your active delivery location. Please select another city from the header to order.
                </div>
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="pd-cta-row">
            <button
              className={`pd-btn-cart ${added?'pd-btn-cart--added':''}`}
              onClick={handleAddCart}
              disabled={currentStock <= 0 || !isDeliverable}
              style={currentStock <= 0 || !isDeliverable ? { opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#4b5563' } : {}}
            >
              {currentStock <= 0 ? (
                'Out of Stock'
              ) : !isDeliverable ? (
                'Delivery Unavailable'
              ) : added ? (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Added!</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> Add to Cart</>
              )}
            </button>
            <button
              className="pd-btn-buy"
              onClick={handleBuyNow}
              disabled={currentStock <= 0 || !isDeliverable}
              style={currentStock <= 0 || !isDeliverable ? { opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#374151' } : {}}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
              {currentStock <= 0 ? 'Out of Stock' : !isDeliverable ? 'Delivery Unavailable' : 'Buy Now'}
            </button>
            <button className={`pd-btn-wishlist ${wishlist?'pd-btn-wishlist--active':''}`} onClick={handleToggleWishlist} aria-label="Wishlist">
              <svg width="18" height="18" viewBox="0 0 24 24" fill={wishlist?'#ef4444':'none'} stroke={wishlist?'#ef4444':'#374151'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          </div>




          {/* Delivery info */}
          <div className="pd-delivery-cards">
            {[
              { icon:'🚚', title:'Express Delivery', sub:'Estimated by Tomorrow, 10 AM', tag:null },
              { icon:'✅', title:'EMAHU Quality Checked', sub:'Physical inspection completed. Seal verified.', tag:null },
              { icon:'🔄', title:'30-Day Easy Returns', sub:'No questions asked return policy', tag:null },
              { icon:'🔒', title:'Secure Escrow Payment', sub:'Money released only after you confirm receipt', tag:null },
            ].map((item, i) => (
              <div key={i} className="pd-delivery-card">
                <div className="pd-delivery-icon" style={{fontSize:'1.1rem'}}>{item.icon}</div>
                <div className="pd-delivery-info">
                  <div className="pd-delivery-title">{item.title}</div>
                  <div className="pd-delivery-sub">{item.sub}</div>
                </div>
                {item.tag && <span className="pd-delivery-tag">{item.tag}</span>}
              </div>
            ))}
          </div>

          {/* Trust row */}
          <div className="pd-trust-row">
            {['100% Authentic', 'Secure Checkout', 'EMAHU Protected', '24/7 Support'].map(t => (
              <span key={t} className="pd-trust-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#12b7b2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs: Description / Specs / Reviews ── */}
      <section className="pd-tabs-section">
        <div className="pd-tabs">
          {[['desc','Description'],['specs','Specifications'],['reviews','Reviews']].map(([k,l]) => (
            <button key={k} className={`pd-tab ${activeTab===k?'pd-tab--active':''}`} onClick={() => setActiveTab(k)}>{l}</button>
          ))}
        </div>

        {activeTab === 'desc' && (
          <div className="pd-desc">
            <p>{currentDescription} Built for people who demand the best — designed, inspected, and delivered with premium care through the EMAHU quality assurance system.</p>
            <p>Every EMAHU-listed product undergoes rigorous 47-point physical inspection at one of our secure hub facilities before reaching your doorstep. Your satisfaction is guaranteed.</p>
            <div className="pd-features-grid">
              {[
                {icon:'🛡️', title:'Quality Assured', sub:'47-point physical inspection'},
                {icon:'📦', title:'Premium Packaging', sub:'Tamper-proof EMAHU seal'},
                {icon:'⚡', title:'Express Delivery', sub:'Next-day delivery available'},
                {icon:'💎', title:'Authentic Product', sub:'Manufacturer warranty included'},
              ].map(f => (
                <div key={f.title} className="pd-feature-item">
                  <div className="pd-feature-icon">{f.icon}</div>
                  <div>
                    <div className="pd-feature-title">{f.title}</div>
                    <div className="pd-feature-sub">{f.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'specs' && (
          <div className="pd-specs">
            <table className="pd-specs-table">
              <tbody>
                {currentSpecs.map(([k,v]) => (
                  <tr key={k}><td>{k}</td><td>{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="pd-reviews">
            <div className="pd-reviews-summary">
              <div>
                <div className="pd-reviews-big-score">{product.rating}</div>
                <div><Stars rating={product.rating} size={16}/></div>
                <div className="pd-reviews-big-label">{(product.reviews + userReviews.length).toLocaleString()} reviews</div>
              </div>
              <div className="pd-bar-rows">
                {RATING_DIST.map(r => (
                  <div key={r.label} className="pd-bar-row">
                    <span className="pd-bar-label">{r.label}</span>
                    <div className="pd-bar-track"><div className="pd-bar-fill" style={{width:`${r.pct}%`}} /></div>
                    <span className="pd-bar-pct">{r.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Write Review CTA — only for verified purchasers ── */}
            <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {hasPurchased ? (
                <>
                  {reviewSubmitted && (
                    <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      Review submitted! Thank you.
                    </span>
                  )}
                  <button
                    onClick={() => { setShowReviewForm(v => !v); setReviewError(''); }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      padding: '10px 20px', borderRadius: '10px',
                      background: showReviewForm ? '#f3f4f6' : '#0d0d0d',
                      color: showReviewForm ? '#374151' : '#ffffff',
                      border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      fontSize: '0.85rem', fontWeight: '700', transition: 'all 0.2s ease'
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                    {showReviewForm ? 'Cancel' : 'Write a Review'}
                  </button>
                </>
              ) : (
                <span style={{ fontSize: '0.82rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px', background: '#f9fafb', padding: '8px 16px', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Purchase this product to leave a review
                </span>
              )}
            </div>

            {/* ── Inline review form ── */}
            {showReviewForm && hasPurchased && (
              <form onSubmit={handleSubmitReview} style={{
                background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '14px',
                padding: '24px', marginBottom: '28px', animation: 'fadeUp 0.3s ease both'
              }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#0d0d0d', marginBottom: '16px' }}>Share your experience</h4>

                {/* Star picker */}
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '0.78rem', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>Your Rating</p>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[1,2,3,4,5].map(s => (
                      <button
                        key={s} type="button"
                        onMouseEnter={() => setReviewHover(s)}
                        onMouseLeave={() => setReviewHover(0)}
                        onClick={() => setReviewRating(s)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                          transition: 'transform 0.15s'
                        }}
                      >
                        <svg width="28" height="28" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                            fill={s <= (reviewHover || reviewRating) ? '#f59e0b' : '#e5e7eb'}
                            style={{ transition: 'fill 0.15s' }}
                          />
                        </svg>
                      </button>
                    ))}
                    <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: '#6b7280', alignSelf: 'center' }}>
                      {reviewRating === 5 ? 'Excellent' : reviewRating === 4 ? 'Good' : reviewRating === 3 ? 'Average' : reviewRating === 2 ? 'Poor' : 'Very Poor'}
                    </span>
                  </div>
                </div>

                {/* Review text */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '8px' }}>Your Review</label>
                  <textarea
                    value={reviewText}
                    onChange={e => { setReviewText(e.target.value); setReviewError(''); }}
                    placeholder="Share what you liked, didn't like, or anything buyers should know..."
                    rows={4}
                    style={{
                      width: '100%', padding: '12px 14px', border: '1.5px solid #e5e7eb',
                      borderRadius: '10px', fontSize: '0.88rem', lineHeight: '1.6',
                      fontFamily: 'Inter, sans-serif', color: '#0d0d0d', resize: 'vertical',
                      background: '#ffffff', outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={e => e.target.style.borderColor = '#0d0d0d'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                    required
                  />
                </div>

                {reviewError && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '12px' }}>{reviewError}</p>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" style={{
                    padding: '11px 24px', background: '#0d0d0d', color: '#ffffff',
                    border: 'none', borderRadius: '8px', fontFamily: 'Inter, sans-serif',
                    fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#1f1f1f'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#0d0d0d'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    Submit Review
                  </button>
                  <button type="button" onClick={() => setShowReviewForm(false)} style={{
                    padding: '11px 20px', background: 'transparent', color: '#6b7280',
                    border: '1.5px solid #e5e7eb', borderRadius: '8px', fontFamily: 'Inter, sans-serif',
                    fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer'
                  }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* ── Review cards: user reviews first, then static ── */}
            <div className="pd-review-cards">
              {[...userReviews, ...REVIEWS].map((r, idx) => (
                <div key={r.id || idx} className="pd-review-card" style={r.userSubmitted ? { border: '1.5px solid #12b7b2', background: 'rgba(18,183,178,0.02)' } : {}}>
                  <div className="pd-review-head">
                    <div className="pd-review-avatar" style={{background: r.color || '#4169e1'}}>{r.name[0]}</div>
                    <div>
                      <div className="pd-review-name">{r.name}</div>
                      <div className="pd-review-date">{r.date}</div>
                    </div>
                    {r.verified && <span className="pd-review-verified">✓ Verified Purchase</span>}
                  </div>
                  <div className="pd-review-stars">
                    {[1,2,3,4,5].map(s=>(
                      <svg key={s} className="pd-review-rs" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={s<=r.rating?'#f59e0b':'#e5e7eb'}/></svg>
                    ))}
                  </div>
                  <p className="pd-review-text">{r.text}</p>
                  <div className="pd-review-tags">{r.tags.map(t=><span key={t} className="pd-review-tag">{t}</span>)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Related Products ── */}
      <section className="pd-related">
        <h2 className="pd-related__title">You Might Also Like</h2>
        <div className="pd-related-grid">
          {relatedProducts.map(r => (
            <div key={r.id} className="pd-related-card" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => router.push(`/buyer/products/${r.id}`)}>
              <div className="pd-related-img-wrap" style={r.isEmoji ? { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' } : {}}>
                {r.isEmoji ? (
                  <span>{r.img}</span>
                ) : (
                  <img src={r.img} alt={r.name} className="pd-related-img" loading="lazy" />
                )}
              </div>
              <p className="pd-related-brand">{r.brand}</p>
              <p className="pd-related-name">{r.name}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <p className="pd-related-price" style={{ margin: 0 }}>₹{r.price.toLocaleString('en-IN')}</p>
                <button
                  type="button"
                  onClick={(e) => handleQuickAddRelatedProduct(e, r)}
                  style={{
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  + Add
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
