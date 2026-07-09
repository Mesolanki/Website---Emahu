'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import BuyerHeader from '@/components/buyer_home/buyer_header';
import { logAnalyticsEvent } from '@/utils/analytics';
import './checkout.css';

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

export default function CheckoutPage() {
  const [cartItems, setCartItems] = useState([]);
  const [shippingSpeed, setShippingSpeed] = useState('standard'); // standard | express
  const [escrowMethod, setEscrowMethod] = useState('wallet'); // wallet | card | upi
  const [checkoutStep, setCheckoutStep] = useState('idle'); // idle | securing | success
  const [generatedOrderId, setGeneratedOrderId] = useState('');
  const [orderSellers, setOrderSellers] = useState([]);
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [addressType, setAddressType] = useState('saved'); // saved | manual

  // Distance calculation states
  const [deliveryCharge, setDeliveryCharge] = useState(99);
  const [deliveryDistance, setDeliveryDistance] = useState(0);
  const [deliveryBreakdown, setDeliveryBreakdown] = useState([]);
  const [maxDistanceExceeded, setMaxDistanceExceeded] = useState(false);
  const [deliveryCalculationError, setDeliveryCalculationError] = useState('');
  const [buyerCoordinates, setBuyerCoordinates] = useState({ latitude: '', longitude: '' });
  const [deliverySettings, setDeliverySettings] = useState({
    maxDeliveryDistance: 100,
    expressDeliverySurcharge: 100
  });
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [termsModalContent, setTermsModalContent] = useState('');
  const [availableProducts, setAvailableProducts] = useState([]);

  const handleOpenTermsModal = (type) => {
    setTermsModalContent(type);
    setIsTermsModalOpen(true);
  };
  const checkoutMapRef = useRef(null);
  const routePolylineRef = useRef(null);
  const buyerMarkerRef = useRef(null);
  const sellerMarkersRef = useRef([]);

  // Fetch delivery settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/delivery/settings`);
        const data = await res.json();
        if (data.success && data.settings) {
          setDeliverySettings(data.settings);
        }
      } catch (err) {
        console.error('Failed to fetch delivery settings:', err);
      }
    };
    fetchSettings();
  }, []);

  // ── Block checkout if buyer has an unconfirmed arrived order ──
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
            alert(`Checkout Blocked: You must inspect and confirm delivery of your arrived order #${unconfirmed.orderId} before placing a new order.`);
            window.location.href = '/buyer/orders';
          }
        }
      } catch (err) {
        console.warn('Error checking delivered orders in checkout page:', err);
      }
      */
    };
    checkDeliveredOrders();
  }, []);

  // Leaflet CDNs lazy loader
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setLeafletLoaded(true);
      document.head.appendChild(script);
    } else {
      setLeafletLoaded(true);
    }
  }, []);

  function getHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function detectCityAndState(address) {
    if (!address || typeof address !== 'string') return { city: '', state: '' };
    const lower = address.toLowerCase();
    
    const list = [
      { city: 'Ahmedabad', state: 'Gujarat', aliases: ['ahmedabad', 'amdavad', 'ghatlodiya', 'bopal', 'maninagar', 'navrangpura', 'vastrapur', 'satellite', 'bodakdev', 'prahlad nagar', 'chandkheda', 'motera', 'sabarmati', 'nikol', 'naranpura', 'gota', 'shela', 'thaltej', 'vastral', 'odhav', 'gandhinagar', 'sanand'] },
      { city: 'Surat', state: 'Gujarat', aliases: ['surat', 'adajan', 'vesu', 'katargam', 'varachha', 'althan', 'citylight', 'pal', 'piplod', 'dindoli', 'udhna', 'rander', 'bhestan'] },
      { city: 'Rajkot', state: 'Gujarat', aliases: ['rajkot', 'kalavad road', 'gondal road'] },
      { city: 'Vadodara', state: 'Gujarat', aliases: ['vadodara', 'baroda', 'alkapuri', 'manjalpur', 'waghodia'] },
      { city: 'Mumbai', state: 'Maharashtra', aliases: ['mumbai', 'bombay', 'bandra', 'andheri', 'dadar', 'thane', 'navi mumbai', 'kurla', 'mulund', 'worli', 'lower parel'] },
      { city: 'Pune', state: 'Maharashtra', aliases: ['pune', 'pimpri', 'chinchwad', 'kothrud', 'hadapsar', 'wakad', 'aundh', 'baner'] },
      { city: 'Nagpur', state: 'Maharashtra', aliases: ['nagpur'] },
      { city: 'Delhi', state: 'Delhi', aliases: ['delhi', 'new delhi', 'old delhi', 'dwarka', 'rohini', 'noida', 'gurugram', 'gurgaon', 'faridabad'] },
      { city: 'Bangalore', state: 'Karnataka', aliases: ['bangalore', 'bengaluru', 'koramangala', 'indiranagar', 'whitefield', 'marathahalli', 'jayanagar', 'electronic city'] },
      { city: 'Chennai', state: 'Tamil Nadu', aliases: ['chennai', 'madras', 'anna nagar', 'adyar', 'velachery', 't. nagar', 'porur'] },
      { city: 'Kolkata', state: 'West Bengal', aliases: ['kolkata', 'calcutta', 'salt lake', 'howrah', 'jadavpur', 'new town'] },
      { city: 'Hyderabad', state: 'Telangana', aliases: ['hyderabad', 'secunderabad', 'banjara hills', 'jubilee hills', 'gachibowli', 'hitech city', 'kondapur', 'madhapur'] },
      { city: 'Jaipur', state: 'Rajasthan', aliases: ['jaipur'] },
      { city: 'Lucknow', state: 'Uttar Pradesh', aliases: ['lucknow', 'gomti nagar'] },
      { city: 'Chandigarh', state: 'Punjab', aliases: ['chandigarh', 'mohali', 'panchkula'] }
    ];
    
    for (const item of list) {
      const terms = item.aliases || [item.city];
      for (const term of terms) {
        if (lower.includes(term.toLowerCase())) {
          return { city: item.city, state: item.state };
        }
      }
    }
    return { city: '', state: '' };
  }

  // Update/draw Leaflet map showing buyer/seller connection routes
  useEffect(() => {
    if (!leafletLoaded || typeof window === 'undefined' || !window.L) return;
    
    const container = document.getElementById('checkout-route-map');
    if (!container) return;
    
    const bLat = parseFloat(buyerCoordinates.latitude);
    const bLon = parseFloat(buyerCoordinates.longitude);
    
    if (isNaN(bLat) || isNaN(bLon)) return;
    
    // Determine seller coordinates
    let sellerLocations = cartItems.map(item => {
      const sellerObj = item.seller;
      const sLat = (sellerObj && sellerObj.latitude !== undefined && sellerObj.latitude !== null) ? sellerObj.latitude : null;
      const sLon = (sellerObj && sellerObj.longitude !== undefined && sellerObj.longitude !== null) ? sellerObj.longitude : null;
      const sName = (sellerObj && (sellerObj.storeName || sellerObj.name)) || 'Emahu Seller';
      return { latitude: sLat, longitude: sLon, name: sName };
    });

    // Use only valid locations that have real coordinates
    const realLocations = sellerLocations.filter(loc => loc.latitude !== null && loc.longitude !== null);
    if (realLocations.length > 0) {
      sellerLocations = realLocations;
    } else {
      // If no item has real coordinates, use the single default location as a fallback
      sellerLocations = [{ latitude: 23.0225, longitude: 72.5714, name: 'Emahu Seller' }];
    }
    
    if (!checkoutMapRef.current) {
      checkoutMapRef.current = window.L.map('checkout-route-map').setView([bLat, bLon], 10);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(checkoutMapRef.current);
    }
    
    if (routePolylineRef.current) {
      checkoutMapRef.current.removeLayer(routePolylineRef.current);
    }
    if (buyerMarkerRef.current) {
      checkoutMapRef.current.removeLayer(buyerMarkerRef.current);
    }
    sellerMarkersRef.current.forEach(marker => {
      checkoutMapRef.current.removeLayer(marker);
    });
    sellerMarkersRef.current = [];
    
    buyerMarkerRef.current = window.L.marker([bLat, bLon], {
      icon: window.L.divIcon({
        className: 'buyer-marker-icon',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; width: 80px; height: 42px;">
            <div style="background-color: #3b82f6; color: white; font-size: 11px; font-weight: 800; padding: 2px 7px; border-radius: 5px; white-space: nowrap; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); line-height: 1.2;">
              Buyer (You)
            </div>
            <div style="background-color: #3b82f6; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5); margin-top: 2px;"></div>
          </div>
        `,
        iconSize: [80, 42],
        iconAnchor: [40, 36]
      })
    }).addTo(checkoutMapRef.current).bindPopup('Your Location (Buyer)');
    
    const points = [[bLat, bLon]];
    
    sellerLocations.forEach(loc => {
      const sMarker = window.L.marker([loc.latitude, loc.longitude], {
        icon: window.L.divIcon({
          className: 'seller-marker-icon',
          html: `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; width: 90px; height: 42px;">
              <div style="background-color: #a855f7; color: white; font-size: 11px; font-weight: 800; padding: 2px 7px; border-radius: 5px; white-space: nowrap; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); line-height: 1.2;">
                Retailer (Seller)
              </div>
              <div style="background-color: #a855f7; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5); margin-top: 2px;"></div>
            </div>
          `,
          iconSize: [90, 42],
          iconAnchor: [45, 36]
        })
      }).addTo(checkoutMapRef.current).bindPopup(`Retailer: ${loc.name}`);
      
      sellerMarkersRef.current.push(sMarker);
      points.push([loc.latitude, loc.longitude]);
      
      const poly = window.L.polyline([[bLat, bLon], [loc.latitude, loc.longitude]], { color: '#4f46e5', weight: 3, dashArray: '5, 5' }).addTo(checkoutMapRef.current);
      routePolylineRef.current = poly;
    });
    
    if (points.length > 1) {
      const bounds = window.L.latLngBounds(points);
      checkoutMapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [leafletLoaded, buyerCoordinates.latitude, buyerCoordinates.longitude, cartItems]);

  const handleGPSDetect = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          
          const coords = {
            latitude: lat.toFixed(6),
            longitude: lon.toFixed(6)
          };
          setBuyerCoordinates(coords);
          localStorage.setItem('emahu_buyer_coordinates', JSON.stringify(coords));
          
          // Nominatim reverse-geocoding
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            if (data && data.address) {
              const road = data.address.road || '';
              const suburb = data.address.suburb || data.address.neighbourhood || '';
              const cityVal = data.address.city || data.address.town || data.address.village || data.address.county || data.address.state_district || '';
              const stateVal = data.address.state || '';
              const postcodeVal = data.address.postcode || data.address.postal || '';
              
              const parts = [road, suburb, cityVal, stateVal].filter(Boolean);
              let fullAddr = parts.join(', ');
              if (postcodeVal) {
                fullAddr += ` - ${postcodeVal}`;
              }
              if (!fullAddr) {
                fullAddr = data.display_name;
              }
              
              setAddress(fullAddr);
              setCity(cityVal);
              setStateName(stateVal);
              setPincode(postcodeVal);
              setAddressType('manual');
            }
          } catch (geocodingErr) {
            console.error('Reverse geocoding failed:', geocodingErr);
          }
        },
        (error) => {
          console.error(error);
          alert('GPS Geolocation request failed. Please input your coordinates manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const subtotal = cartItems.reduce((acc, p) => acc + (p.price * p.quantity), 0);

  // Dynamic delivery charge calculation
  useEffect(() => {
    const calculateCharge = async () => {
      const lat = parseFloat(buyerCoordinates.latitude);
      const lon = parseFloat(buyerCoordinates.longitude);
      if (isNaN(lat) || isNaN(lon) || !cartItems.length) {
        // Fallback standard pricing
        const standardFee = 99;
        const expressSurcharge = shippingSpeed === 'express' ? deliverySettings.expressDeliverySurcharge : 0;
        setDeliveryCharge(standardFee + expressSurcharge);
        setDeliveryDistance(0);
        setDeliveryBreakdown([]);
        setMaxDistanceExceeded(false);
        setDeliveryCalculationError('');
        return;
      }
      
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/delivery/calculate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
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
          let baseFee = data.totalDeliveryCharge;
          if (shippingSpeed === 'express') {
            baseFee += data.expressDeliverySurcharge || 100;
          }
          setDeliveryCharge(baseFee);
          setDeliveryDistance(data.maxDistanceKm);
          setDeliveryBreakdown(data.breakdown || []);
          setMaxDistanceExceeded(false);
          setDeliveryCalculationError('');
        } else {
          setDeliveryCalculationError(data.error || 'Failed to calculate delivery');
          setDeliveryBreakdown([]);
          if (data.error && data.error.includes('exceeds')) {
            setMaxDistanceExceeded(true);
          }
        }
      } catch (err) {
        console.error('Delivery calculation failed:', err);
        const standardFee = 99;
        const expressSurcharge = shippingSpeed === 'express' ? deliverySettings.expressDeliverySurcharge : 0;
        setDeliveryCharge(standardFee + expressSurcharge);
        setDeliveryDistance(0);
        setDeliveryBreakdown([]);
        setMaxDistanceExceeded(false);
      }
    };
    
    calculateCharge();
  }, [buyerCoordinates.latitude, buyerCoordinates.longitude, cartItems, shippingSpeed, deliverySettings]);

  // Load items from localstorage and backend
  const loadCheckoutData = useCallback(async () => {
    try {
      // Retrieve saved coordinates from localStorage if available
      const storedCoords = localStorage.getItem('emahu_buyer_coordinates');
      if (storedCoords) {
        try {
          setBuyerCoordinates(JSON.parse(storedCoords));
        } catch (e) {}
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products`);
      const data = await res.json();
      let formattedList = [];
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
            verified: true,
            isNew: true,
            isHot: false,
            onSale: p.comparePrice ? (p.price < p.comparePrice) : false,
            seller: p.seller || { name: p.brand || 'Emahu Seller', email: 'support@emahu.com', phone: '+91 99999 99999' }
          };
        });
      }

      // Combine DB products with static mock products
      const allProducts = [...formattedList, ...STATIC_PRODUCTS];
      const seen = new Set();
      const uniqueProducts = allProducts.filter(p => {
        const pid = p.id.toString();
        if (seen.has(pid)) return false;
        seen.add(pid);
        return true;
      });

      setAvailableProducts(uniqueProducts);

      const storedCart = localStorage.getItem('emahu_cart');
      if (storedCart) {
        const parsed = JSON.parse(storedCart);
        const matched = parsed.map(cItem => {
          const cItemId = typeof cItem === 'object' ? cItem.id : cItem;
          const prod = uniqueProducts.find(p => p.id.toString() === cItemId.toString());
          if (prod) {
            return {
              ...prod,
              quantity: cItem.quantity || 1,
              selectedColor: cItem.color || 'Premium Black',
              selectedSize: cItem.size || 'Regular'
            };
          }
          return null;
        }).filter(Boolean);
        setCartItems(matched);

        // Log initiate_checkout event for each item
        matched.forEach(item => {
          if (item.seller) {
            const sId = item.seller._id || item.seller.id || item.seller;
            if (sId) {
              logAnalyticsEvent({
                type: 'initiate_checkout',
                productId: item.id || item._id,
                sellerId: sId
              });
            }
          }
        });
      }

      // Auto-fill profile address if logged in
      const buyerUserStr = localStorage.getItem('emahu_buyer_user');
      if (buyerUserStr) {
        const user = JSON.parse(buyerUserStr);
        if (user) {
          setFullName(user.name || '');
          setEmail(user.email || '');
          setPhone(user.phone || '');
          setAddress(user.address || '');
          if (user.address && user.address.trim()) {
            setAddressType('saved');
          } else {
            setAddressType('manual');
          }
        } else {
          setAddressType('manual');
        }
      } else {
        setAddressType('manual');
      }
    } catch (err) {
      console.error(err);
      setAddressType('manual');
    }
  }, []);

  useEffect(() => {
    loadCheckoutData();
  }, [loadCheckoutData]);

  // Suggestions for cross-selling when there is exactly 1 item in checkout
  const checkoutSuggestions = useMemo(() => {
    if (cartItems.length !== 1 || !availableProducts.length) return [];
    const cartItem = cartItems[0];
    const cartItemId = cartItem.id.toString();

    // Try to find products of the same category
    let suggestions = availableProducts.filter(p => {
      const pid = p.id.toString();
      if (pid === cartItemId) return false;
      return p.category === cartItem.category;
    });

    if (suggestions.length === 0) {
      suggestions = availableProducts.filter(p => p.id.toString() !== cartItemId);
    }

    return suggestions.slice(0, 3);
  }, [cartItems, availableProducts]);

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
        
        loadCheckoutData();
      }
    } catch (err) {
      console.error('Failed to add suggestion:', err);
    }
  };

  const shippingFee = subtotal === 0 ? 0 : deliveryCharge;
  const taxAmount = Math.round(subtotal * 0.18); // 18% Escrow Tax
  const grandTotal = subtotal + shippingFee + taxAmount;

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    if (!agreeToTerms) {
      alert('Checkout Blocked: You must agree to the Terms & Conditions and refund policies to confirm your order.');
      return;
    }




    // Validate fields based on addressType selected
    if (addressType === 'manual') {
      if (
        !fullName.trim() ||
        !phone.trim() ||
        !email.trim() ||
        !address.trim() ||
        !city.trim() ||
        !stateName.trim() ||
        !pincode.trim()
      ) {
        alert('Please fill out all address and contact fields.');
        return;
      }
    } else {
      if (
        !fullName.trim() ||
        !phone.trim() ||
        !email.trim() ||
        !address.trim()
      ) {
        alert('Please ensure your profile has a valid name, phone, email, and address saved.');
        return;
      }
    }

    // Save unique sellers for success screen before clearing cartItems
    const sellers = cartItems.map(p => p.seller || { name: p.brand || 'Emahu Seller', email: 'support@emahu.com', phone: '+91 99999 99999' });
    const unique = Array.from(new Map(sellers.map(s => [s.email + s.name, s])).values());
    setOrderSellers(unique);

    // Step 1: Secure Escrow Locking Animation
    setCheckoutStep('securing');

    setTimeout(() => {
      // Step 2: Push to local escrow vault storage
      try {
        const storedOrdersStr = localStorage.getItem('emahu_orders') || '[]';
        const storedOrders = JSON.parse(storedOrdersStr);
        const notifications = JSON.parse(localStorage.getItem('emahu_notifications') || '[]');

        let buyerUserId = '';
        const buyerUserStr = localStorage.getItem('emahu_buyer_user');
        if (buyerUserStr) {
          try {
            buyerUserId = JSON.parse(buyerUserStr).id || JSON.parse(buyerUserStr)._id || '';
          } catch (e) {}
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
        const placedOrderIds = [];
        const orderObjects = [];

        cartItems.forEach((item, index) => {
          const orderId = `EMH_${Math.floor(100000 + Math.random() * 900000)}`;
          placedOrderIds.push(orderId);

          const subtotal = item.price * item.quantity;
          
          const bLat = parseFloat(buyerCoordinates.latitude);
          const bLon = parseFloat(buyerCoordinates.longitude);
          
          let itemDistance = 0;
          let itemDeliveryFee = 99;
          
          const sellerObj = item.seller || null;
          const sLat = (sellerObj && sellerObj.latitude !== undefined && sellerObj.latitude !== null) ? sellerObj.latitude : 23.0225;
          const sLon = (sellerObj && sellerObj.longitude !== undefined && sellerObj.longitude !== null) ? sellerObj.longitude : 72.5714;
          
          if (!isNaN(bLat) && !isNaN(bLon)) {
            itemDistance = getHaversineDistance(bLat, bLon, sLat, sLon);
            const matchedSlab = deliverySettings.slabs?.find(slab => itemDistance >= slab.fromKm && itemDistance < slab.toKm);
            itemDeliveryFee = matchedSlab ? matchedSlab.charge : 99;
            if (shippingSpeed === 'express') {
              itemDeliveryFee += deliverySettings.expressDeliverySurcharge || 100;
            }
          } else {
            // standard fallback
            itemDeliveryFee = 99;
            if (shippingSpeed === 'express') {
              itemDeliveryFee += 100;
            }
          }

          const taxAmount = Math.round(subtotal * 0.18);
          const grandTotal = subtotal + itemDeliveryFee + taxAmount;

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

          const newOrderPayload = {
            orderId: orderId,
            billId: billId,
            sellerId: sellerId,
            sellerEmail: sellerEmail,
            userId: buyerUserId,
            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            createdAt: new Date().toISOString(),
            items: [{
              productId: item.id || item._id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              brand: item.brand,
              img: item.img,
              seller: item.seller || { name: item.brand || 'Emahu Seller', email: 'support@emahu.com', phone: '+91 99999 99999' }
            }],
            total: grandTotal,
            status: 'PENDING_APPROVAL',
            timeline: [
              { status: 'PENDING_APPROVAL', label: 'Payment Completed', desc: '⏳ Waiting for Seller Approval', date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }
            ],
            deliveryAddress: {
              fullName,
              phone,
              email,
              address,
              city: addressType === 'saved' ? (detectCityAndState(address).city || 'Ahmedabad') : city,
              stateName: addressType === 'saved' ? (detectCityAndState(address).state || 'Gujarat') : stateName,
              pincode: addressType === 'saved' ? (address.match(/\b\d{6}\b/)?.[0] || '380001') : pincode
            },
            shippingSpeed,
            escrowMethod,
            buyerLocation: {
              latitude: !isNaN(bLat) ? bLat : undefined,
              longitude: !isNaN(bLon) ? bLon : undefined,
              address: address
            },
            sellerLocation: {
              shopName: (sellerObj && (sellerObj.storeName || sellerObj.name)) || 'Emahu Seller',
              latitude: sLat,
              longitude: sLon,
              address: (sellerObj && sellerObj.address) || 'Ahmedabad, Gujarat'
            },
            distanceKm: parseFloat(itemDistance.toFixed(2)),
            deliveryCharge: itemDeliveryFee,
            productAmount: subtotal,
            totalPaid: grandTotal
          };

          orderObjects.push(newOrderPayload);

          // Push Notifications
          notifications.unshift({
            id: `notif_${Date.now()}_buyer_${orderId}_${index}`,
            title: 'Payment Success',
            message: `Your payment of ₹${grandTotal.toLocaleString('en-IN')} has been locked. Waiting for seller approval for Order #${orderId}.`,
            role: 'buyer',
            date: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            read: false
          });
          notifications.unshift({
            id: `notif_${Date.now()}_seller_${orderId}_${index}`,
            title: 'New Order Received',
            message: `New order received. Approval required for Order #${orderId}.`,
            role: 'seller',
            date: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            read: false
          });
        });

        // Insert into database and await it
        (async () => {
          try {
            for (const orderData of orderObjects) {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/orders`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
              });
              const data = await res.json();
              if (!data.success) {
                throw new Error(data.error || 'Failed to insert order into database');
              }
            }

            // Sync to local storage
            orderObjects.forEach(o => storedOrders.push(o));
            setGeneratedOrderId(placedOrderIds.join(', '));
            localStorage.setItem('emahu_orders', JSON.stringify(storedOrders));
            localStorage.setItem('emahu_notifications', JSON.stringify(notifications));

            // Step 3: Clear Cart
            setCartItems([]);
            localStorage.setItem('emahu_cart', JSON.stringify([]));
            window.dispatchEvent(new Event('storage'));

            // Move to success step
            setCheckoutStep('success');
          } catch (dbErr) {
            console.error('DATABASE INSERT FAILURE:', dbErr);
            alert('Failed to place order: ' + dbErr.message);
            setCheckoutStep('idle');
          }
        })();
      } catch (err) {
        console.error(err);
        setCheckoutStep('idle');
      }
    }, 2800);
  };

  return (
    <div className="co-page">
      <BuyerHeader />

      {/* Breadcrumb */}
      <nav className="co-breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/buyer/products">Buyer</Link>
        <span>/</span>
        <Link href="/buyer/cart">Cart</Link>
        <span>/</span>
        <span style={{ color: '#1a1a1a' }}>Checkout with Emahu Team</span>
      </nav>

      <main className="co-container">
        {checkoutStep === 'success' ? (
          /* ESCROW SUCCESSFUL GUARANTEE SCREEN */
          <div className="co-success-card">
            <div className="co-success-badge-pulse">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                <path d="M12 15v3" />
                <circle cx="12" cy="15" r="1" />
              </svg>
            </div>
            <h2>Payment Secured with Emahu Team Successfully!</h2>
            <p className="co-success-desc">
              Transaction ID <strong>{generatedOrderId}</strong> has been secured with Emahu Team. 
              The merchant will be notified to package and route your products via our EV Transit grid. 
              Your payment remains protected with Emahu Team until you physically inspect and approve delivery!
            </p>
            
            <div className="co-success-summary-box">
              <div className="co-summary-box-row">
                <span>Buyer Account:</span>
                <strong>{fullName}</strong>
              </div>
              <div className="co-summary-box-row">
                <span>Shipping Priority:</span>
                <strong style={{ textTransform: 'uppercase' }}>{shippingSpeed} Delivery</strong>
              </div>
              <div className="co-summary-box-row">
                <span>Locked Amount:</span>
                <strong style={{ color: '#4169e1', fontSize: '1.1rem' }}>₹{grandTotal.toLocaleString('en-IN')}</strong>
              </div>

              {orderSellers.map((seller, sIdx) => (
                <div key={sIdx} className="co-seller-info-block" style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '12px', marginTop: '12px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: '600', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.9rem' }}>🚚 Your delivery is handled by:</span>
                    <strong style={{ color: '#4169e1' }}>{seller.name || 'Emahu Seller'}</strong>
                  </div>
                  <div style={{ color: '#475569', fontSize: '0.85rem', paddingLeft: '4px' }}>
                    <span>Email: <strong>{seller.email || 'N/A'}</strong></span>
                  </div>
                </div>
              ))}
            </div>

            <div className="co-success-actions">
              <Link href="/buyer/products" className="co-btn-outline">
                Continue Shopping
              </Link>
              <Link href="/buyer/orders" className="co-btn-solid">
                Go to My Orders
              </Link>
            </div>
          </div>
        ) : (
          /* CHECKOUT FORM AND SUMMARY GRID */
          <div className="co-grid">
            
            {/* Left: Secure checkout inputs form */}
            <div className="co-form-section">
              <h1 className="co-section-title">Secure Payment with Emahu Team</h1>
              
              {/* GPS Verification Status Banner */}
              {(!buyerCoordinates.latitude || !buyerCoordinates.longitude) ? (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1.5px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontWeight: '800', fontSize: '0.95rem' }}>
                    <span>⚠️ Share GPS Location (Optional)</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                    Please share your GPS location to automatically calculate dynamic delivery fees based on distance. Otherwise, a standard flat rate will be applied.
                  </p>
                  <button
                    type="button"
                    onClick={handleGPSDetect}
                    className="co-btn-outline"
                    style={{
                      width: 'max-content',
                      padding: '8px 14px',
                      fontSize: '0.82rem',
                      fontWeight: '800',
                      borderColor: '#dc2626',
                      color: '#dc2626',
                      background: 'white'
                    }}
                  >
                    📡 Share Current GPS Location
                  </button>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1.5px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '12px',
                  padding: '12px 18px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: '750', fontSize: '0.88rem' }}>
                    <span>✓ GPS Location Verified</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGPSDetect}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#059669',
                      textDecoration: 'underline',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Update Location
                  </button>
                </div>
              )}

              {/* Show live route map if coordinates exist */}
              {buyerCoordinates.latitude && buyerCoordinates.longitude && (
                <div style={{ marginBottom: '20px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '6px' }}>Live Transit Route Map</span>
                  <div id="checkout-route-map" style={{ height: '240px', width: '100%', borderRadius: '12px', border: '1px solid #cbd5e1', zIndex: 1 }} />
                </div>
              )}

              <form onSubmit={handlePlaceOrder} className="co-form">
                                {addressType === 'saved' ? (
                  /* Option A: Saved Profile Address Summary Card */
                  <div className="co-form-bento">
                    <div className="co-bento-header">
                      <span className="co-bento-num">01</span>
                      <h3>Recipient & Delivery Details</h3>
                    </div>
                    
                    <div style={{ padding: '24px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid #e2e8f0', marginTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.5px', color: '#10b981', background: '#ecfdf5', padding: '5px 10px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>✓ USING PROFILE ADDRESS</span>
                        <button type="button" onClick={() => setAddressType('manual')} style={{ fontSize: '0.82rem', fontWeight: '750', color: '#4169e1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                          Use Different / New Address
                        </button>
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: '750', color: '#0f172a', marginBottom: '4px' }}>{fullName}</div>
                      <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '12px' }}>
                        <span style={{ marginRight: '16px' }}>📞 {phone}</span>
                        <span>✉ {email}</span>
                      </div>
                      <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '12px', marginTop: '12px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Delivery Address</span>
                        <strong style={{ fontSize: '0.92rem', color: '#1e293b', lineHeight: '1.5' }}>📍 {address || 'No address saved in profile.'}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Option B: Manual Input Address Form */
                  <>
                    {/* Section 1: Contact Details */}
                    <div className="co-form-bento">
                      <div className="co-bento-header">
                        <span className="co-bento-num">01</span>
                        <h3>Recipient Contact Details</h3>
                      </div>
                      
                      {localStorage.getItem('emahu_buyer_user') && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                          <button type="button" onClick={() => setAddressType('saved')} style={{ fontSize: '0.82rem', fontWeight: '750', color: '#4169e1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                            Use Saved Profile Address
                          </button>
                        </div>
                      )}
                      
                      <div className="co-input-group">
                        <label>Full Legal Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Rahul Sharma" 
                          required 
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </div>

                      <div className="co-input-row">
                        <div className="co-input-group">
                          <label>Active Contact Phone</label>
                          <input 
                            type="tel" 
                            placeholder="e.g. +91 98765 43210" 
                            required 
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </div>
                        <div className="co-input-group">
                          <label>Email Address</label>
                          <input 
                            type="email" 
                            placeholder="e.g. rahul@example.com" 
                            required 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Delivery Destination */}
                    <div className="co-form-bento">
                      <div className="co-bento-header">
                        <span className="co-bento-num">02</span>
                        <h3>Physical Transit Destination</h3>
                      </div>
                      
                      <div className="co-input-group">
                        <label>Street Address, Building, Floor</label>
                        <input 
                          type="text" 
                          placeholder="House No, Suite, Colony, Sector..." 
                          required 
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                        />
                      </div>

                      <div className="co-input-row-three">
                        <div className="co-input-group">
                          <label>City</label>
                          <input 
                            type="text" 
                            placeholder="e.g. New Delhi" 
                            required 
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                          />
                        </div>
                        <div className="co-input-group">
                          <label>State</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Delhi" 
                            required 
                            value={stateName}
                            onChange={(e) => setStateName(e.target.value)}
                          />
                        </div>
                        <div className="co-input-group">
                          <label>Postal Pincode</label>
                          <input 
                            type="text" 
                            placeholder="e.g. 110001" 
                            required 
                            value={pincode}
                            onChange={(e) => setPincode(e.target.value)}
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button 
                          type="button" 
                          className="co-btn-outline" 
                          onClick={handleGPSDetect}
                          style={{ width: 'max-content', padding: '10px 16px', fontSize: '0.85rem', fontWeight: '700' }}
                        >
                          📡 Autofill with Current Location (GPS)
                        </button>
                        
                        {deliveryCalculationError && (
                          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.82rem', fontWeight: '600' }}>
                            ⚠️ {deliveryCalculationError}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}


                {/* Terms & Conditions Checkbox */}
                <div className="co-terms-wrap-mobile" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '16px 0 16px 0', padding: '0 4px' }}>
                  <input 
                    id="agree-to-terms-chk-mobile"
                    type="checkbox" 
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    style={{ width: '16px', height: '16px', marginTop: '2px', cursor: 'pointer' }}
                  />
                  <label htmlFor="agree-to-terms-chk-mobile" style={{ fontSize: '0.78rem', color: '#475569', lineHeight: '1.4', cursor: 'pointer', userSelect: 'none' }}>
                    I agree to the <a href="#" onClick={(e) => { e.preventDefault(); handleOpenTermsModal('terms'); }} style={{ color: '#4169e1', textDecoration: 'underline', fontWeight: 'bold' }}>Terms of Service</a>, <a href="#" onClick={(e) => { e.preventDefault(); handleOpenTermsModal('privacy'); }} style={{ color: '#4169e1', textDecoration: 'underline', fontWeight: 'bold' }}>Privacy Policy</a>, and <a href="#" onClick={(e) => { e.preventDefault(); handleOpenTermsModal('escrow'); }} style={{ color: '#4169e1', textDecoration: 'underline', fontWeight: 'bold' }}>Emahu Team return/refund conditions</a> of Emahu Marketplace.
                  </label>
                </div>

                {/* Submit button inside mobile viewport, else hidden */}
                <button
                  type="submit"
                  className="co-btn-submit-mobile"
                  disabled={!agreeToTerms}
                  style={!agreeToTerms ? { opacity: 0.5, cursor: 'not-allowed', background: '#94a3b8' } : {}}
                >
                  {!agreeToTerms ? 'Accept Terms to Buy' : `Buy Now (₹${grandTotal.toLocaleString('en-IN')})`}
                </button>

              </form>
            </div>

            {/* Right Side: Sticky Checkout Cart Summary */}
            <div className="co-summary-section">
              <div className="co-summary-sticky-card">
                <h2 className="co-summary-title">Emahu Team Payment Details</h2>
                
                {/* Cart items listing */}
                <div className="co-items-list">
                  {cartItems.length === 0 ? (
                    <div className="co-empty-cart-summary">
                      <p>Your cart is empty. Go add some items to lock!</p>
                      <Link href="/buyer/products" className="co-explore-link">Go to Products</Link>
                    </div>
                  ) : (
                    cartItems.map((p, idx) => (
                      <div key={idx} className="co-item-row">
                        <div className="co-item-img-wrap">
                          {isRealImage(p.img) ? (
                            <img src={p.img} alt={p.name} />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#f4f4f5', fontSize: '1.5rem' }}>
                              {p.img || '📦'}
                            </div>
                          )}
                          <span className="co-item-qty-badge">{p.quantity}</span>
                        </div>
                        <div className="co-item-desc">
                          <span className="co-item-brand">{p.brand}</span>
                          <h4>{p.name}</h4>
                          <span className="co-item-specs">{p.selectedColor} • {p.selectedSize}</span>
                        </div>
                        <div className="co-item-price-block">
                          <strong>₹{(p.price * p.quantity).toLocaleString('en-IN')}</strong>
                          <span>₹{p.price.toLocaleString('en-IN')} each</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>



                <div className="co-summary-divider" />

                {/* Final Breakdown */}
                <div className="co-breakdown">

                  {/* Multi-seller notice — shown when there are 2+ sellers in cart */}
                  {deliveryBreakdown.length > 1 && (
                    <div style={{
                      background: '#eff6ff',
                      border: '1.5px solid #bfdbfe',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      marginBottom: '12px',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start'
                    }}>
                      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>📦</span>
                      <div>
                        <p style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1d4ed8', margin: '0 0 3px 0' }}>
                          {deliveryBreakdown.length} Separate Packages
                        </p>
                        <p style={{ fontSize: '0.76rem', color: '#3b82f6', margin: 0, lineHeight: 1.4 }}>
                          Your cart has items from {deliveryBreakdown.length} different sellers. Each package ships independently with its own delivery charge based on distance.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="co-breakdown-row">
                    <span>Products Subtotal</span>
                    <strong>₹{subtotal.toLocaleString('en-IN')}</strong>
                  </div>

                  <div className="co-breakdown-row">
                    <span>
                      Delivery Charges
                      {deliveryBreakdown.length > 1 && (
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '6px', fontWeight: '500' }}>
                          ({deliveryBreakdown.length} packages)
                        </span>
                      )}
                    </span>
                    <strong>₹{Number(shippingFee).toFixed(2)}</strong>
                  </div>

                  {/* Per-seller delivery breakdown — always shown when multiple sellers */}
                  {deliveryBreakdown.length > 0 && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', marginTop: '-4px', marginBottom: '4px' }}>
                      <p style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                        {deliveryBreakdown.length > 1 ? 'Delivery per Package' : 'Delivery Detail'}
                      </p>
                      {deliveryBreakdown.map((b, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: i < deliveryBreakdown.length - 1 ? '1px dashed #e2e8f0' : 'none' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            <span style={{ fontSize: '0.76rem', fontWeight: '600', color: '#1e293b' }}>
                              {deliveryBreakdown.length > 1 ? `📦 Package ${i + 1}` : '📦 Package'}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                              {b.sellerName} · {b.distanceKm} km away
                            </span>
                          </div>
                          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: b.distanceKm > 20 ? '#dc2626' : '#059669' }}>
                            ₹{Number(b.deliveryCharge).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="co-breakdown-row">
                    <span>GST (18%)</span>
                    <strong>₹{taxAmount.toLocaleString('en-IN')}</strong>
                  </div>

                  {deliveryDistance > 0 && (
                    <div className="co-breakdown-row">
                      <span>{deliveryBreakdown.length > 1 ? 'Max Package Distance' : 'Delivery Distance'}</span>
                      <strong style={{ color: '#4169e1' }}>{deliveryDistance.toFixed(2)} km</strong>
                    </div>
                  )}

                  <div className="co-summary-divider" style={{ margin: '16px 0' }} />

                  <div className="co-breakdown-row co-breakdown-row--total">
                    <span>Order Total</span>
                    <strong>₹{grandTotal.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                {/* Terms & Conditions Checkbox */}
                <div className="co-terms-wrap-desktop" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '16px 0 12px 0', padding: '0 4px' }}>
                  <input 
                    id="agree-to-terms-chk"
                    type="checkbox" 
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    style={{ width: '16px', height: '16px', marginTop: '2px', cursor: 'pointer' }}
                  />
                  <label htmlFor="agree-to-terms-chk" style={{ fontSize: '0.78rem', color: '#475569', lineHeight: '1.4', cursor: 'pointer', userSelect: 'none' }}>
                    I agree to the <a href="#" onClick={(e) => { e.preventDefault(); handleOpenTermsModal('terms'); }} style={{ color: '#4169e1', textDecoration: 'underline', fontWeight: 'bold' }}>Terms of Service</a>, <a href="#" onClick={(e) => { e.preventDefault(); handleOpenTermsModal('privacy'); }} style={{ color: '#4169e1', textDecoration: 'underline', fontWeight: 'bold' }}>Privacy Policy</a>, and <a href="#" onClick={(e) => { e.preventDefault(); handleOpenTermsModal('escrow'); }} style={{ color: '#4169e1', textDecoration: 'underline', fontWeight: 'bold' }}>Emahu Team return/refund conditions</a> of Emahu Marketplace.
                  </label>
                </div>

                {/* Big checkout action */}
                {cartItems.length > 0 && (
                  <button 
                    onClick={handlePlaceOrder}
                    className="co-btn-lock-escrow"
                    disabled={!agreeToTerms}
                    style={!agreeToTerms ? { opacity: 0.5, cursor: 'not-allowed', background: '#94a3b8', boxShadow: 'none' } : {}}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '8px' }}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>{!agreeToTerms ? 'Accept Terms to Buy' : 'Buy Now'}</span>
                  </button>
                )}

              </div>
            </div>

          </div>
        )}
      </main>

      {/* ─── SECURE ESCROW CHECKOUT MODAL OVERLAY ─── */}
      {checkoutStep === 'securing' && (
        <div className="co-modal-overlay">
          <div className="co-modal">
            <div className="co-securing-state">
              <div className="co-rotating-vault">
                <div className="co-rotating-ring" />
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4169e1" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h2>Securing Vault Lock Pipeline...</h2>
              <p>Transferring payment of <strong>₹{grandTotal.toLocaleString('en-IN')}</strong> safely into military-grade escrow holdings vault.</p>
              <div className="co-progress-bar">
                <div className="co-progress-fill" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TERMS AND CONDITIONS DETAIL MODAL ─── */}
      {isTermsModalOpen && (
        <div className="co-modal-overlay" style={{ zIndex: 10000, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '90%', maxWidth: '560px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', overflow: 'hidden', maxHeight: '80vh' }}>
            
            {/* Header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>
                  {termsModalContent === 'terms' && '📜 Terms of Service'}
                  {termsModalContent === 'privacy' && '🔒 Privacy Policy'}
                  {termsModalContent === 'escrow' && '🤝 Emahu Team Return & Refund Conditions'}
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>EMAHU Marketplace Official Document</p>
              </div>
              <button onClick={() => setIsTermsModalOpen(false)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Scrollable Document Text */}
            <div style={{ padding: '22px', overflowY: 'auto', fontSize: '0.85rem', color: '#334155', lineHeight: '1.6' }}>
              {termsModalContent === 'terms' && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontWeight: '700' }}>1. Acceptance of Terms</h4>
                  <p style={{ margin: '0 0 16px 0' }}>By checking the agreement box and placing an order on EMAHU, you agree to follow and be bound by these Terms of Service. If you do not accept, you may not complete purchase transactions.</p>
                  
                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontWeight: '700' }}>2. Role of the Platform</h4>
                  <p style={{ margin: '0 0 16px 0' }}>EMAHU operates as a multi-seller marketplace linking independent vendors with buyers. Delivery services are managed either through platform logistics (third-party courier partners) or via Self-Delivery managed directly by the merchant seller.</p>

                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontWeight: '700' }}>3. Order Acceptance and Pricing</h4>
                  <p style={{ margin: '0 0 16px 0' }}>Orders submitted on the platform are subject to verification and merchant acceptance. Delivery charges are calculated dynamically based on real-time distances between vendor shops and buyer delivery addresses.</p>
                </div>
              )}

              {termsModalContent === 'privacy' && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontWeight: '700' }}>1. Information Collection</h4>
                  <p style={{ margin: '0 0 16px 0' }}>We collect personal contact details (Full Name, Phone Number, Email, and Address) supplied during checkout to handle secure product delivery. GPS location coordinates are requested only to offer accurate distance-based delivery calculations.</p>
                  
                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontWeight: '700' }}>2. Information Sharing</h4>
                  <p style={{ margin: '0 0 16px 0' }}>Recipient address details and coordinates are shared solely with the assigned vendor and the logistics dispatch rider executing the shipment handover. We do not sell or lease your address records to third parties.</p>

                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontWeight: '700' }}>3. Data Storage and Security</h4>
                  <p style={{ margin: '0 0 16px 0' }}>All transactions, order details, and verification files are stored behind encrypted server firewalls. Your transaction session token is stored locally to maintain order security.</p>
                </div>
              )}

              {termsModalContent === 'escrow' && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontWeight: '700' }}>1. Safe Payment Protection</h4>
                  <p style={{ margin: '0 0 16px 0' }}>All product purchase amounts are initially held securely by the EMAHU Team. The merchant does not receive the payment immediately upon dispatch.</p>
                  
                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontWeight: '700' }}>2. Delivery OTP and Funds Release</h4>
                  <p style={{ margin: '0 0 16px 0' }}>Upon arrival of the shipment at the buyer's destination, the buyer must share the secure 6-digit Delivery OTP with the delivery partner or merchant. Correct entry of this verification code confirms successful handover and releases the payment to the merchant.</p>

                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontWeight: '700' }}>3. Return & Refund Window</h4>
                  <p style={{ margin: '0 0 16px 0' }}>If a buyer identifies issues, damage, or discrepancy during inspect-on-delivery, they must reject the handover and notify platform support. Once the OTP is shared and entered, the delivery is permanently finalized and payment is settled.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 18px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsTermsModalOpen(false)}
                type="button"
                style={{
                  padding: '8px 20px',
                  background: '#4169e1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(65,105,225,0.2)'
                }}
              >
                Close Document
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
