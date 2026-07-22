'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import BuyerHeader from '@/components/buyer_home/buyer_header';
import { logAnalyticsEvent } from '@/utils/analytics';
import { detectLocationWithGPS } from '@/utils/location';
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

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

const sellerServesLocation = (seller, city) => {
  if (!seller) return true;
  const cityLower = (city || 'Ahmedabad').toLowerCase().trim();

  // All India option
  if (cityLower === 'all india' || cityLower === 'india') return true;

  if (typeof seller === 'string') return true;

  const sObj = typeof seller === 'object' ? seller : {};

  // Check if seller delivers to All India (coveredCities has All India or seller state/city is All India)
  const coveredCities = Array.isArray(sObj.coveredCities)
    ? sObj.coveredCities.map(c => String(c).toLowerCase().trim())
    : [];

  const sellerCity = (sObj.city || sObj.currentCity || sObj.location || sObj.address || sObj.serviceAreaCity || '').toLowerCase().trim();
  const sellerState = (sObj.state || sObj.serviceAreaState || sObj.address || '').toLowerCase().trim();

  if (
    coveredCities.includes('all india') ||
    coveredCities.includes('india') ||
    sellerCity === 'all india' ||
    sellerCity === 'india' ||
    sellerState === 'all india' ||
    sellerState === 'india' ||
    sObj.allIndia === true ||
    sObj.sellScope === 'all_india' ||
    sObj.deliveryScope === 'all_india'
  ) {
    return true;
  }

  // 1. Calculate distance using coordinates if available
  try {
    const bLat = parseFloat(sObj.latitude);
    const bLon = parseFloat(sObj.longitude);
  } catch (_) { }

  if (sellerCity === cityLower) return true;
  if (sellerCity && cityLower && (sellerCity.includes(cityLower) || cityLower.includes(sellerCity))) return true;

  if (coveredCities.includes(cityLower) || coveredCities.some(c => cityLower.includes(c) || c.includes(cityLower))) return true;

  // City to State Map for state level coverage matching
  const cityToStateMap = {
    // Gujarat
    'ahmedabad': 'gujarat', 'surat': 'gujarat', 'vadodara': 'gujarat', 'rajkot': 'gujarat',
    'gandhinagar': 'gujarat', 'bhavnagar': 'gujarat', 'jamnagar': 'gujarat', 'junagadh': 'gujarat',
    'anand': 'gujarat', 'mehsana': 'gujarat', 'nadiad': 'gujarat', 'morbi': 'gujarat',
    // Maharashtra
    'mumbai': 'maharashtra', 'pune': 'maharashtra', 'nagpur': 'maharashtra', 'nashik': 'maharashtra',
    'aurangabad': 'maharashtra', 'thane': 'maharashtra', 'navi mumbai': 'maharashtra',
    'solapur': 'maharashtra', 'kolhapur': 'maharashtra', 'amravati': 'maharashtra',
    // Delhi NCR
    'delhi': 'delhi', 'noida': 'uttar pradesh', 'gurugram': 'haryana', 'faridabad': 'haryana', 'ghaziabad': 'uttar pradesh',
    // Karnataka
    'bangalore': 'karnataka', 'bengaluru': 'karnataka', 'mysore': 'karnataka', 'mangalore': 'karnataka', 'hubli': 'karnataka', 'belgaum': 'karnataka',
    // Tamil Nadu
    'chennai': 'tamil nadu', 'coimbatore': 'tamil nadu', 'madurai': 'tamil nadu', 'salem': 'tamil nadu', 'tiruchirappalli': 'tamil nadu',
    // Telangana
    'hyderabad': 'telangana', 'warangal': 'telangana', 'nizamabad': 'telangana',
    // West Bengal
    'kolkata': 'west bengal', 'howrah': 'west bengal', 'siliguri': 'west bengal', 'asansol': 'west bengal', 'durgapur': 'west bengal',
    // Rajasthan
    'jaipur': 'rajasthan', 'jodhpur': 'rajasthan', 'udaipur': 'rajasthan', 'kota': 'rajasthan', 'ajmer': 'rajasthan',
    // Uttar Pradesh
    'lucknow': 'uttar pradesh', 'kanpur': 'uttar pradesh', 'agra': 'uttar pradesh', 'varanasi': 'uttar pradesh', 'allahabad': 'uttar pradesh', 'meerut': 'uttar pradesh',
    // Punjab & Haryana
    'chandigarh': 'punjab', 'ludhiana': 'punjab', 'amritsar': 'punjab', 'jalandhar': 'punjab', 'ambala': 'haryana',
    // Madhya Pradesh
    'bhopal': 'madhya pradesh', 'indore': 'madhya pradesh', 'gwalior': 'madhya pradesh', 'jabalpur': 'madhya pradesh'
  };

  const buyerState = cityToStateMap[cityLower];
  const sellerStateMapped = cityToStateMap[sellerCity];

  if (buyerState) {
    if (sellerState.includes(buyerState) || (sellerStateMapped && sellerStateMapped === buyerState)) {
      return true;
    }
  }

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

// Known Indian cities and states for validation
const KNOWN_CITIES = [
  'ahmedabad', 'surat', 'rajkot', 'vadodara', 'gandhinagar', 'bhavnagar', 'jamnagar', 'junagadh', 'anand', 'mehsana', 'morbi',
  'mumbai', 'pune', 'nagpur', 'nashik', 'aurangabad', 'thane', 'solapur', 'kolhapur', 'amravati',
  'delhi', 'noida', 'gurugram', 'faridabad', 'ghaziabad',
  'bangalore', 'bengaluru', 'mysore', 'mangalore', 'hubli', 'belgaum',
  'chennai', 'coimbatore', 'madurai', 'salem', 'tiruchirappalli',
  'hyderabad', 'warangal', 'nizamabad', 'secunderabad',
  'kolkata', 'howrah', 'siliguri', 'asansol', 'durgapur',
  'jaipur', 'jodhpur', 'udaipur', 'kota', 'ajmer',
  'lucknow', 'kanpur', 'agra', 'varanasi', 'allahabad', 'meerut',
  'chandigarh', 'ludhiana', 'amritsar', 'jalandhar', 'ambala',
  'bhopal', 'indore', 'gwalior', 'jabalpur',
  'patna', 'gaya', 'bhubaneswar', 'cuttack', 'visakhapatnam', 'vijayawada'
];

const KNOWN_STATES = [
  'gujarat', 'maharashtra', 'delhi', 'karnataka', 'tamil nadu', 'telangana',
  'west bengal', 'rajasthan', 'uttar pradesh', 'punjab', 'haryana', 'madhya pradesh',
  'bihar', 'odisha', 'andhra pradesh', 'kerala', 'jharkhand', 'assam', 'uttarakhand',
  'himachal pradesh', 'chhattisgarh', 'goa', 'tripura', 'meghalaya', 'manipur',
  'nagaland', 'arunachal pradesh', 'mizoram', 'sikkim'
];

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  }
  return dp[m][n];
}

