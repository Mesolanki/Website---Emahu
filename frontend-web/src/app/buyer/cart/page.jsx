'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import BuyerHeader from '@/components/buyer_home/buyer_header';
import './cart.css';

import { STATIC_PRODUCTS } from '@/utils/mockProducts';

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

const sellerServesLocation = (seller, city) => {
  if (!city) return true; // no city set → show all
  if (!seller) return false;
  const cityLower = city.toLowerCase().trim();

  // If seller is mock string or something, we can check it
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
  const sellerCity = (seller.city || seller.currentCity || seller.location || '').toLowerCase().trim();
  
  if (sellerCity === cityLower) return true;
  if (sellerCity.includes(cityLower) || cityLower.includes(sellerCity)) return true;

  const coveredCities = Array.isArray(seller.coveredCities)
    ? seller.coveredCities.map(c => c.toLowerCase().trim())
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

export default function CartPage() {
  const [cartItems, setCartItems] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [checkoutStep, setCheckoutStep] = useState('idle'); // idle | securing | success
  const [removingId, setRemovingId] = useState(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [transactionCode, setTransactionCode] = useState('');

  // Delivery state
  const [deliveryCharge, setDeliveryCharge] = useState(99);
  const [deliveryDistance, setDeliveryDistance] = useState(0);
  const [deliveryBreakdown, setDeliveryBreakdown] = useState([]);
  const [deliveryCalculating, setDeliveryCalculating] = useState(false);
  const [deliveryError, setDeliveryError] = useState('');
  const [deliverySettings, setDeliverySettings] = useState({
    maxDeliveryDistance: 100,
    expressDeliverySurcharge: 100
  });
  const [buyerCoordinates, setBuyerCoordinates] = useState({ latitude: '', longitude: '' });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [buyerCity, setBuyerCity] = useState('');
  const [hasDeliveredOrder, setHasDeliveredOrder] = useState(false);
  const [deliveredOrderId, setDeliveredOrderId] = useState('');
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  // ── Check for arrived unconfirmed orders ──
  useEffect(() => {
    const checkDeliveredOrders = async () => {
      // Removed per request - no longer blocking checkout for arrived orders
      /*
      let buyerUserId = '';
      const buyerUserStr = localStorage.getItem('emahu_buyer_user');
      if (buyerUserStr) {
        try {
          buyerUserId = JSON.parse(buyerUserStr).id || JSON.parse(buyerUserStr)._id || '';
        } catch (e) {}
      }
      if (!buyerUserId) {
        buyerUserId = localStorage.getItem('emahu_guest_id') || '';
      }
      if (!buyerUserId) return;

      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/orders?userId=${buyerUserId}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.orders) {
          const unconfirmed = data.orders.find(o => o.status === 'DELIVERED');
          if (unconfirmed) {
            setHasDeliveredOrder(true);
            setDeliveredOrderId(unconfirmed.orderId);
          } else {
            setHasDeliveredOrder(false);
            setDeliveredOrderId('');
          }
        }
      } catch (err) {
        console.warn('Error checking delivered orders in cart:', err);
      }
      */
    };
    checkDeliveredOrders();
  }, []);

  // ── Fetch delivery settings on mount ──
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/delivery/settings`);
        const data = await res.json();
        if (data.success && data.settings) {
          setDeliverySettings(data.settings);
        }
      } catch (err) {
        console.warn('Could not fetch delivery settings:', err);
      }
    };
    fetchSettings();
  }, []);

  // ── Load Coordinates on mount ──
  useEffect(() => {
    const storedCoords = localStorage.getItem('emahu_buyer_coordinates');
    if (storedCoords) {
      try {
        const parsed = JSON.parse(storedCoords);
        if (parsed.latitude && parsed.longitude) {
          setBuyerCoordinates(parsed);
          const storedCity = localStorage.getItem('emahu_buyer_city');
          if (storedCity) {
            setBuyerCity(storedCity);
          }
        }
      } catch (e) {}
    }
  }, []);

  // ── Load Cart items on mount ──
  const loadCartAndProducts = useCallback(async () => {
    let formattedList = [];
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products`);
      const data = await res.json();
      if (data.success && data.products) {
        formattedList = data.products.map(p => {
          let mappedCategory = p.category;
          if (p.category === 'Electronics') mappedCategory = 'Tech';
          else if (p.category === 'Fitness' || p.category === 'Furniture') mappedCategory = 'Lifestyle';

          const cleanedImg = cleanImageUrl(p.image);
          const imageToShow = isRealImage(p.image) ? cleanedImg : (p.image || '📦');

          return {
            id: p.id || p._id,
            name: p.name,
            brand: p.brand || p.seller?.name || 'Emahu Seller',
            category: mappedCategory,
            price: p.price,
            original: p.comparePrice || p.price,
            discount: p.comparePrice ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100) : 0,
            rating: p.rating || 4.7,
            reviews: p.reviews || 84,
            img: imageToShow,
            stock: typeof p.stock === 'number' ? p.stock : 99, // ← STOCK FIELD
            verified: true,
            isNew: true,
            isHot: false,
            onSale: p.comparePrice ? (p.price < p.comparePrice) : false,
            seller: p.seller
          };
        });
      }
    } catch (err) {
      console.warn('Failed to fetch DB products for cart, falling back to static:', err);
    }

    try {
      // Combine DB products with static mock products (static get default stock of 99)
      const formattedStatic = STATIC_PRODUCTS.map((p, idx) => {
        let mockCity = 'Ahmedabad';
        const mod = idx % 5;
        if (mod === 0) mockCity = 'Delhi';
        else if (mod === 1) mockCity = 'Mumbai';
        else if (mod === 2) mockCity = 'Bangalore';
        else if (mod === 3) mockCity = 'Kolkata';
        else if (mod === 4) {
          if (idx % 10 === 4) mockCity = 'Gandhinagar';
          else mockCity = 'Vadodara';
        }

        let mappedCategory = p.category || 'Lifestyle & Home';
        const catLC = mappedCategory.toLowerCase();
        if (catLC === 'electronics' || catLC === 'tech' || catLC === 'tech & gadgets') {
          mappedCategory = 'Tech';
        } else if (catLC === 'apparel' || catLC === 'fashion') {
          mappedCategory = 'Apparel';
        } else if (catLC === 'shoes') {
          mappedCategory = 'Shoes';
        } else if (catLC === 'kitchen') {
          mappedCategory = 'Kitchen';
        } else if (catLC === 'lifestyle' || catLC === 'fitness' || catLC === 'furniture') {
          mappedCategory = 'Lifestyle';
        } else if (catLC === 'grocery' || catLC === 'groceries') {
          mappedCategory = 'Grocery';
        }

        return {
          id: p.id,
          name: p.name,
          brand: p.brand || p.seller || 'Emahu Seller',
          category: mappedCategory,
          price: p.price,
          original: p.originalPrice || p.price,
          rating: p.rating || 4.7,
          reviews: p.reviews || 84,
          img: p.image,
          stock: p.stock ?? 99,
          verified: true,
          isNew: true,
          isHot: false,
          seller: {
            city: mockCity,
            currentCity: mockCity
          }
        };
      });

      const allProducts = [...formattedList, ...formattedStatic];
      const seen = new Set();
      const uniqueProducts = allProducts.filter(p => {
        if (!p || !p.id) return false;
        const pid = p.id.toString();
        if (seen.has(pid)) return false;
        seen.add(pid);
        return true;
      });

      setAvailableProducts(uniqueProducts);

      const storedCart = localStorage.getItem('emahu_cart');
      if (storedCart) {
        const parsed = JSON.parse(storedCart);
        const matched = [];
        let hasStale = false;

        parsed.forEach(cItem => {
          const cItemId = typeof cItem === 'object' ? cItem.id : cItem;
          if (!cItemId) return;
          const prod = uniqueProducts.find(p => p.id.toString() === cItemId.toString());
          if (prod) {
            // Clamp quantity to available stock
            const clampedQty = Math.min(cItem.quantity || 1, prod.stock > 0 ? prod.stock : 1);
            matched.push({
              ...prod,
              quantity: clampedQty,
              selectedColor: cItem.color || 'Premium Black',
              selectedSize: cItem.size || 'Regular'
            });
          } else {
            hasStale = true;
          }
        });

        setCartItems(matched);

        // Persist clamped quantities back
        const saveList = matched.map(p => ({
          id: p.id,
          quantity: p.quantity,
          color: p.selectedColor,
          size: p.selectedSize
        }));
        localStorage.setItem('emahu_cart', JSON.stringify(saveList));
        if (hasStale) window.dispatchEvent(new Event('storage'));
      }
    } catch (err) {
      console.error('Error combining/processing products in cart:', err);
    }
  }, []);

  useEffect(() => {
    loadCartAndProducts();
  }, [loadCartAndProducts]);

  // ── Save changes to localStorage helper ──
  const saveCartToStorage = (items) => {
    try {
      const saveList = items.map(p => ({
        id: p.id,
        quantity: p.quantity,
        color: p.selectedColor,
        size: p.selectedSize
      }));
      localStorage.setItem('emahu_cart', JSON.stringify(saveList));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(e);
    }
  };

  // Suggestions for cross-selling when there is exactly 1 item in cart
  // — filtered to only show products deliverable to buyer's current location
  const cartSuggestions = useMemo(() => {
    if (cartItems.length !== 1 || !availableProducts.length) return [];
    const cartItem = cartItems[0];
    const cartItemId = cartItem.id.toString();

    // Step 1: remove the item already in cart
    let cleanAvailable = availableProducts.filter(p => p.id.toString() !== cartItemId);

    // Step 2: filter by delivery location if buyer city is known
    if (buyerCity && buyerCity.trim() !== '') {
      cleanAvailable = cleanAvailable.filter(p => sellerServesLocation(p.seller, buyerCity));
    }

    // Step 3: prefer same category, then fill with others
    const sameCat = cleanAvailable.filter(p => p.category === cartItem.category);
    const otherCat = cleanAvailable.filter(p => p.category !== cartItem.category);

    const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

    const combined = [...shuffle(sameCat), ...shuffle(otherCat)];
    return combined.slice(0, 3);
  }, [cartItems, availableProducts, buyerCity]);

  const handleAddSuggestionToCart = (suggestedProduct) => {
    try {
      const currentCartStr = localStorage.getItem('emahu_cart') || '[]';
      const currentCart = JSON.parse(currentCartStr);

      const exists = currentCart.some(cItem => {
        const cItemId = typeof cItem === 'object' ? cItem.id : cItem;
        return cItemId.toString() === suggestedProduct.id.toString();
      });

      if (!exists) {
        currentCart.push({
          id: suggestedProduct.id,
          quantity: 1,
          color: suggestedProduct.colors?.[0] || 'Premium Black',
          size: suggestedProduct.sizes?.[0] || 'Regular'
        });
        localStorage.setItem('emahu_cart', JSON.stringify(currentCart));
        window.dispatchEvent(new Event('storage'));
        
        loadCartAndProducts();
      }
    } catch (err) {
      console.error('Failed to add suggestion to cart:', err);
    }
  };

  // ── Adjust item quantity — capped to stock ──
  const handleQuantityChange = (id, delta) => {
    const nextList = cartItems.map(p => {
      if (p.id === id) {
        const maxQty = p.stock > 0 ? p.stock : 1;
        const newQty = Math.min(maxQty, Math.max(1, p.quantity + delta));
        return { ...p, quantity: newQty };
      }
      return p;
    });
    setCartItems(nextList);
    saveCartToStorage(nextList);
  };

  // ── Remove single item ──
  const handleRemove = (id) => {
    setRemovingId(id);
    setTimeout(() => {
      const nextList = cartItems.filter(p => p.id !== id);
      setCartItems(nextList);
      saveCartToStorage(nextList);
      setRemovingId(null);
    }, 380);
  };

  // ── Clear entire cart ──
  const handleClearCart = () => {
    setIsClearingAll(true);
    setTimeout(() => {
      setCartItems([]);
      localStorage.setItem('emahu_cart', JSON.stringify([]));
      window.dispatchEvent(new Event('storage'));
      setIsClearingAll(false);
    }, 380);
  };

  // ── GPS location detection ──
  const handleGPSDetect = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const coords = { latitude: lat.toFixed(6), longitude: lon.toFixed(6) };
        setBuyerCoordinates(coords);
        localStorage.setItem('emahu_buyer_coordinates', JSON.stringify(coords));
        setGpsLoading(false);
        // Reverse geocode to get city, state, pincode name
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const data = await res.json();
          if (data && data.address) {
            const cityVal = data.address.city || data.address.town || data.address.village || data.address.county || data.address.state_district || '';
            const stateVal = data.address.state || '';
            const postcodeVal = data.address.postcode || data.address.postal || '';
            
            const road = data.address.road || '';
            const suburb = data.address.suburb || data.address.neighbourhood || '';
            const parts = [road, suburb, cityVal, stateVal].filter(Boolean);
            let fullAddr = parts.join(', ');
            if (postcodeVal) {
              fullAddr += ` - ${postcodeVal}`;
            }
            if (!fullAddr) {
              fullAddr = data.display_name;
            }

            setBuyerCity(cityVal);
            localStorage.setItem('emahu_buyer_city', cityVal);
            localStorage.setItem('emahu_buyer_state', stateVal);
            localStorage.setItem('emahu_buyer_pincode', postcodeVal);
            localStorage.setItem('emahu_buyer_full_address', fullAddr);
          }
        } catch (_) {}
      },
      (err) => {
        console.error('GPS error:', err);
        setGpsLoading(false);
        alert('Location access denied. Please allow browser location permission and try again.');
      },
      { timeout: 10000 }
    );
  };

  // ── Recalculate delivery charge when location or cart changes ──
  const calculateDelivery = useCallback(async () => {
    const lat = parseFloat(buyerCoordinates.latitude);
    const lon = parseFloat(buyerCoordinates.longitude);
    const subtotalVal = cartItems.reduce((acc, p) => acc + (p.price * p.quantity), 0);

    // If no GPS, use flat ₹99 fallback
    if (isNaN(lat) || isNaN(lon) || !cartItems.length) {
      setDeliveryCharge(99);
      setDeliveryDistance(0);
      setDeliveryBreakdown([]);
      setDeliveryError('');
      return;
    }

    setDeliveryCalculating(true);
    setDeliveryError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/delivery/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerLat: lat,
          buyerLon: lon,
          cartItems: cartItems.map(item => ({
            productId: item.id || item._id,
            quantity: item.quantity
          }))
        })
      });
      const data = await res.json();
      if (data.success) {
        setDeliveryCharge(data.totalDeliveryCharge);
        setDeliveryDistance(data.maxDistanceKm);
        setDeliveryBreakdown(data.breakdown || []);
        setDeliveryError('');
      } else {
        setDeliveryError(data.error || 'Could not calculate delivery charge.');
        // Fallback
        setDeliveryCharge(99);
      }
    } catch (err) {
      console.warn('Delivery calc failed, using flat fee:', err);
      setDeliveryCharge(99);
      setDeliveryDistance(0);
      setDeliveryBreakdown([]);
    } finally {
      setDeliveryCalculating(false);
    }
  }, [buyerCoordinates.latitude, buyerCoordinates.longitude, cartItems, deliverySettings]);

  useEffect(() => {
    calculateDelivery();
  }, [calculateDelivery]);

  // ── Totals ──
  const subtotal = cartItems.reduce((acc, p) => acc + (p.price * p.quantity), 0);
  const shippingFee = (subtotal === 0 || subtotal > 150) ? 0 : deliveryCharge;
  const taxAmount = Math.round(subtotal * 0.18);
  const cgstAmount = Math.round(taxAmount / 2);
  const sgstAmount = taxAmount - cgstAmount;
  const grandTotal = subtotal + shippingFee + taxAmount;

  // ── Quick checkout (guest) ──
  const handleSecureCheckout = () => {
    if (cartItems.length === 0) return;
    setCheckoutStep('securing');

    setTimeout(() => {
      const placedCodes = [];
      try {
        const storedOrdersStr = localStorage.getItem('emahu_orders') || '[]';
        const storedOrders = JSON.parse(storedOrdersStr);

        let buyerUserId = '';
        const buyerUserStr = localStorage.getItem('emahu_buyer_user');
        if (buyerUserStr) {
          try { buyerUserId = JSON.parse(buyerUserStr).id || JSON.parse(buyerUserStr)._id || ''; } catch (e) {}
        }
        if (!buyerUserId) {
          let guestId = localStorage.getItem('emahu_guest_id');
          if (!guestId) {
            guestId = 'guest_' + Math.floor(100000 + Math.random() * 900000) + '_' + Date.now();
            localStorage.setItem('emahu_guest_id', guestId);
          }
          buyerUserId = guestId;
        }

        const billId = `BILL_${Math.floor(100000 + Math.random() * 900000)}`;
        cartItems.forEach((item) => {
          const generatedCode = `EMH_${Math.floor(100000 + Math.random() * 900000)}`;
          placedCodes.push(generatedCode);

          const itemSubtotal = item.price * item.quantity;
          const itemShip = shippingFee / Math.max(cartItems.length, 1); // split delivery per item
          const itemTax = Math.round(itemSubtotal * 0.18);
          const grandTotalItem = itemSubtotal + itemShip + itemTax;

          const sellerObj = item.seller || null;
          let sellerId = 'default_seller';
          let sellerEmail = null;
          if (sellerObj) {
            if (typeof sellerObj === 'string') {
              sellerId = sellerObj;
            } else if (typeof sellerObj === 'object') {
              sellerId = sellerObj._id || sellerObj.id || 'default_seller';
              sellerEmail = sellerObj.email || null;
            }
          }

          storedOrders.push({
            orderId: generatedCode,
            billId,
            sellerId,
            sellerEmail,
            userId: buyerUserId,
            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            createdAt: new Date().toISOString(),
            items: [{
              productId: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              brand: item.brand,
              img: item.img,
              seller: item.seller || { name: item.brand || 'Emahu Seller', email: 'support@emahu.com', phone: '+91 99999 99999' }
            }],
            total: grandTotalItem,
            distanceKm: deliveryDistance,
            deliveryCharge: shippingFee,
            status: 'PENDING_APPROVAL',
            timeline: [
              { status: 'PENDING_APPROVAL', label: 'Payment Completed', desc: '⏳ Waiting for Seller Approval', date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }
            ],
            deliveryAddress: {
              fullName: 'Guest Customer',
              phone: '+91 99999 99999',
              email: 'guest@emahu.com',
              address: localStorage.getItem('emahu_buyer_full_address') || buyerCity || 'Emahu Hub Office',
              city: buyerCity || 'Ahmedabad',
              stateName: localStorage.getItem('emahu_buyer_state') || 'Gujarat',
              pincode: localStorage.getItem('emahu_buyer_pincode') || '380001'
            },
            shippingSpeed: 'standard',
            escrowMethod: 'wallet'
          });
        });

        setTransactionCode(placedCodes.join(', '));
        localStorage.setItem('emahu_orders', JSON.stringify(storedOrders));
      } catch (err) {
        console.error(err);
      }

      setCartItems([]);
      localStorage.setItem('emahu_cart', JSON.stringify([]));
      window.dispatchEvent(new Event('storage'));
      setCheckoutStep('success');
    }, 2800);
  };

  return (
    <div className="cart-page">
      <BuyerHeader />

      {/* Breadcrumb */}
      <nav className="cart-breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/buyer/products">Buyer</Link>
        <span>/</span>
        <span style={{ color: '#1a1a1a' }}>Shopping Cart</span>
      </nav>

      {/* Main Container */}
      <main className="cart-container">
        {/* Main Header with Clear Cart */}
        <div className="cart-page-header">
          <div>
            <h1 className="cart-title">Your Secure Shopping Cart</h1>
            <p className="cart-subtitle">
              All orders are routed via localized physical verification hubs and protected in locked Escrow vaults.
            </p>
          </div>
          {cartItems.length > 0 && (
            <button className="cart-clear-all-btn" onClick={handleClearCart}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              <span>Clear Cart</span>
            </button>
          )}
        </div>

        {cartItems.length === 0 && checkoutStep === 'idle' ? (
          /* Empty State */
          <div className="cart-empty-card">
            <div className="cart-empty-icon-wrap">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <h2>Your Shopping Cart is Empty</h2>
            <p>You haven&apos;t locked in any certified products yet. Explore the products store to secure your first order.</p>
            <Link href="/buyer/products" className="cart-explore-btn">
              Explore Products Catalog
            </Link>
          </div>
        ) : (
          /* Two Column Bento Grid layout */
          <div className="cart-grid">

            {/* Left: Items list */}
            <div className="cart-items-list">
              {cartItems.map(p => (
                <div key={p.id} className={`cart-item-row ${removingId === p.id || isClearingAll ? 'cart-item-row--removing' : ''}`}>

                  {/* Thumbnail Image */}
                  <div className="cart-item-row__img-wrap">
                    {isRealImage(p.img) ? (
                      <img src={p.img} alt={p.name} className="cart-item-row__img" />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', background: '#f4f4f5', borderRadius: '8px', fontSize: '2rem' }}>
                        {p.img || '📦'}
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="cart-item-row__details">
                    <span className="cart-item-row__brand">{p.brand}</span>
                    <h3 className="cart-item-row__name">
                      <Link href={`/buyer/products/${p.id}`}>{p.name}</Link>
                    </h3>
                    <div className="cart-item-row__specs">
                      {p.selectedSize && p.selectedSize !== 'Default' ? (
                        <span>Variant: <strong>{p.selectedSize}</strong></span>
                      ) : (
                        p.selectedColor && p.selectedColor !== 'Default' && p.selectedColor !== 'Premium Black' && (
                          <span>Color: <strong>{p.selectedColor}</strong></span>
                        )
                      )}
                    </div>
                    {/* Stock availability badge */}
                    {p.stock <= 0 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: '700', color: '#dc2626', background: 'rgba(220,38,38,0.08)', borderRadius: '6px', padding: '2px 8px', marginTop: '4px' }}>
                        ✕ Out of Stock
                      </span>
                    ) : p.stock <= 5 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: '700', color: '#d97706', background: 'rgba(217,119,6,0.08)', borderRadius: '6px', padding: '2px 8px', marginTop: '4px' }}>
                        ⚡ Only {p.stock} left in stock
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: '700', color: '#16a34a', background: 'rgba(22,163,74,0.08)', borderRadius: '6px', padding: '2px 8px', marginTop: '4px' }}>
                        ✓ In Stock ({p.stock} available)
                      </span>
                    )}
                    {p.verified && (
                      <span className="cart-item-row__verified">
                        🛡️ 100% EMAHU Hub Verified
                      </span>
                    )}
                  </div>

                  {/* Quantity controls — capped at stock */}
                  <div className="cart-item-row__qty">
                    <span className="cart-qty-label">QTY</span>
                    <div className="cart-qty-controls">
                      <button
                        onClick={() => handleQuantityChange(p.id, -1)}
                        aria-label="Decrease Qty"
                        disabled={p.quantity <= 1}
                        style={{ opacity: p.quantity <= 1 ? 0.4 : 1 }}
                      >
                        −
                      </button>
                      <span>{p.stock <= 0 ? 0 : p.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(p.id, 1)}
                        aria-label="Increase Qty"
                        disabled={p.stock <= 0 || p.quantity >= p.stock}
                        style={{ opacity: (p.stock <= 0 || p.quantity >= p.stock) ? 0.4 : 1 }}
                        title={p.quantity >= p.stock ? `Max ${p.stock} units available from seller` : ''}
                      >
                        +
                      </button>
                    </div>
                    {p.quantity >= p.stock && p.stock > 0 && (
                      <span style={{ fontSize: '0.68rem', color: '#d97706', marginTop: '4px', display: 'block', textAlign: 'center' }}>
                        Max qty
                      </span>
                    )}
                  </div>

                  {/* Total price calculation */}
                  <div className="cart-item-row__price-block">
                    <div className="cart-item-row__price">
                      ₹{(p.price * p.quantity).toLocaleString('en-IN')}
                    </div>
                    <div className="cart-item-row__rate">
                      ₹{p.price.toLocaleString('en-IN')} each
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    className="cart-item-row__remove"
                    onClick={() => handleRemove(p.id)}
                    aria-label="Remove item"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>

                </div>
              ))}

              {/* Cross-selling suggestions (shows only when 1 item in cart) */}
              {cartSuggestions.length > 0 && (
                <div style={{ marginTop: '24px', background: '#fafafa', border: '1px dashed #cbd5e1', borderRadius: '16px', padding: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🔥 Complete Your Delivery
                  </h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.76rem', color: '#64748b', lineHeight: '1.4' }}>
                    Add these matching products to your cart for combined shipping!
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    {cartSuggestions.map((s, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ width: '100%', height: '110px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', marginBottom: '10px' }}>
                            {isRealImage(s.img) ? (
                              <img src={s.img} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '2.5rem' }}>{s.img || '📦'}</span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '750' }}>{s.brand}</p>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', fontWeight: '700', color: '#0f172a', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', height: '38px', lineHeight: '1.2' }}>{s.name}</p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '850', color: '#4169e1' }}>₹{s.price.toLocaleString('en-IN')}</span>
                          <button
                            type="button"
                            onClick={() => handleAddSuggestionToCart(s)}
                            style={{
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              borderRadius: '6px',
                              padding: '5px 10px',
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
                </div>
              )}
            </div>

            {/* Right: Order Summary Bento card */}
            <div className="cart-summary-bento">
              <h2 className="cart-summary-title">Order Safety Summary</h2>

              {/* ── GPS Location Detection ── */}
              <div style={{ marginBottom: '16px', padding: '14px', background: 'rgba(65,105,225,0.06)', borderRadius: '10px', border: '1px solid rgba(65,105,225,0.15)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#4169e1', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4169e1" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  DELIVERY LOCATION
                </div>

                {buyerCoordinates.latitude && buyerCoordinates.longitude ? (
                  /* Location detected card */
                  <div style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          Location Pin Verified
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: '600', lineHeight: 1.5 }}>
                          📍 {buyerCity || 'Location Pinned'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px', lineHeight: 1.5 }}>
                    Share your location for an accurate delivery charge calculated from the seller's shop to your doorstep.
                  </p>
                )}

                {/* Detect / Update / Clear buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleGPSDetect}
                    disabled={gpsLoading}
                    style={{
                      flex: 1,
                      padding: '9px 0',
                      background: gpsLoading ? '#e2e8f0' : '#4169e1',
                      color: gpsLoading ? '#94a3b8' : '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      cursor: gpsLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {gpsLoading ? (
                      <>
                        <span style={{ width: '12px', height: '12px', border: '2px solid #94a3b8', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                        Detecting...
                      </>
                    ) : buyerCoordinates.latitude ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        Update Location
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        Detect My Location
                      </>
                    )}
                  </button>

                  {/* Clear button — only shown when location is set */}
                  {buyerCoordinates.latitude && (
                    <button
                      onClick={() => {
                        setBuyerCoordinates({ latitude: '', longitude: '' });
                        setBuyerCity('');
                        localStorage.removeItem('emahu_buyer_coordinates');
                        localStorage.removeItem('emahu_buyer_city');
                      }}
                      style={{ padding: '9px 12px', background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      title="Clear location"
                    >
                      ✕ Clear
                    </button>
                  )}
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>


              <div className="cart-summary-rows">
                <div className="cart-summary-row">
                  <span>Subtotal ({cartItems.reduce((acc, p) => acc + p.quantity, 0)} items)</span>
                  <strong>₹{subtotal.toLocaleString('en-IN')}</strong>
                </div>

                {/* Delivery charge row */}
                <div className="cart-summary-row">
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span>Certified Inspection & Transit Shipping</span>
                    {deliveryDistance > 0 && (
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        📏 Distance: {deliveryDistance.toFixed(1)} KM
                      </span>
                    )}
                    {!buyerCoordinates.latitude && (
                      <span style={{ fontSize: '0.71rem', color: '#94a3b8' }}>
                        Share location for exact charge
                      </span>
                    )}
                    {deliveryError && (
                      <span style={{ fontSize: '0.71rem', color: '#ef4444' }}>
                        ⚠ {deliveryError}
                      </span>
                    )}
                  </span>
                  <strong>
                                        {deliveryCalculating ? (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>calculating...</span>
                    ) : (
                      shippingFee === 0 ? <span style={{ color: '#16a34a', fontWeight: '700' }}>FREE Delivery</span> : `₹${shippingFee}`
                    )}
                  </strong>
                </div>

                {/* Per-seller breakdown */}
                {shippingFee > 0 && deliveryBreakdown.length > 1 && (
                  <div style={{ background: 'rgba(100,116,139,0.05)', borderRadius: '8px', padding: '10px', marginTop: '-4px', marginBottom: '4px' }}>
                    <p style={{ fontSize: '0.71rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Seller Breakdown</p>
                    {deliveryBreakdown.map((b, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', padding: '3px 0' }}>
                        <span>{b.sellerName} — {b.distanceKm} km</span>
                        <span style={{ fontWeight: '600' }}>₹{b.deliveryCharge}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div 
                  className="cart-summary-row" 
                  onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Service Fees {showTaxBreakdown ? '▲' : '▼'}
                  </span>
                  <strong>₹{taxAmount.toLocaleString('en-IN')}</strong>
                </div>

                {showTaxBreakdown && (
                  <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', marginTop: '-4px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569', padding: '3px 0' }}>
                      <span>CGST (9%)</span>
                      <strong style={{ fontWeight: '600' }}>₹{cgstAmount.toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569', padding: '3px 0' }}>
                      <span>SGST (9%)</span>
                      <strong style={{ fontWeight: '600' }}>₹{sgstAmount.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                )}

                <div className="cart-summary-divider" />

                <div className="cart-summary-row cart-summary-row--total">
                  <span>Total Amount</span>
                  <strong>₹{grandTotal.toLocaleString('en-IN')}</strong>
                </div>
              </div>



              {/* Large Matte Checkout Button */}
              {hasDeliveredOrder && (
                <div style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1.5px solid #dc2626',
                  borderRadius: '10px',
                  padding: '14px',
                  marginBottom: '16px',
                  fontSize: '0.8rem',
                  color: '#991b1b',
                  fontWeight: '600',
                  lineHeight: '1.4',
                  boxShadow: '0 2px 8px rgba(220,38,38,0.08)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#dc2626', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>!</span>
                    <strong style={{ color: '#dc2626' }}>Escrow Vault Confirmation Required</strong>
                  </div>
                  Please inspect and confirm delivery of your arrived order <strong>#{deliveredOrderId}</strong> before placing any new orders.
                  <button 
                    onClick={() => window.location.href = '/buyer/orders'}
                    style={{
                      marginTop: '10px',
                      background: '#dc2626',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'block',
                      width: '100%',
                      textAlign: 'center',
                      boxShadow: '0 2px 4px rgba(220,38,38,0.2)'
                    }}
                  >
                    Go to My Orders to Confirm Receipt
                  </button>
                </div>
              )}

              <button 
                onClick={(e) => {
                  if (hasDeliveredOrder) {
                    e.preventDefault();
                    alert(`Checkout Blocked: Please confirm receipt of your arrived order #${deliveredOrderId} before placing a new order.`);
                    return;
                  }
                  if (!buyerCoordinates.latitude || !buyerCoordinates.longitude) {
                    e.preventDefault();
                    alert('Location Required: You must share your GPS location to calculate transit delivery fee before proceeding to checkout.');
                    return;
                  }
                  window.location.href = '/buyer/checkout';
                }}
                disabled={hasDeliveredOrder}
                className="cart-checkout-btn" 
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  border: 'none',
                  cursor: hasDeliveredOrder ? 'not-allowed' : 'pointer',
                  opacity: hasDeliveredOrder ? 0.5 : 1,
                  background: hasDeliveredOrder ? '#94a3b8' : ''
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Proceed to Checkout</span>
              </button>

            </div>

          </div>
        )}
      </main>

      {/* ─── SECURE ESCROW CHECKOUT MODAL OVERLAY ─── */}
      {checkoutStep !== 'idle' && (
        <div className="cart-modal-overlay">
          <div className="cart-modal">

            {checkoutStep === 'securing' && (
              <div className="cart-securing-state">
                <div className="cart-rotating-vault">
                  <div className="cart-rotating-ring" />
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4169e1" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h2>Securing Vault Lock Pipeline...</h2>
                <p>Transferring payment of <strong>₹{grandTotal.toLocaleString('en-IN')}</strong> safely into military-grade escrow holdings vault.</p>
                <div className="cart-progress-bar">
                  <div className="cart-progress-fill" />
                </div>
              </div>
            )}

            {checkoutStep === 'success' && (
              <div className="cart-success-state">
                <div className="cart-success-icon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2>Escrow Transaction Locked!</h2>
                <p className="cart-success-desc">
                  Your funds are secured completely! The merchant has been ordered to dispatch the delivery. Funds are locked and will be sent to the merchant only after your doorstep delivery approval check.
                </p>
                <div className="cart-order-receipt">
                  <div className="receipt-row">
                    <span>Transaction Code:</span>
                    <strong>{transactionCode}</strong>
                  </div>
                  <div className="receipt-row">
                    <span>Vault Guaranteed Total:</span>
                    <strong style={{ color: '#10b981' }}>₹{grandTotal.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="receipt-row">
                    <span>Courier Transit:</span>
                    <strong>Carbon-Neutral EV Express</strong>
                  </div>
                </div>
                <div className="cart-success-actions">
                  <Link href="/buyer/products" className="wl-btn-outline" onClick={() => setCheckoutStep('idle')} style={{ textDecoration: 'none', textAlign: 'center' }}>
                    Keep Buying Products
                  </Link>
                  <Link href="/buyer/products" className="wl-btn-solid" onClick={() => setCheckoutStep('idle')} style={{ textDecoration: 'none', textAlign: 'center' }}>
                    Back to Home Screen
                  </Link>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