function getClosestMatch(input, list) {
  if (!input || input.length < 2) return null;
  const lower = input.toLowerCase().trim();
  if (list.includes(lower)) return null; // exact match, no hint needed
  let best = null, bestDist = Infinity;
  for (const item of list) {
    const d = levenshtein(lower, item);
    if (d < bestDist && d <= 3) { best = item; bestDist = d; }
  }
  return best ? best.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null;
}

export default function CheckoutPage() {
  const [cartItems, setCartItems] = useState([]);
  const [shippingSpeed, setShippingSpeed] = useState('standard'); // standard | express
  const [EmahuMethod, setEmahuMethod] = useState('wallet'); // wallet | card | upi
  const [checkoutStep, setCheckoutStep] = useState('idle'); // idle | securing | success
  const [generatedOrderId, setGeneratedOrderId] = useState('');
  const [orderSellers, setOrderSellers] = useState([]);
  const [placedOrderObjects, setPlacedOrderObjects] = useState([]);

  // ── LOCATION GATE ── (must confirm location before checkout)
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [locationMode, setLocationMode] = useState(null); // null | 'gps' | 'manual'
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Address field errors & hints
  const [fieldErrors, setFieldErrors] = useState({});
  const [cityHint, setCityHint] = useState('');
  const [stateHint, setStateHint] = useState('');
  const [manualConfirmed, setManualConfirmed] = useState(false);

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
  const STATES_WITH_PARTNERS = ['Gujarat', 'Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Uttar Pradesh'];
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
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  const checkoutCity = useMemo(() => {
    const rawCity = addressType === 'saved'
      ? (detectCityAndState(address).city || 'Ahmedabad')
      : city;
    return (rawCity || 'Ahmedabad').trim();
  }, [addressType, address, city]);

  const undeliverableItems = useMemo(() => {
    return cartItems.filter(item => {
      return !sellerServesLocation(item.seller, checkoutCity);
    });
  }, [cartItems, checkoutCity]);

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
      /* Removed per request */
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

  const handleGPSDetect = async (fromGate = false) => {
    if (fromGate) { setGpsLoading(true); setGpsError(''); }
    try {
      const result = await detectLocationWithGPS();
      setBuyerCoordinates(result.coords);

      if (result.streetAddress || result.fullAddress) {
        setAddress(result.streetAddress || result.fullAddress);
      }
      if (result.city) setCity(result.city);
      if (result.state) setStateName(result.state);
      if (result.pincode) setPincode(result.pincode);
      setAddressType('manual');

      if (fromGate) {
        setGpsLoading(false);
        setLocationMode('gps');
        setLocationConfirmed(true);
      }
    } catch (error) {
      console.error('Checkout GPS detection error:', error);
      if (fromGate) {
        setGpsLoading(false);
        setGpsError(error.code === 1
          ? 'Location permission denied. Please allow location access in your browser settings or enter your address manually.'
          : 'Unable to detect GPS location. Please try again or enter address manually.');
      }
    }
  };

  const validateManualAddress = () => {
    const errors = {};
    if (!fullName.trim() || fullName.trim().length < 2) errors.fullName = 'Full name is required (min 2 characters)';
    if (!phone.trim() || !/^[+]?[0-9]{10,13}$/.test(phone.replace(/\s/g, ''))) errors.phone = 'Enter a valid 10-digit mobile number';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address';
    if (!address.trim() || address.trim().length < 10) errors.address = 'Street address must be at least 10 characters';
    if (!city.trim() || city.trim().length < 2) errors.city = 'Enter your city name';
    if (!stateName.trim() || stateName.trim().length < 2) errors.stateName = 'Enter your state name';
    if (!pincode.trim() || !/^\d{6}$/.test(pincode.trim())) errors.pincode = 'Pincode must be exactly 6 digits';

    const cityMatch = getClosestMatch(city, KNOWN_CITIES);
    const stateMatch = getClosestMatch(stateName, KNOWN_STATES);
    setCityHint(cityMatch && !KNOWN_CITIES.includes(city.toLowerCase().trim()) ? cityMatch : '');
    setStateHint(stateMatch && !KNOWN_STATES.includes(stateName.toLowerCase().trim()) ? stateMatch : '');

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleConfirmManualAddress = () => {
    if (validateManualAddress()) {
      setManualConfirmed(true);
      setLocationMode('manual');
      setLocationConfirmed(true);
      setAddressType('manual');
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
          const userState = (addressType === 'saved' ? (detectCityAndState(address).state || 'Gujarat') : stateName).trim();
          const hasPartner = STATES_WITH_PARTNERS.some(s => s.toLowerCase() === userState.toLowerCase());

          let baseFee = hasPartner ? data.totalDeliveryCharge : 0;
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
        const userState = (addressType === 'saved' ? (detectCityAndState(address).state || 'Gujarat') : stateName).trim();
        const hasPartner = STATES_WITH_PARTNERS.some(s => s.toLowerCase() === userState.toLowerCase());

        const standardFee = hasPartner ? 99 : 0;
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
        } catch (e) { }
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
      // Enforce that suggestion is deliverable to selected checkout city
      if (!sellerServesLocation(p.seller, checkoutCity)) return false;
      return p.category === cartItem.category;
    });

    if (suggestions.length === 0) {
      suggestions = availableProducts.filter(p => {
        return p.id.toString() !== cartItemId && sellerServesLocation(p.seller, checkoutCity);
      });
    }

    return suggestions.slice(0, 3);
  }, [cartItems, availableProducts, checkoutCity]);

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

  const shippingFee = (subtotal === 0 || subtotal > 150) ? 0 : deliveryCharge;
  const taxAmount = Math.round(subtotal * 0.18); // 18% Emahu Tax
  const cgstAmount = Math.round(taxAmount / 2);
  const sgstAmount = taxAmount - cgstAmount;
  const grandTotal = subtotal + shippingFee + taxAmount;

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    if (!agreeToTerms) {
      alert('Checkout Blocked: You must agree to the Terms & Conditions and refund policies to confirm your order.');
      return;
    }

    if (undeliverableItems.length > 0) {
      alert('Checkout Blocked: Some items in your cart cannot be delivered to your delivery location. Please remove them or update your delivery address.');
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

    // Dynamic order payload generation
    let buyerUserId = '';
    const buyerUserStr = localStorage.getItem('emahu_buyer_user');
    if (buyerUserStr) {
      try {
        buyerUserId = JSON.parse(buyerUserStr).id || JSON.parse(buyerUserStr)._id || '';
      } catch (err) { }
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
    const notifications = JSON.parse(localStorage.getItem('emahu_notifications') || '[]');

    cartItems.forEach((item, index) => {
      const orderId = `EMH_${Math.floor(100000 + Math.random() * 900000)}`;
      placedOrderIds.push(orderId);

      const itemSubtotal = item.price * item.quantity;
      const bLat = parseFloat(buyerCoordinates.latitude);
      const bLon = parseFloat(buyerCoordinates.longitude);

      let itemDistance = 0;
      let itemDeliveryFee = 99;

      const sellerObj = item.seller || null;
      const sLat = (sellerObj && sellerObj.latitude !== undefined && sellerObj.latitude !== null) ? sellerObj.latitude : 23.0225;
      const sLon = (sellerObj && sellerObj.longitude !== undefined && sellerObj.longitude !== null) ? sellerObj.longitude : 72.5714;

      if (subtotal > 150) {
        itemDeliveryFee = (shippingSpeed === 'express') ? (deliverySettings.expressDeliverySurcharge || 100) : 0;
      } else if (!isNaN(bLat) && !isNaN(bLon)) {
        itemDistance = getHaversineDistance(bLat, bLon, sLat, sLon);
        const matchedSlab = deliverySettings.slabs?.find(slab => itemDistance >= slab.fromKm && itemDistance < slab.toKm);
        itemDeliveryFee = matchedSlab ? matchedSlab.charge : 99;
        if (shippingSpeed === 'express') {
          itemDeliveryFee += deliverySettings.expressDeliverySurcharge || 100;
        }
      } else {
        itemDeliveryFee = 99;
        if (shippingSpeed === 'express') {
          itemDeliveryFee += 100;
        }
      }

      const itemTaxAmount = Math.round(itemSubtotal * 0.18);
      const itemGrandTotal = itemSubtotal + itemDeliveryFee + itemTaxAmount;

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
        total: itemGrandTotal,
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
        EmahuMethod,
        deliveryPartnerId: STATES_WITH_PARTNERS.some(s => s.toLowerCase() === (addressType === 'saved' ? (detectCityAndState(address).state || 'Gujarat') : stateName).toLowerCase().trim()) ? '' : 'sd',
        carrier: STATES_WITH_PARTNERS.some(s => s.toLowerCase() === (addressType === 'saved' ? (detectCityAndState(address).state || 'Gujarat') : stateName).toLowerCase().trim()) ? '' : 'Self-Delivery (sd)',
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
        productAmount: itemSubtotal,
        totalPaid: itemGrandTotal
      };

      orderObjects.push(newOrderPayload);

      notifications.unshift({
        id: `notif_${Date.now()}_buyer_${orderId}_${index}`,
        title: 'Order Placed',
        message: `Your order of ₹${itemGrandTotal.toLocaleString('en-IN')} is placed. Waiting for seller approval for Order #${orderId}.`,
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

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      alert('Razorpay Checkout SDK failed to load. Please verify your connection.');
      return;
    }

    try {
      const initOrderRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/payment/razorpay-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: grandTotal })
      });
      const orderInitData = await initOrderRes.json();
      if (!orderInitData.success) {
        alert('Failed to initialize payment order: ' + (orderInitData.error || 'Unknown error'));
        return;
      }

      const rzpOrder = orderInitData.order;

      const options = {
        key: orderInitData.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TEYhKt96XRAfQq',
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: 'Emahu Marketplace',
        description: 'Securing Emahu Payment',
        order_id: rzpOrder.id,
        handler: async function (response) {
          setCheckoutStep('securing');

          try {
            const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/payment/razorpay-verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                orders: orderObjects
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              const storedOrdersStr = localStorage.getItem('emahu_orders') || '[]';
              const storedOrders = JSON.parse(storedOrdersStr);

              orderObjects.forEach(o => {
                o.paymentStatus = 'completed';
                o.paymentMethod = 'razorpay';
                o.transactionId = response.razorpay_payment_id;
                storedOrders.push(o);
              });

              setGeneratedOrderId(placedOrderIds.join(', '));
              setPlacedOrderObjects([...orderObjects]);
              localStorage.setItem('emahu_orders', JSON.stringify(storedOrders));
              localStorage.setItem('emahu_notifications', JSON.stringify(notifications));

              setCartItems([]);
              localStorage.setItem('emahu_cart', JSON.stringify([]));
              window.dispatchEvent(new Event('storage'));

              setTimeout(() => {
                setCheckoutStep('success');
              }, 2000);
            } else {
              alert('Emahu payment verification failed: ' + verifyData.error);
              setCheckoutStep('idle');
            }
          } catch (dbErr) {
            console.error('DATABASE INSERT FAILURE:', dbErr);
            alert('Failed to complete order verification: ' + dbErr.message);
            setCheckoutStep('idle');
          }
        },
        prefill: {
          name: fullName,
          email: email,
          contact: phone
        },
        theme: {
          color: '#4f46e5'
        }
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on('payment.failed', function (paymentFailResponse) {
        alert('Emahu transaction failed: ' + paymentFailResponse.error.description);
      });
      razorpayInstance.open();
    } catch (checkoutErr) {
      console.error('Checkout error:', checkoutErr);
      alert('Checkout failed: ' + checkoutErr.message);
      setCheckoutStep('idle');
    }
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
          <div className="co-success-card" style={{ maxWidth: '780px', textAlign: 'left' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div className="co-success-badge-pulse" style={{ margin: '0 auto 20px' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2 style={{ fontSize: '1.7rem', fontWeight: '800', margin: '0 0 8px 0', color: '#0f172a' }}>Order Placed Successfully!</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Transaction ID: <strong style={{ color: '#4169e1' }}>{generatedOrderId}</strong></p>
            </div>

            {/* Delivery Address Receipt */}
            <div style={{ background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', border: '1.5px solid #bae6fd', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Delivery Address</div>
              <div style={{ fontWeight: '700', fontSize: '1rem', color: '#0f172a', marginBottom: '4px' }}>{fullName}</div>
              <div style={{ color: '#475569', fontSize: '0.85rem', marginBottom: '4px' }}>Phone: {phone} &nbsp;·&nbsp; Email: {email}</div>
              <div style={{ color: '#334155', fontSize: '0.88rem', marginTop: '8px', lineHeight: 1.5 }}>
                {address}<br />
                {city}{stateName ? `, ${stateName}` : ''}{pincode ? ` - ${pincode}` : ''}
              </div>
              {locationMode === 'gps' && (
                <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(16,185,129,0.1)', color: '#059669', fontSize: '0.72rem', fontWeight: '700', padding: '3px 8px', borderRadius: '6px' }}>
                  GPS Verified Location
                </div>
              )}
            </div>

            {/* Items Receipt */}
            {placedOrderObjects.length > 0 && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '12px 18px', borderBottom: '1px solid #e2e8f0', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Items Ordered</div>
                {placedOrderObjects.flatMap((o) => o.items).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderBottom: idx < placedOrderObjects.flatMap(o => o.items).length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    {item.img && item.img.startsWith('http') ? (
                      <img src={item.img} alt={item.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                          <line x1="12" y1="22.08" x2="12" y2="12" />
                        </svg>
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#0f172a' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{item.brand} · Qty: {item.quantity}</div>
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#0f172a', textAlign: 'right' }}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Price Breakdown */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Payment Breakdown</div>
              {[
                { label: 'Products Subtotal', val: `₹${subtotal.toLocaleString('en-IN')}` },
                { label: 'Delivery Charges', val: shippingFee === 0 ? 'FREE' : `₹${shippingFee}` },
                { label: `GST (CGST 9% + SGST 9%)`, val: `₹${taxAmount.toLocaleString('en-IN')}` },
              ].map(({ label, val }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>
                  <span>{label}</span><strong style={{ color: '#334155' }}>{val}</strong>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                <span>Total Paid</span>
                <span style={{ color: '#4169e1' }}>₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Seller Info */}
            {orderSellers.map((seller, sIdx) => (
              <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: 'rgba(65,105,225,0.04)', border: '1px solid rgba(65,105,225,0.12)', borderRadius: '10px', marginBottom: '12px' }}>
                <div style={{ width: '36px', height: '36px', background: 'rgba(65,105,225,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4169e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#0f172a' }}>{seller.storeName || seller.name || 'Emahu Partner Seller'}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    {seller.email || 'support@emahu.com'}
                  </div>
                </div>
              </div>
            ))}

            <div className="co-success-actions" style={{ justifyContent: 'center', marginTop: '24px', gap: '12px' }}>
              <Link href="/buyer/products" className="co-btn-solid">Continue Shopping</Link>
            </div>
          </div>
        ) : (
          <div className="co-grid">
            {/* Left Portion */}
            <div className="co-form-section">
              <h1 className="co-section-title">Payment with Emahu</h1>

              {/* ── MANDATORY LOCATION GATE ── */}
              {!locationConfirmed ? (
                <div className="co-loc-gate">
                  <div className="co-loc-gate-header">
                    <div className="co-loc-pin-icon">📍</div>
                    <h2>Confirm Your Delivery Location</h2>
                    <p>
                      We need your location to calculate delivery charges and verify deliverability.
                      Choose how you want to confirm your address:
                    </p>
                  </div>

                  <div className="co-loc-choice-row">
                    {/* Option 1: GPS */}
                    <div
                      className={`co-loc-choice-card ${locationMode === 'gps' ? 'co-loc-choice-card--selected' : ''}`}
                      onClick={() => { if (!gpsLoading) setLocationMode('gps'); }}
                    >
                      <div className="co-loc-choice-icon">📡</div>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#0f172a' }}>You can write down adress from gps location</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>Auto-detect your location instantly</div>
                      </div>
                      <div className={`co-loc-choice-radio ${locationMode === 'gps' ? 'co-loc-choice-radio--selected' : ''}`} />
                    </div>

                    {/* Option 2: Manual */}
                    <div
                      className={`co-loc-choice-card ${locationMode === 'manual' ? 'co-loc-choice-card--selected' : ''}`}
                      onClick={() => { setLocationMode('manual'); setGpsError(''); }}
                    >
                      <div className="co-loc-choice-icon">✍️</div>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#0f172a' }}>Enter Address Manually</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>Type your full delivery address</div>
                      </div>
                      <div className={`co-loc-choice-radio ${locationMode === 'manual' ? 'co-loc-choice-radio--selected' : ''}`} />
                    </div>
                  </div>

                  {/* GPS Flow */}
                  {locationMode === 'gps' && (
                    <div style={{ marginTop: '16px' }}>
                      {gpsError && (
                        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '0.82rem', marginBottom: '12px', lineHeight: 1.5 }}>
                          ⚠️ {gpsError}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleGPSDetect(true)}
                        disabled={gpsLoading}
                        style={{
                          width: '100%', padding: '14px',
                          background: gpsLoading ? '#94a3b8' : 'linear-gradient(135deg, #4169e1, #3b5acd)',
                          color: '#fff', border: 'none', borderRadius: '10px',
                          fontWeight: '800', fontSize: '0.9rem', cursor: gpsLoading ? 'not-allowed' : 'pointer',
                          boxShadow: '0 4px 14px rgba(65,105,225,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {gpsLoading ? (
                          <><span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spinRing 0.8s linear infinite' }} /> Detecting GPS Location...</>
                        ) : '📡 Detect My GPS Location'}
                      </button>
                    </div>
                  )}

                  {/* Manual Entry Flow */}
                  {locationMode === 'manual' && !manualConfirmed && (
                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {/* Full Name */}
                        <div className="co-input-group" style={{ marginBottom: 0 }}>
                          <label>Full Name *</label>
                          <input type="text" placeholder="e.g. Rahul Sharma" value={fullName} onChange={e => { setFullName(e.target.value); setFieldErrors(prev => ({ ...prev, fullName: '' })); }} style={fieldErrors.fullName ? { borderColor: '#ef4444' } : {}} />
                          {fieldErrors.fullName && <span className="co-field-error">{fieldErrors.fullName}</span>}
                        </div>
                        {/* Phone */}
                        <div className="co-input-group" style={{ marginBottom: 0 }}>
                          <label>Mobile Number *</label>
                          <input type="tel" placeholder="e.g. 9876543210" value={phone} onChange={e => { setPhone(e.target.value); setFieldErrors(prev => ({ ...prev, phone: '' })); }} style={fieldErrors.phone ? { borderColor: '#ef4444' } : {}} />
                          {fieldErrors.phone && <span className="co-field-error">{fieldErrors.phone}</span>}
                        </div>
                      </div>

                      {/* Email */}
                      <div className="co-input-group" style={{ marginBottom: 0 }}>
                        <label>Email Address *</label>
                        <input type="email" placeholder="e.g. rahul@example.com" value={email} onChange={e => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: '' })); }} style={fieldErrors.email ? { borderColor: '#ef4444' } : {}} />
                        {fieldErrors.email && <span className="co-field-error">{fieldErrors.email}</span>}
                      </div>

                      {/* Street Address */}
                      <div className="co-input-group" style={{ marginBottom: 0 }}>
                        <label>Street Address, Building, Colony *</label>
                        <input type="text" placeholder="House No, Block, Sector, Colony..." value={address} onChange={e => { setAddress(e.target.value); setFieldErrors(prev => ({ ...prev, address: '' })); }} style={fieldErrors.address ? { borderColor: '#ef4444' } : {}} />
                        {fieldErrors.address && <span className="co-field-error">{fieldErrors.address}</span>}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '12px' }}>
                        {/* City */}
                        <div className="co-input-group" style={{ marginBottom: 0 }}>
                          <label>City *</label>
                          <input type="text" placeholder="e.g. Mumbai" value={city} onChange={e => { setCity(e.target.value); setCityHint(''); setFieldErrors(prev => ({ ...prev, city: '' })); }} style={fieldErrors.city ? { borderColor: '#ef4444' } : {}} />
                          {fieldErrors.city && <span className="co-field-error">{fieldErrors.city}</span>}
                          {cityHint && !fieldErrors.city && <span className="co-field-hint">💡 Did you mean <strong style={{ cursor: 'pointer', color: '#4169e1' }} onClick={() => { setCity(cityHint); setCityHint(''); }}>{cityHint}</strong>?</span>}
                        </div>
                        {/* State */}
                        <div className="co-input-group" style={{ marginBottom: 0 }}>
                          <label>State *</label>
                          <input type="text" placeholder="e.g. Maharashtra" value={stateName} onChange={e => { setStateName(e.target.value); setStateHint(''); setFieldErrors(prev => ({ ...prev, stateName: '' })); }} style={fieldErrors.stateName ? { borderColor: '#ef4444' } : {}} />
                          {fieldErrors.stateName && <span className="co-field-error">{fieldErrors.stateName}</span>}
                          {stateHint && !fieldErrors.stateName && <span className="co-field-hint">💡 Did you mean <strong style={{ cursor: 'pointer', color: '#4169e1' }} onClick={() => { setStateName(stateHint); setStateHint(''); }}>{stateHint}</strong>?</span>}
                        </div>
                        {/* Pincode */}
                        <div className="co-input-group" style={{ marginBottom: 0 }}>
                          <label>Pincode *</label>
                          <input type="text" placeholder="6 digits" maxLength={6} value={pincode} onChange={e => { setPincode(e.target.value.replace(/\D/g, '')); setFieldErrors(prev => ({ ...prev, pincode: '' })); }} style={fieldErrors.pincode ? { borderColor: '#ef4444' } : {}} />
                          {fieldErrors.pincode && <span className="co-field-error">{fieldErrors.pincode}</span>}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirmManualAddress}
                        style={{
                          padding: '13px', background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                          color: '#fff', border: 'none', borderRadius: '10px',
                          fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer',
                          boxShadow: '0 4px 14px rgba(15,23,42,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                      >
                        ✓ Confirm My Delivery Address
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Location confirmed — show badge */
                <div style={{ background: 'rgba(16,185,129,0.07)', border: '1.5px solid rgba(16,185,129,0.25)', borderRadius: '12px', padding: '12px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.3rem' }}>{locationMode === 'gps' ? '📡' : '✅'}</span>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#059669' }}>
                        {locationMode === 'gps' ? 'GPS Location Verified' : 'Address Confirmed'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        {city || address.split(',')[0]}{stateName ? `, ${stateName}` : ''}{pincode ? ` - ${pincode}` : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setLocationConfirmed(false); setManualConfirmed(false); setGpsError(''); setFieldErrors({}); }}
                    style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#64748b', cursor: 'pointer', padding: '5px 10px', fontSize: '0.75rem', fontWeight: '700' }}
                  >
                    Edit
                  </button>
                </div>
              )}

              {/* Show map only after location is confirmed with GPS */}
              {locationConfirmed && locationMode === 'gps' && buyerCoordinates.latitude && buyerCoordinates.longitude && (
                <div style={{ marginBottom: '20px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '6px' }}>Live Transit Route Map</span>
                  <div id="checkout-route-map" style={{ height: '240px', width: '100%', borderRadius: '12px', border: '1px solid #cbd5e1', zIndex: 1 }} />
                </div>
              )}

              {locationConfirmed && (
                <form onSubmit={handlePlaceOrder} className="co-form">
                  {addressType === 'saved' ? (
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
                    <>
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

                  {/* Mobile View Terms Checklist */}
                  <div className="co-terms-wrap-mobile" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '16px 0 16px 0', padding: '0 4px' }}>
                    <input
                      id="agree-to-terms-chk-mobile"
                      type="checkbox"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      style={{ width: '16px', height: '16px', marginTop: '2px', cursor: 'pointer' }}
                    />
                    <label htmlFor="agree-to-terms-chk-mobile" style={{ fontSize: '0.78rem', color: '#475569', lineHeight: '1.4', cursor: 'pointer', userSelect: 'none' }}>
                      I agree to the <a href="#" onClick={(e) => { e.preventDefault(); handleOpenTermsModal('terms'); }} style={{ color: '#4169e1', textDecoration: 'underline', fontWeight: 'bold' }}>Terms of Service</a>, <a href="#" onClick={(e) => { e.preventDefault(); handleOpenTermsModal('privacy'); }} style={{ color: '#4169e1', textDecoration: 'underline', fontWeight: 'bold' }}>Privacy Policy</a>, and <a href="#" onClick={(e) => { e.preventDefault(); handleOpenTermsModal('Emahu'); }} style={{ color: '#4169e1', textDecoration: 'underline', fontWeight: 'bold' }}>Emahu Team return/refund conditions</a> of Emahu Marketplace.
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="co-btn-submit-mobile"
                    disabled={!agreeToTerms}
                    style={!agreeToTerms ? { opacity: 0.5, cursor: 'not-allowed', background: '#94a3b8' } : {}}
                  >
                    {!agreeToTerms ? 'Accept Terms to Buy' : ('Buy Now (\u20B9' + grandTotal.toLocaleString('en-IN') + ')')}
                  </button>
                </form>
              )}
            </div>

            {/* Right Portion */}
            <div className="co-summary-section">
              <div className="co-summary-sticky-card">
                <h2 className="co-summary-title">Payment Details</h2>

                <div className="co-items-list">
                  {cartItems.length === 0 ? (
                    <div className="co-empty-cart-summary">
                      <p>Your cart is empty. Go add some items to checkout!</p>
                      <Link href="/buyer/products" className="co-explore-link">Go to Products</Link>
                    </div>
                  ) : (
                    cartItems.map((p, idx) => (
                      <div key={idx} className="co-item-row">
                        <div className="co-item-img-wrap">
                          {isRealImage(p.img) ? (
                            <img src={p.img} alt={p.name} />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'center', width: '100%', height: '100%', background: '#f4f4f5', fontSize: '1.5rem' }}>
                              {p.img || '📦'}
                            </div>
                          )}
                          <span className="co-item-qty-badge">{p.quantity}</span>
                        </div>
                        <div className="co-item-desc">
                          <span className="co-item-brand">{p.brand}</span>
                          <h4>{p.name}</h4>
                          <span className="co-item-specs">
                            {p.selectedSize && p.selectedSize !== 'Default' ? `Variant: ${p.selectedSize}` : (p.selectedColor && p.selectedColor !== 'Premium Black' && p.selectedColor !== 'Default' ? `Color: ${p.selectedColor}` : 'Standard Variant')}
                          </span>
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

                <div className="co-breakdown">
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
                    <strong>{shippingFee === 0 ? <span style={{ color: '#16a34a', fontWeight: '700' }}>FREE</span> : `₹${Number(shippingFee).toFixed(2)}`}</strong>
                  </div>

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
                            {shippingFee === 0 ? 'FREE' : `₹${Number(b.deliveryCharge).toFixed(2)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    className="co-breakdown-row"
                    onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span>Service Fees {showTaxBreakdown ? '▲' : '▼'}</span>
                    <strong>₹{taxAmount.toLocaleString('en-IN')}</strong>
                  </div>

                  {showTaxBreakdown && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', marginTop: '-4px', marginBottom: '8px' }}>
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

                  {deliveryDistance > 0 && (
                    <div className="co-breakdown-row">
                      <span>{deliveryBreakdown.length > 1 ? 'Max Package Distance' : 'Delivery Distance'}</span>
                      <strong style={{ color: '#4169e1' }}>{deliveryDistance.toFixed(2)} km</strong>
                    </div>
                  )}

                  <div className="co-summary-divider" style={{ margin: '16px 0' }} />

                  <div className="co-breakdown-row co-breakdown-row--total">
                    <span>Total Amount</span>
                    <strong>₹{grandTotal.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                {undeliverableItems.length > 0 && (
                  <div className="co-delivery-warning" style={{
                    backgroundColor: '#fef2f2',
                    border: '1.5px solid #fca5a5',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    fontFamily: "'Inter', sans-serif"
                  }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⚠️ Delivery Unavailable</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#991b1b', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                      The following items in your cart cannot be delivered to <strong>{checkoutCity}</strong>:
                    </p>
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '16px', fontSize: '0.72rem', color: '#b91c1c', fontWeight: '600' }}>
                      {undeliverableItems.map(item => (
                        <li key={item.id}>
                          {item.name} (by {item.sellerStore || item.brand || 'Emahu Seller'})
                        </li>
                      ))}
                    </ul>
                    <p style={{ fontSize: '0.72rem', color: '#991b1b', margin: '8px 0 0 0', fontStyle: 'italic' }}>
                      Please remove these items or change your delivery address to complete checkout.
                    </p>
                  </div>
                )}

                {/* Desktop View Terms Checklist */}
                <div className="co-terms-wrap-desktop" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '16px 0 12px 0', padding: '0 4px' }}>
                  <input
                    id="agree-to-terms-chk"
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    style={{ width: '16px', height: '16px', marginTop: '2px', cursor: 'pointer' }}
                  />
                  <label htmlFor="agree-to-terms-chk" style={{ fontSize: '0.78rem', color: '#475569', lineHeight: '1.4', cursor: 'pointer', userSelect: 'none' }}>
                    I agree to the <a href="#" onClick={(e) => { e.preventDefault(); handleOpenTermsModal('terms'); }} style={{ color: '#4169e1', textDecoration: 'underline', fontWeight: 'bold' }}>Terms of Service</a>, <a href="#" onClick={(e) => { e.preventDefault(); handleOpenTermsModal('privacy'); }} style={{ color: '#4169e1', textDecoration: 'underline', fontWeight: 'bold' }}>Privacy Policy</a>, and <a href="#" onClick={(e) => { e.preventDefault(); handleOpenTermsModal('Emahu'); }} style={{ color: '#4169e1', textDecoration: 'underline', fontWeight: 'bold' }}>Emahu Team return/refund conditions</a> of Emahu Marketplace.
                  </label>
                </div>

                {cartItems.length > 0 && (
                  <button
                    onClick={handlePlaceOrder}
                    className="co-btn-lock-Emahu"
                    disabled={!agreeToTerms || undeliverableItems.length > 0}
                    style={!agreeToTerms || undeliverableItems.length > 0 ? { opacity: 0.5, cursor: 'not-allowed', background: '#94a3b8', boxShadow: 'none' } : {}}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '8px' }}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>{!agreeToTerms ? 'Accept Terms to Buy' : undeliverableItems.length > 0 ? 'Delivery Unavailable' : 'Buy Now'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── SECURE EMAHU CHECKOUT MODAL OVERLAY ─── */}
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
              <h2>Processing Payment...</h2>
              <p>Processing payment of <strong>₹{grandTotal.toLocaleString('en-IN')}</strong> safely for your order.</p>
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
                  {termsModalContent === 'Emahu' && '🤝 Emahu Team Return & Refund Conditions'}
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>EMAHU Marketplace Official Document</p>
              </div>
              <button onClick={() => setIsTermsModalOpen(false)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Content */}
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

              {termsModalContent === 'Emahu' && (
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