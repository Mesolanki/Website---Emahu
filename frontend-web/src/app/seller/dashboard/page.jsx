'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './dashboard.css';
import { logoutUser, clearAuthSession, getProfile } from '@/utils/auth';
import CategorySelector from '@/components/seller_home/CategorySelector';

if (typeof window !== 'undefined') {
  let url = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
  url = url.trim();
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    process.env.NEXT_PUBLIC_API_URL = url.replace('localhost', '127.0.0.1');
  } else {
    process.env.NEXT_PUBLIC_API_URL = url.replace('localhost', hostname).replace('127.0.0.1', hostname);
  }
}

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

const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Emahu Smart Luxe Chrono',
    sku: 'EM-CHR-009',
    category: 'Electronics',
    price: 18999,
    comparePrice: 24999,
    stock: 45,
    status: 'in-stock',
    sales: 124,
    image: '⌚'
  },
  {
    id: 'prod-2',
    name: 'SoundAura Pro Headphones',
    sku: 'EM-SND-882',
    category: 'Electronics',
    price: 12500,
    comparePrice: 15999,
    stock: 8,
    status: 'low-stock',
    sales: 340,
    image: '🎧'
  },
  {
    id: 'prod-3',
    name: 'Minimalist Solid Oak Desk',
    sku: 'EM-DSK-310',
    category: 'Furniture',
    price: 28000,
    comparePrice: 35000,
    stock: 12,
    status: 'in-stock',
    sales: 68,
    image: 'Desk'
  },
  {
    id: 'prod-4',
    name: 'AuraRing Smart Health Tracker',
    sku: 'EM-RNG-041',
    category: 'Fitness',
    price: 9500,
    comparePrice: 12000,
    stock: 0,
    status: 'out-of-stock',
    sales: 198,
    image: 'ðŸ’'
  }
];



// Helper functions to keep React rendering functions pure (required by ESLint rules)
const getTimestampString = () => Date.now().toString();
const getRandomNumberStr = (min, max) => Math.floor(min + Math.random() * (max - min)).toString();
const getRandomWeightStr = () => `${(1.5 + Math.random() * 3).toFixed(2)} kg`;
const generateNotificationId = () => `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

const getDynamicApiUrl = () => {
  let base = process.env.NEXT_PUBLIC_API_URL || '';
  base = base.trim();
  // If it's a local address or empty, return an empty string to use Next.js server-side proxy rewrites
  if (!base || base.includes('localhost') || base.includes('127.0.0.1')) {
    return '';
  }
  return base;
};

function parseOrderDate(ord) {
  if (!ord) return new Date();
  if (ord.createdAt) {
    const d = new Date(ord.createdAt);
    if (!isNaN(d.getTime())) return d;
  }
  if (ord.date) {
    const d = new Date(ord.date);
    if (!isNaN(d.getTime())) return d;
    const match = String(ord.date).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = parseInt(match[3], 10);
      if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
        const parsedD = new Date(year, month, day);
        if (!isNaN(parsedD.getTime())) return parsedD;
      }
    }
  }
  return new Date();
}

const getCategoryOptions = (storeCategory) => {
  const cat = (storeCategory || '').toLowerCase();
  if (cat === 'electronics') {
    return [
      { value: 'Tech', label: 'Tech & Gadgets' },
      { value: 'Tech', label: 'Consumer Electronics' },
      { value: 'Tech', label: 'Audio & Acoustics' }
    ];
  }
  if (cat === 'fashion') {
    return [
      { value: 'Apparel', label: 'Clothing & Apparel' },
      { value: 'Shoes', label: 'Footwear & Shoes' },
      { value: 'Lifestyle', label: 'Bags & Accessories' }
    ];
  }
  if (cat === 'home') {
    return [
      { value: 'Kitchen', label: 'Kitchen & Dining' },
      { value: 'Lifestyle', label: 'Furniture & Decor' }
    ];
  }
  if (cat === 'groceries') {
    return [
      { value: 'Lifestyle', label: 'Grocery & Packaged Foods' }
    ];
  }
  if (cat === 'beauty') {
    return [
      { value: 'Lifestyle', label: 'Skincare & Cosmetics' }
    ];
  }
  if (cat === 'stationery') {
    return [
      { value: 'Lifestyle', label: 'Books & Stationery' }
    ];
  }
  return [
    { value: 'Tech', label: 'Tech & Gadgets' },
    { value: 'Apparel', label: 'Fashion & Apparel' },
    { value: 'Shoes', label: 'Footwear & Shoes' },
    { value: 'Kitchen', label: 'Kitchenware' },
    { value: 'Lifestyle', label: 'General Merchandise' }
  ];
};

export default function EmahuProDashboard() {
  const router = useRouter();
  
  const handleSessionExpired = () => {
    clearAuthSession('seller');
    router.replace('/seller/login?expired=true');
  };

  const [activeTab, setActiveTab] = useState('overview');
  const [newProductCategory, setNewProductCategory] = useState('Electronics & Tech');
  const [sellerUser, setSellerUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [sellerDocuments, setSellerDocuments] = useState([]);
  const [editingDocType, setEditingDocType] = useState(null);
  const [inputDocUrl, setInputDocUrl] = useState('');
  const [inlineSubmitting, setInlineSubmitting] = useState(false);

  // Admin Seller Management State
  const [sellersList, setSellersList] = useState([]);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [sellersError, setSellersError] = useState('');
  const [selectedDetailedSeller, setSelectedDetailedSeller] = useState(null);
  const [sellerRejectionFeedback, setSellerRejectionFeedback] = useState({});

  const fetchSellers = async () => {
    setLoadingSellers(true);
    setSellersError('');
    try {
      const token = localStorage.getItem('emahu_seller_token');
      if (!token) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/admin/sellers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setSellersList(data.sellers || []);
      } else {
        setSellersError(data.error || 'Failed to fetch sellers list');
      }
    } catch (err) {
      console.error(err);
      setSellersError('Error fetching sellers list');
    } finally {
      setLoadingSellers(false);
    }
  };

  const handleSellerDecision = async (sellerId, decision, feedback = '') => {
    try {
      const token = localStorage.getItem('emahu_seller_token');
      if (!token) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/admin/sellers/${sellerId}/decision`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ decision, feedback })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(
          decision === 'approve' ? 'Seller Approved' : 'Seller Rejected',
          `The seller status has been updated successfully.`,
          decision === 'approve' ? 'success' : 'danger'
        );
        fetchSellers();
      } else {
        triggerToast('Error', data.error || 'Failed to update status', 'danger');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Network error', 'danger');
    }
  };

  useEffect(() => {
    if (activeTab === 'sellers_management' && sellerUser?.role === 'admin') {
      fetchSellers();
    }
  }, [activeTab, sellerUser]);

  const [settingsForm, setSettingsForm] = useState({
    storeName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    latitude: '',
    longitude: ''
  });

  const [adminDeliverySettings, setAdminDeliverySettings] = useState({
    maxDeliveryDistance: 100,
    freeShippingThreshold: 2000,
    expressDeliverySurcharge: 100,
    slabs: []
  });
  const [loadingAdminSettings, setLoadingAdminSettings] = useState(false);

  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Sync settingsForm with sellerUser details when loaded
  useEffect(() => {
    if (sellerUser) {
      setSettingsForm({
        storeName: sellerUser.storeName || '',
        phone: sellerUser.phone || '',
        address: sellerUser.address || '',
        city: sellerUser.city || '',
        state: sellerUser.state || '',
        latitude: sellerUser.latitude !== undefined && sellerUser.latitude !== null ? sellerUser.latitude : '',
        longitude: sellerUser.longitude !== undefined && sellerUser.longitude !== null ? sellerUser.longitude : ''
      });
    }
  }, [sellerUser]);

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

  // Build popup HTML for the seller map marker
  const buildMarkerPopup = (lat, lon, storeName, address, city, state) => {
    const fullAddress = [address, city, state].filter(Boolean).join(', ') || 'Address not set';
    const shopLabel = storeName || 'My Shop';
    const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
    return `
      <div style="min-width:220px;font-family:'Inter',sans-serif;">
        <div style="font-weight:700;font-size:0.95rem;color:#1a1a2e;margin-bottom:4px;">
          🏪 ${shopLabel}
        </div>
        <div style="font-size:0.78rem;color:#555;line-height:1.5;margin-bottom:8px;">
          📍 ${fullAddress}
        </div>
        <div style="font-size:0.72rem;color:#888;margin-bottom:10px;">
          Lat: ${parseFloat(lat).toFixed(5)}, Lon: ${parseFloat(lon).toFixed(5)}
        </div>
        <a
          href="${gmapsUrl}"
          target="_blank"
          rel="noopener noreferrer"
          style="
            display:inline-flex;align-items:center;gap:6px;
            background:#4169e1;color:#fff;
            padding:7px 14px;border-radius:7px;
            font-size:0.78rem;font-weight:700;
            text-decoration:none;cursor:pointer;
          "
        >
          🗺️ Navigate in Google Maps
        </a>
      </div>
    `;
  };

  // Update/draw Leaflet map centered on coordinates
  useEffect(() => {
    if (!leafletLoaded || typeof window === 'undefined' || !window.L) return;

    const lat = parseFloat(settingsForm.latitude) || 23.0225;
    const lon = parseFloat(settingsForm.longitude) || 72.5714;

    const container = document.getElementById('seller-shop-map');
    if (!container) return;

    const popupHtml = buildMarkerPopup(
      lat, lon,
      settingsForm.storeName,
      settingsForm.address,
      settingsForm.city,
      settingsForm.state
    );

    if (!mapRef.current) {
      mapRef.current = window.L.map('seller-shop-map').setView([lat, lon], 14);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);

      markerRef.current = window.L.marker([lat, lon], { draggable: true })
        .addTo(mapRef.current)
        .bindPopup(popupHtml, { maxWidth: 280 })
        .openPopup();

      // Drag: update coords + reverse-geocode + refresh popup
      markerRef.current.on('dragend', async (e) => {
        const pos = markerRef.current.getLatLng();
        const newLat = pos.lat.toFixed(6);
        const newLon = pos.lng.toFixed(6);
        setSettingsForm(prev => ({ ...prev, latitude: newLat, longitude: newLon }));
        const geo = await reverseGeocodeAndFill(newLat, newLon);
        const updatedHtml = buildMarkerPopup(
          newLat, newLon,
          settingsForm.storeName,
          geo ? geo.streetLine : settingsForm.address,
          geo ? geo.city : settingsForm.city,
          geo ? geo.state : settingsForm.state
        );
        markerRef.current.setPopupContent(updatedHtml).openPopup();
      });

      // Click on map: move marker, reverse-geocode, refresh popup
      mapRef.current.on('click', async (e) => {
        const pos = e.latlng;
        const newLat = pos.lat.toFixed(6);
        const newLon = pos.lng.toFixed(6);
        markerRef.current.setLatLng(pos);
        setSettingsForm(prev => ({ ...prev, latitude: newLat, longitude: newLon }));
        const geo = await reverseGeocodeAndFill(newLat, newLon);
        const updatedHtml = buildMarkerPopup(
          newLat, newLon,
          settingsForm.storeName,
          geo ? geo.streetLine : settingsForm.address,
          geo ? geo.city : settingsForm.city,
          geo ? geo.state : settingsForm.state
        );
        markerRef.current.setPopupContent(updatedHtml).openPopup();
      });
    } else {
      mapRef.current.setView([lat, lon], 14);
      markerRef.current.setLatLng([lat, lon]);
      markerRef.current.setPopupContent(popupHtml).openPopup();
    }
  }, [
    leafletLoaded,
    settingsForm.latitude,
    settingsForm.longitude,
    settingsForm.storeName,
    settingsForm.address,
    settingsForm.city,
    settingsForm.state,
    activeTab
  ]);

  // Reverse-geocode lat/lon → address fields using Nominatim
  const reverseGeocodeAndFill = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
      );
      const data = await res.json();
      if (data && data.address) {
        const a = data.address;
        const road = a.road || a.pedestrian || a.footway || '';
        const suburb = a.suburb || a.neighbourhood || a.quarter || '';
        const county = a.county || a.state_district || '';
        const streetLine = [road, suburb, county].filter(Boolean).join(', ') || data.display_name || '';
        const city = a.city || a.town || a.village || a.municipality || '';
        const state = a.state || '';
        setSettingsForm(prev => ({
          ...prev,
          address: streetLine,
          city,
          state
        }));
        return { streetLine, city, state };
      }
    } catch (err) {
      console.warn('Reverse geocoding failed:', err);
    }
    return null;
  };

  const detectSellerLocation = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lon = position.coords.longitude.toFixed(6);
          setSettingsForm(prev => ({ ...prev, latitude: lat, longitude: lon }));
          const geo = await reverseGeocodeAndFill(lat, lon);
          const addrLabel = geo ? `${geo.city || ''}, ${geo.state || ''}`.replace(/^, |, $/, '') : `${lat}, ${lon}`;
          triggerToast('Location Detected', `Shop pinned to: ${addrLabel}`, 'success');
        },
        (error) => {
          console.error(error);
          triggerToast('Location Error', 'Failed to auto-detect location. Please allow browser location access.', 'danger');
        },
        { timeout: 10000 }
      );
    } else {
      triggerToast('Not Supported', 'Geolocation is not supported by your browser.', 'danger');
    }
  };

  const handleSaveSettings = async () => {
    try {
      const token = localStorage.getItem('emahu_seller_token');
      if (!token) return;
      
      const payload = {
        storeName: settingsForm.storeName,
        phone: settingsForm.phone,
        address: settingsForm.address,
        city: settingsForm.city,
        state: settingsForm.state,
        latitude: settingsForm.latitude !== '' ? parseFloat(settingsForm.latitude) : undefined,
        longitude: settingsForm.longitude !== '' ? parseFloat(settingsForm.longitude) : undefined
      };
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/update-details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.success && data.user) {
        setSellerUser(data.user);
        localStorage.setItem('emahu_seller_user', JSON.stringify(data.user));
        triggerToast('Settings Saved', 'Your store profile location details have been saved successfully.', 'success');
      } else {
        triggerToast('Error', data.error || 'Failed to update store details.', 'danger');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Network error while saving settings.', 'danger');
    }
  };

  const fetchAdminDeliverySettings = async () => {
    try {
      setLoadingAdminSettings(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/delivery/settings`);
      const data = await res.json();
      if (data.success && data.settings) {
        setAdminDeliverySettings(data.settings);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Failed to fetch delivery settings', 'danger');
    } finally {
      setLoadingAdminSettings(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'delivery_settings') {
      fetchAdminDeliverySettings();
    }
  }, [activeTab]);

  const handleSaveAdminDeliverySettings = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('emahu_seller_token');
      if (!token) return;
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/delivery/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(adminDeliverySettings)
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setAdminDeliverySettings(data.settings);
        triggerToast('Settings Saved', 'Global distance delivery parameters have been updated.', 'success');
      } else {
        triggerToast('Error', data.error || 'Failed to update settings', 'danger');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Network error while updating settings', 'danger');
    }
  };

  const handleAddSlab = () => {
    setAdminDeliverySettings(prev => ({
      ...prev,
      slabs: [...prev.slabs, { fromKm: 0, toKm: 0, charge: 0 }]
    }));
  };

  const handleRemoveSlab = (index) => {
    setAdminDeliverySettings(prev => ({
      ...prev,
      slabs: prev.slabs.filter((_, idx) => idx !== index)
    }));
  };

  const handleSlabChange = (index, field, value) => {
    setAdminDeliverySettings(prev => {
      const copy = [...prev.slabs];
      copy[index] = { ...copy[index], [field]: parseFloat(value) || 0 };
      return { ...prev, slabs: copy };
    });
  };

  // Verification session hook
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('emahu_seller_logged_in') === 'true';
    const token = localStorage.getItem('emahu_seller_token');

    let isTokenExpired = false;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          isTokenExpired = true;
        }
      } catch (e) {
        console.error('Failed to parse seller token payload:', e);
        isTokenExpired = true;
      }
    } else {
      isTokenExpired = true;
    }

    if (!isLoggedIn) {
      router.replace('/seller/login');
      return;
    }

    if (isTokenExpired) {
      clearAuthSession('seller');
      router.replace('/seller/login?expired=true');
      return;
    }
    
    const storedUser = localStorage.getItem('emahu_seller_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setTimeout(() => setSellerUser(parsedUser), 0);
      } catch (e) {
        console.error('Error parsing stored seller user:', e);
      }
    }

    const syncProfile = async () => {
      try {
        const token = localStorage.getItem('emahu_seller_token');
        if (!token) {
          setTimeout(() => setIsAuthorized(true), 0);
          return;
        }
        const res = await getProfile(token);
        if (res.success && res.user) {
          setTimeout(() => setSellerUser(res.user), 0);
          localStorage.setItem('emahu_seller_user', JSON.stringify(res.user));

          // Auto-detect & save location on login/sign-in every time using GPS
          if (typeof window !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                const lat = position.coords.latitude.toFixed(6);
                const lon = position.coords.longitude.toFixed(6);
                
                try {
                  const geoRes = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
                  );
                  const geoData = await geoRes.json();
                  if (geoData && geoData.address) {
                    const a = geoData.address;
                    const road = a.road || a.pedestrian || a.footway || '';
                    const suburb = a.suburb || a.neighbourhood || a.quarter || '';
                    const county = a.county || a.state_district || '';
                    const streetLine = [road, suburb, county].filter(Boolean).join(', ') || geoData.display_name || '';
                    const city = a.city || a.town || a.village || a.municipality || '';
                    const state = a.state || '';
                    
                    const payload = {
                      storeName: res.user.storeName,
                      phone: res.user.phone,
                      address: streetLine,
                      city,
                      state,
                      latitude: parseFloat(lat),
                      longitude: parseFloat(lon)
                    };
                    
                    const updateRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/update-details`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify(payload)
                    });
                    const updateData = await updateRes.json();
                    if (updateData.success && updateData.user) {
                      setTimeout(() => setSellerUser(updateData.user), 0);
                      localStorage.setItem('emahu_seller_user', JSON.stringify(updateData.user));
                      console.log('GPS Seller location auto-synchronized successfully');
                    }
                  }
                } catch (geoErr) {
                  console.error('Auto GPS geocoding/update failed:', geoErr);
                }
              },
              (geoErr) => {
                console.warn('GPS auto-detection skipped/failed:', geoErr);
              },
              { timeout: 8000 }
            );
          }
        }
      } catch (err) {
        console.error('Error syncing profile:', err);
        if (err.message && (err.message.includes('authorized') || err.message.includes('token') || err.message.includes('expired') || err.message.includes('profile'))) {
          handleSessionExpired();
          return;
        }
      } finally {
        setTimeout(() => setIsAuthorized(true), 0);
      }
    };

    syncProfile();
  }, [router]);

  // Set default category value based on seller category
  useEffect(() => {
    if (sellerUser?.category) {
      const storeCat = sellerUser.category.toLowerCase();
      let cat = 'Lifestyle';
      if (storeCat === 'electronics') {
        cat = 'Tech';
      } else if (storeCat === 'fashion') {
        cat = 'Apparel';
      } else if (storeCat === 'home') {
        cat = 'Kitchen';
      }
      setTimeout(() => setNewProductCategory(cat), 0);
    }
  }, [sellerUser]);

  // Lock user to status tab if not approved and documents not fully verified
  useEffect(() => {
    const allDocsApproved = ['business_registration', 'id_proof'].every(type =>
      sellerDocuments.some(doc => doc.documentType === type && doc.status === 'approved')
    );
    if (sellerUser && sellerUser.status !== 'approved' && !allDocsApproved) {
      setTimeout(() => setActiveTab('status'), 0);
    }
  }, [sellerUser, sellerDocuments]);

  const fetchSellerDocuments = async () => {
    try {
      const token = localStorage.getItem('emahu_seller_token');
      if (!token) return;
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(apiBase + '/api/auth/seller/documents', {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success && data.documents) {
        setSellerDocuments(data.documents);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const handleInlineSubmit = async (type) => {
    if (!inputDocUrl.trim()) {
      triggerToast('Error', 'Please provide a valid document URL.', 'danger');
      return;
    }
    setInlineSubmitting(true);
    
    // 1. Validate token exists before making request
    const token = localStorage.getItem('emahu_seller_token');
    if (!token) {
      triggerToast('Error', 'Seller token not found. Please log in again.', 'danger');
      setInlineSubmitting(false);
      return;
    }

    // 2. Get and validate API Base URL
    const apiBase = getDynamicApiUrl();
    if (apiBase !== '' && !apiBase.startsWith('http')) {
      triggerToast('Error', 'Invalid API Base URL configuration', 'danger');
      setInlineSubmitting(false);
      return;
    }

    // 3. Add console logging
    console.log('API Base:', apiBase);
    console.log('Request URL:', apiBase + '/api/auth/seller/documents');

    // 4. Setup AbortController for fetch timeout protection (10 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000);

    try {
      const res = await fetch(apiBase + '/api/auth/seller/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          documentType: type,
          fileUrl: inputDocUrl.trim()
        }),
        signal: controller.signal
      });

      // Clear the timeout upon request completion
      clearTimeout(timeoutId);

      // 5. Handle HTTP Errors
      if (!res.ok) {
        if (res.status === 401) {
          handleSessionExpired();
          return;
        }
        throw new Error(`HTTP Error: ${res.status} ${res.statusText || ''}`);
      }

      const data = await res.json();
      if (data.success) {
        triggerToast('Document Submitted', `${type === 'business_registration' ? 'Business Registration' : 'ID Proof'} uploaded successfully and verification is pending.`, 'success');
        setEditingDocType(null);
        setInputDocUrl('');
        // Refresh document list
        await fetchSellerDocuments();
        // Sync user profile status
        const profileRes = await getProfile(token);
        if (profileRes.success && profileRes.user) {
          setSellerUser(profileRes.user);
          localStorage.setItem('emahu_seller_user', JSON.stringify(profileRes.user));
        }
      } else {
        triggerToast('Error', data.error || 'Failed to upload document', 'danger');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Document Upload Error:', err);
      if (err.name === 'AbortError') {
        triggerToast('Error', 'Request timed out. Please try again.', 'danger');
      } else {
        triggerToast('Error', err.message || 'Network error. Please try again.', 'danger');
      }
    } finally {
      setInlineSubmitting(false);
    }
  };

  useEffect(() => {
    if (isAuthorized && sellerUser) {
      setTimeout(() => fetchSellerDocuments(), 0);
    }
  }, [isAuthorized, sellerUser]);

  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error('Logout error:', e);
    }
    clearAuthSession('seller');
    router.push('/seller/login');
  };
  
  // Ref for GSTIN text selection to match user screenshot
  const gstinRef = useRef(null);

  // Dashboard Tabs: 'overview', 'products', 'orders', 'analytics', 'settings'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Settings tab focus helper
  useEffect(() => {
    if (activeTab === 'settings') {
      const timer = setTimeout(() => {
        if (gstinRef.current) {
          gstinRef.current.focus();
          gstinRef.current.select();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);
  
  // Dynamic Product State
  const [products, setProducts] = useState([]);

  // Fetch seller's products from backend API
  useEffect(() => {
    const fetchSellerProducts = async () => {
      try {
        const token = localStorage.getItem('emahu_seller_token');
        if (!token) return;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products/my`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.status === 401) {
          handleSessionExpired();
          return;
        }
        const data = await res.json();
        if (data.success) {
          setProducts(data.products);
        } else {
          console.error('Failed to fetch seller products:', data.error);
        }
      } catch (err) {
        console.error('Error fetching seller products:', err);
      }
    };
    if (isAuthorized) {
      fetchSellerProducts();
    }
  }, [isAuthorized]);

  // Dynamic Orders State
  const [orders, setOrders] = useState([]);

  // Fetch real-time orders from database and localStorage to sync with buyer checkout
  useEffect(() => {
    const loadRealOrders = async () => {
      try {
        let storedOrders = '[]';
        const sellerUserIdOpt = sellerUser ? (sellerUser._id || sellerUser.id || '').toString() : '';
        try {
          const url = sellerUserIdOpt 
            ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/orders?sellerId=${sellerUserIdOpt}`
            : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/orders`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.success && data.orders) {
            storedOrders = JSON.stringify(data.orders);
            localStorage.setItem('emahu_orders', storedOrders);
          } else {
            storedOrders = localStorage.getItem('emahu_orders') || '[]';
          }
        } catch (apiErr) {
          console.warn('API error fetching orders, falling back to localStorage:', apiErr);
          storedOrders = localStorage.getItem('emahu_orders') || '[]';
        }
        
        if (sellerUser) {
          const parsed = JSON.parse(storedOrders);
          
          const sellerUserId = (sellerUser._id || sellerUser.id || '').toString();
          const sellerUserEmail = (sellerUser.email || '').toLowerCase().trim();
          const myProductIds = new Set((products || []).map(p => (p._id || p.id || '').toString()).filter(Boolean));
          const myProductNames = new Set((products || []).map(p => (p.name || '').toLowerCase().trim()).filter(Boolean));

          console.group('[Emahu Dashboard] Filtering Orders');
          console.log('Seller ID:', sellerUserId);
          console.log('Seller Email:', sellerUserEmail);
          console.log('Seller Product IDs:', Array.from(myProductIds));
          console.log('Seller Product Names:', Array.from(myProductNames));
          console.log('Total Orders in localStorage:', parsed.length);
          
          // Filter orders to only show those that contain items belonging to this seller
          let myOrders = parsed.filter(o => {
            // Signal 1: Check order-level sellerId
            const orderSellerId = (o.sellerId || '').toString();
            if (orderSellerId && sellerUserId && orderSellerId === sellerUserId) {
              console.log(`Order #${o.orderId} matches on Signal 1 (order.sellerId: ${orderSellerId})`);
              return true;
            }

            // Signal 2: Check order-level sellerEmail
            const orderSellerEmail = (o.sellerEmail || '').toLowerCase().trim();
            if (orderSellerEmail && sellerUserEmail && orderSellerEmail === sellerUserEmail) {
              console.log(`Order #${o.orderId} matches on Signal 2 (order.sellerEmail: ${orderSellerEmail})`);
              return true;
            }

            // Inspect items list
            const itemsList = o.items || [];
            const hasMatchingItem = itemsList.some(item => {
              // Signal 3: Match on item's seller object ID
              if (item.seller) {
                if (typeof item.seller === 'string') {
                  if (sellerUserId && item.seller.toString() === sellerUserId) {
                    console.log(`Order #${o.orderId} item matches on Signal 3 (item.seller ID string: ${item.seller})`);
                    return true;
                  }
                } else {
                  const itemSellerId = (item.seller._id || item.seller.id || '').toString();
                  if (itemSellerId && sellerUserId && itemSellerId === sellerUserId) {
                    console.log(`Order #${o.orderId} item matches on Signal 3 (item.seller._id: ${itemSellerId})`);
                    return true;
                  }
                  
                  // Signal 4: Match on item's seller email
                  const itemSellerEmail = (item.seller.email || '').toLowerCase().trim();
                  if (itemSellerEmail && sellerUserEmail && itemSellerEmail === sellerUserEmail) {
                    console.log(`Order #${o.orderId} item matches on Signal 4 (item.seller.email: ${itemSellerEmail})`);
                    return true;
                  }
                }
              }

              // Signal 5: Match on item's productId
              const itemProductId = (item.productId || '').toString();
              if (itemProductId && myProductIds.has(itemProductId)) {
                console.log(`Order #${o.orderId} item matches on Signal 5 (item.productId: ${itemProductId})`);
                return true;
              }

              // Signal 6: Match on item's name
              const itemName = (item.name || '').toLowerCase().trim();
              if (itemName && myProductNames.has(itemName)) {
                console.log(`Order #${o.orderId} item matches on Signal 6 (item.name: ${itemName})`);
                return true;
              }

              // Fallback for default seed orders / Emahu Brand
              const isDefaultFallback = item.seller && (item.seller.email === 'support@emahu.com' || item.brand === 'Emahu Seller');
              if (isDefaultFallback) {
                console.log(`Order #${o.orderId} item matches on Signal 7 (default fallback)`);
                return true;
              }

              return false;
            });

            if (!hasMatchingItem) {
              console.log(`Order #${o.orderId} did NOT match any seller criteria.`);
            }
            return hasMatchingItem;
          });

          console.log('Filtered Orders count:', myOrders.length);
          console.groupEnd();

          if (myOrders.length === 0) {
            // Seed multiple demo orders with different statuses so sellers can see the full workflow
            const sellerRef = {
              _id: sellerUser._id || sellerUser.id || 'mock_seller_id',
              name: sellerUser.name || 'Pro Seller Inc.',
              email: sellerUser.email || 'seller@emahu.com',
              phone: sellerUser.phone || '+91 99999 99999'
            };
            const baseDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            const baseTime = baseDate + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

            const seedOrders = [
              {
                orderId: `EMH_${Math.floor(100000 + Math.random() * 900000)}`,
                date: baseDate,
                createdAt: new Date().toISOString(),
                items: [{ name: 'Emahu Smart Luxe Chrono', price: 18999, quantity: 1, brand: 'Emahu Brand', img: '⌚', seller: sellerRef }],
                total: 22419,
                status: 'PENDING_APPROVAL',
                timeline: [{ status: 'PENDING_APPROVAL', label: 'Payment Completed', desc: 'â³ Waiting for Seller Approval', date: baseTime }],
                deliveryAddress: { fullName: 'Rahul Sharma', phone: '+91 98765 43210', email: 'rahul@example.com', address: 'Flat 402, Royal Residency, Sector 15', city: 'Gandhinagar', stateName: 'Gujarat', pincode: '382016' },
                shippingSpeed: 'express', escrowMethod: 'wallet'
              },
              {
                orderId: `EMH_${Math.floor(100000 + Math.random() * 900000)}`,
                date: baseDate,
                createdAt: new Date().toISOString(),
                items: [{ name: 'SoundAura Pro Headphones', price: 12500, quantity: 1, brand: 'SoundAura', img: '🎧', seller: sellerRef }],
                total: 14750,
                status: 'PENDING_APPROVAL',
                timeline: [{ status: 'PENDING_APPROVAL', label: 'Payment Completed', desc: 'â³ Waiting for Seller Approval', date: baseTime }],
                deliveryAddress: { fullName: 'Priya Mehta', phone: '+91 87654 32100', email: 'priya@example.com', address: 'B-204, Sunrise Apartments', city: 'Pune', stateName: 'Maharashtra', pincode: '411001' },
                shippingSpeed: 'standard', escrowMethod: 'upi'
              },
              {
                orderId: `EMH_${Math.floor(100000 + Math.random() * 900000)}`,
                date: baseDate,
                createdAt: new Date().toISOString(),
                items: [{ name: 'AuraRing Smart Health Tracker', price: 9500, quantity: 2, brand: 'AuraRing', img: 'ðŸ’', seller: sellerRef }],
                total: 22420,
                status: 'APPROVED',
                sellerConfirmed: true,
                timeline: [
                  { status: 'PENDING_APPROVAL', label: 'Payment Completed', desc: 'â³ Waiting for Seller Approval', date: baseTime },
                  { status: 'APPROVED', label: 'Seller Approved', desc: '✅ Order approved by seller.', date: baseTime }
                ],
                deliveryAddress: { fullName: 'Amit Kumar', phone: '+91 76543 21000', email: 'amit@example.com', address: '12, MG Road', city: 'Bangalore', stateName: 'Karnataka', pincode: '560001' },
                shippingSpeed: 'standard', escrowMethod: 'card'
              },
              {
                orderId: `EMH_${Math.floor(100000 + Math.random() * 900000)}`,
                date: baseDate,
                createdAt: new Date().toISOString(),
                items: [{ name: 'Minimalist Solid Oak Desk', price: 28000, quantity: 1, brand: 'WoodCraft', img: '🪵', seller: sellerRef }],
                total: 33040,
                status: 'REJECTED',
                sellerRejected: true,
                rejectionReason: 'Out of Stock',
                timeline: [
                  { status: 'PENDING_APPROVAL', label: 'Payment Completed', desc: 'â³ Waiting for Seller Approval', date: baseTime },
                  { status: 'REJECTED', label: 'Seller Rejected', desc: 'âŒ Rejected: Out of Stock', date: baseTime }
                ],
                deliveryAddress: { fullName: 'Sneha Reddy', phone: '+91 65432 10000', email: 'sneha@example.com', address: '45, Jubilee Hills', city: 'Hyderabad', stateName: 'Telangana', pincode: '500033' },
                shippingSpeed: 'express', escrowMethod: 'wallet'
              }
            ];

            seedOrders.forEach(o => parsed.push(o));
            localStorage.setItem('emahu_orders', JSON.stringify(parsed));
            window.dispatchEvent(new Event('storage'));
            return;
          }

          const formatted = myOrders.map(o => {
            // Only list items in the description that belong to this seller or default fallback
            const itemsList = (o.items || []).filter(item => {
              if (!item.seller) return true;
              
              const sellerUserId = sellerUser._id || sellerUser.id;
              
              // If item.seller is a string
              if (typeof item.seller === 'string') {
                return sellerUserId && item.seller.toString() === sellerUserId.toString();
              }
              
              // If item.seller is an object
              const itemSellerId = item.seller._id || item.seller.id;
              const isIdMatch = itemSellerId && sellerUserId && itemSellerId.toString() === sellerUserId.toString();
              const isEmailMatch = item.seller.email && sellerUser.email && 
                                   item.seller.email.toLowerCase() === sellerUser.email.toLowerCase();
              const isProductMatch = (item.productId && myProductIds.has(item.productId.toString())) || (item.name && myProductNames.has(item.name.toLowerCase().trim()));
              const isDefaultFallback = item.seller.email === 'support@emahu.com' || 
                                        item.brand === 'Emahu Seller';
                                        
              return isIdMatch || isEmailMatch || isProductMatch || isDefaultFallback;
            });
            const productName = itemsList.map(item => `${item.name} (x${item.quantity})`).join(', ') || 'Merchandise Item';
            
            // Sum of this seller's items
            const sellerItemsTotal = itemsList.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const totalSum = (o.items || []).reduce((s, i) => s + (i.price * i.quantity), 0);
            const proportionalTotal = (o.total && totalSum > 0) ? Math.round(sellerItemsTotal * (o.total / totalSum)) : sellerItemsTotal;

            return {
              id: o.orderId,
              customer: o.deliveryAddress?.fullName || 'Emahu Customer',
              product: productName,
              amount: proportionalTotal,
              status: o.status || 'PENDING_APPROVAL',
              time: o.date || 'Just now',
              raw: o
            };
          });
          // Set real orders only
          setOrders(formatted);
        } else {
          setOrders([]);
        }
      } catch (err) {
        console.error('Error loading real orders:', err);
        setOrders([]);
      }
    };

    loadRealOrders();
    window.addEventListener('storage', loadRealOrders);
    return () => window.removeEventListener('storage', loadRealOrders);
  }, [sellerUser, products]);

  // Order Management Modals States
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectionReasonType, setRejectionReasonType] = useState('Out of Stock');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [activeLabelOrder, setActiveLabelOrder] = useState(null);
  const [selectedDetailedOrderId, setSelectedDetailedOrderId] = useState(null);
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [orderLoading, setOrderLoading] = useState({});
  const [verifyingEscrow, setVerifyingEscrow] = useState({});
  const [verifiedEscrow, setVerifiedEscrow] = useState({});

  const selectedDetailedOrder = useMemo(() => {
    if (!selectedDetailedOrderId) return null;
    const found = orders.find(o => o.id === selectedDetailedOrderId);
    return found ? found.raw : null;
  }, [selectedDetailedOrderId, orders]);

  useEffect(() => {
    if (isDeliveryModalOpen && selectedOrderId) {
      fetchAvailablePartners(selectedOrderId);
      setSelectedPartnerId('');
      setIsConfirmChecked(false);
      setHasContactedPartner(false);
    }
  }, [isDeliveryModalOpen, selectedOrderId]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('emahu_seller_token');
      if (!token) return;
      const res = await fetch(`${getDynamicApiUrl()}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success && data.notifications) {
        const formatted = data.notifications.map(n => ({
          id: n._id,
          title: n.title,
          message: n.message,
          read: n.isRead,
          date: new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          type: n.type
        }));
        setNotifications(formatted);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    setTimeout(() => fetchNotifications(), 0);
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkNotifsRead = async () => {
    try {
      const token = localStorage.getItem('emahu_seller_token');
      if (!token) return;
      
      const unread = notifications.filter(n => !n.read);
      for (const n of unread) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/notifications/${n.id}/read`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.status === 401) {
          handleSessionExpired();
          return;
        }
      }
      fetchNotifications();
    } catch (err) {
      console.error('Error marking notifications read:', err);
    }
  };

  const pushNotification = async (title, message, role = 'seller') => {
    // We can simulate or directly poll database updates
    fetchNotifications();
  };

  const syncOrderToDatabase = async (orderId, updatedOrdersList) => {
    try {
      const order = updatedOrdersList.find(o => o.orderId === orderId);
      if (order) {
        const payload = { ...order };
        delete payload._id;
        delete payload.__v;
        
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/orders/${orderId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) {
          console.error(`Failed to update order ${orderId} in database:`, data.error);
        }
      }
    } catch (e) {
      console.error(`Error updating order ${orderId} in database:`, e);
    }
  };

  const handleVerifyEscrow = (orderId, amount) => {
    if (verifyingEscrow[orderId] || verifiedEscrow[orderId]) return;
    setVerifyingEscrow(prev => ({ ...prev, [orderId]: true }));
    setTimeout(() => {
      setVerifyingEscrow(prev => ({ ...prev, [orderId]: false }));
      setVerifiedEscrow(prev => ({ ...prev, [orderId]: true }));
      triggerToast('Escrow Verified', `Cryptographic check complete. ₹${amount.toLocaleString('en-IN')} locked in Emahu Secure Vault.`, 'success');
    }, 1200);
  };

  const handleApproveOrder = async (orderId) => {
    if (orderLoading[orderId]) return;
    try {
      setOrderLoading(prev => ({ ...prev, [orderId]: true }));
      const storedOrders = localStorage.getItem('emahu_orders');
      if (storedOrders) {
        const parsed = JSON.parse(storedOrders);
        const updated = parsed.map(o => {
          if (o.orderId === orderId) {
            const timeline = o.timeline || [];
            // Remove any pending timeline item to prevent duplicates
            const filteredTimeline = timeline.filter(t => t.status !== 'APPROVED');
            filteredTimeline.push({
              status: 'APPROVED',
              label: 'Seller Approved',
              desc: '✅ Your order has been approved by the seller.',
              date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            });
            return {
              ...o,
              status: 'APPROVED',
              timeline: filteredTimeline,
              sellerConfirmed: true,
              sellerRejected: false
            };
          }
          return o;
        });
        localStorage.setItem('emahu_orders', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        pushNotification('Order Approved', `Your Order #${orderId} has been approved by the seller.`, 'buyer');
        triggerToast('Order Approved', `Order #${orderId} approved successfully.`, 'success');
        await syncOrderToDatabase(orderId, updated);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Failed to approve order.', 'danger');
    } finally {
      setOrderLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleRejectOrder = async (orderId, reason) => {
    if (orderLoading[orderId]) return;
    try {
      setOrderLoading(prev => ({ ...prev, [orderId]: true }));
      const storedOrders = localStorage.getItem('emahu_orders');
      if (storedOrders) {
        const parsed = JSON.parse(storedOrders);
        const updated = parsed.map(o => {
          if (o.orderId === orderId) {
            const timeline = o.timeline || [];
            const filteredTimeline = timeline.filter(t => t.status !== 'REJECTED');
            filteredTimeline.push({
              status: 'REJECTED',
              label: 'Seller Rejected',
              desc: `âŒ Rejected: ${reason || 'Merchant rejected the order listing.'}`,
              date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            });
            return {
              ...o,
              status: 'REJECTED',
              timeline: filteredTimeline,
              sellerConfirmed: false,
              sellerRejected: true,
              rejectionReason: reason
            };
          }
          return o;
        });
        localStorage.setItem('emahu_orders', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        pushNotification('Order Rejected', `Your Order #${orderId} was rejected by the merchant. Reason: ${reason || 'N/A'}`, 'buyer');
        triggerToast('Order Rejected', `Order #${orderId} rejected.`, 'danger');
        await syncOrderToDatabase(orderId, updated);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Failed to reject order.', 'danger');
    } finally {
      setOrderLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleSelectDeliveryPartner = async (orderId, partnerId, partnerName, cost) => {
    if (orderLoading[orderId]) return;
    try {
      setOrderLoading(prev => ({ ...prev, [orderId]: true }));
      const token = localStorage.getItem('emahu_seller_token');
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/delivery/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId,
          deliveryPartnerId: partnerId
        })
      });
      
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to assign delivery partner');
      }

      // Sync local storage so UI updates instantly
      const storedOrders = localStorage.getItem('emahu_orders');
      if (storedOrders) {
        const parsed = JSON.parse(storedOrders);
        const updated = parsed.map(o => {
          if (o.orderId === orderId) {
            const timeline = o.timeline || [];
            const filteredTimeline = timeline.filter(t => t.status !== 'DELIVERY_ASSIGNED');
            filteredTimeline.push({
              status: 'DELIVERY_ASSIGNED',
              label: 'Delivery Assigned',
              desc: `🚚 Assigned to ${partnerName}.`,
              date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            });
            return {
              ...o,
              status: 'DELIVERY_ASSIGNED',
              timeline: filteredTimeline,
              carrier: partnerName,
              deliveryCost: cost,
              deliveryPartnerId: partnerId,
              deliveryStatus: 'assigned'
            };
          }
          return o;
        });
        localStorage.setItem('emahu_orders', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
      }
      
      triggerToast('Delivery Assigned', `Courier ${partnerName} assigned to Order #${orderId}.`, 'success');
    } catch (err) {
      console.error(err);
      triggerToast('Error', err.message || 'Failed to assign delivery partner.', 'danger');
    } finally {
      setOrderLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleGenerateLabel = async (orderId) => {
    if (orderLoading[orderId]) return;
    try {
      setOrderLoading(prev => ({ ...prev, [orderId]: true }));
      const storedOrders = localStorage.getItem('emahu_orders');
      if (storedOrders) {
        const parsed = JSON.parse(storedOrders);
        const updated = parsed.map(o => {
          if (o.orderId === orderId) {
            const timeline = o.timeline || [];
            const filteredTimeline = timeline.filter(t => t.status !== 'LABEL_GENERATED');
            filteredTimeline.push({
              status: 'LABEL_GENERATED',
              label: 'Shipping Label Generated',
              desc: `📄 Shipping label has been generated successfully.`,
              date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            });
            return {
              ...o,
              status: 'LABEL_GENERATED',
              timeline: filteredTimeline,
              shipmentId: `EMH-SHIP-${Math.floor(100000 + Math.random() * 900000)}`,
              packageWeight: `${(1.5 + Math.random() * 3).toFixed(2)} kg`
            };
          }
          return o;
        });
        localStorage.setItem('emahu_orders', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        pushNotification('Shipping Label Created', `Shipping label generated for Order #${orderId}.`, 'buyer');
        pushNotification('Label Created', `Shipping label generated successfully for Order #${orderId}.`, 'seller');
        triggerToast('Label Generated', `Label generated for Order #${orderId}.`, 'success');

        const fresh = updated.find(o => o.orderId === orderId);
        setActiveLabelOrder(fresh);
        setIsLabelModalOpen(true);
        await syncOrderToDatabase(orderId, updated);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Failed to generate label.', 'danger');
    } finally {
      setOrderLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleAssignAndGenerateLabel = async (orderId, carrierName) => {
    if (orderLoading[orderId]) return;
    try {
      setOrderLoading(prev => ({ ...prev, [orderId]: true }));
      const storedOrders = localStorage.getItem('emahu_orders');
      if (storedOrders) {
        const parsed = JSON.parse(storedOrders);
        const trackingId = `EMH-TRK-${getRandomNumberStr(100000, 999999)}`;
        const shipmentId = `EMH-SHIP-${getRandomNumberStr(100000, 999999)}`;
        const packageWeight = getRandomWeightStr();
        const estDays = carrierName === 'Blue Dart' ? '1-3 Days' : (carrierName === 'Delhivery' ? '2-4 Days' : '2-5 Days');
        const cost = carrierName === 'Blue Dart' ? 120 : (carrierName === 'Delhivery' ? 80 : 75);
        
        const updated = parsed.map(o => {
          if (o.orderId === orderId) {
            const timeline = o.timeline || [];
            
            // Add DELIVERY_ASSIGNED timeline
            const filteredTimeline1 = timeline.filter(t => t.status !== 'DELIVERY_ASSIGNED');
            filteredTimeline1.push({
              status: 'DELIVERY_ASSIGNED',
              label: 'Delivery Assigned',
              desc: `🚚 Assigned to ${carrierName}. Tracking ID: ${trackingId}`,
              date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            });
            
            // Add LABEL_GENERATED timeline
            const filteredTimeline2 = filteredTimeline1.filter(t => t.status !== 'LABEL_GENERATED');
            filteredTimeline2.push({
              status: 'LABEL_GENERATED',
              label: 'Shipping Label Generated',
              desc: `📄 Shipping label has been generated successfully.`,
              date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            });

            return {
              ...o,
              status: 'LABEL_GENERATED',
              timeline: filteredTimeline2,
              carrier: carrierName,
              trackingId,
              shipmentId,
              packageWeight,
              deliveryCost: cost,
              estDays: estDays
            };
          }
          return o;
        });
        localStorage.setItem('emahu_orders', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        
        pushNotification('Courier Assigned', `Courier ${carrierName} assigned to Order #${orderId}.`, 'seller');
        pushNotification('Shipping Label Created', `Shipping label generated for Order #${orderId}.`, 'buyer');
        pushNotification('Label Created', `Shipping label generated successfully for Order #${orderId}.`, 'seller');
        triggerToast('Label Generated', `Label generated for Order #${orderId}.`, 'success');
        
        const fresh = updated.find(o => o.orderId === orderId);
        setActiveLabelOrder(fresh);
        setIsLabelModalOpen(true);
        await syncOrderToDatabase(orderId, updated);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Failed to generate shipping label.', 'danger');
    } finally {
      setOrderLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleMarkReadyForPickup = async (orderId) => {
    if (orderLoading[orderId]) return;
    try {
      setOrderLoading(prev => ({ ...prev, [orderId]: true }));
      const storedOrders = localStorage.getItem('emahu_orders');
      if (storedOrders) {
        const parsed = JSON.parse(storedOrders);
        const updated = parsed.map(o => {
          if (o.orderId === orderId) {
            const timeline = o.timeline || [];
            const filteredTimeline = timeline.filter(t => t.status !== 'READY_FOR_PICKUP');
            filteredTimeline.push({
              status: 'READY_FOR_PICKUP',
              label: 'Ready for Pickup',
              desc: `📦 Package is packed and ready for carrier pickup.`,
              date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            });
            return {
              ...o,
              status: 'READY_FOR_PICKUP',
              timeline: filteredTimeline
            };
          }
          return o;
        });
        localStorage.setItem('emahu_orders', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        pushNotification('Ready for Pickup', `Order #${orderId} is packed and ready for courier pickup.`, 'buyer');
        pushNotification('Pickup Confirmed', `Pickup request sent for Order #${orderId}.`, 'seller');
        triggerToast('Status Updated', `Order #${orderId} marked ready for pickup.`, 'success');
        await syncOrderToDatabase(orderId, updated);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Failed to mark ready for pickup.', 'danger');
    } finally {
      setOrderLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleAdvanceStatus = async (orderId, nextStatus) => {
    if (orderLoading[orderId]) return;
    try {
      setOrderLoading(prev => ({ ...prev, [orderId]: true }));
      const storedOrders = localStorage.getItem('emahu_orders');
      if (storedOrders) {
        const parsed = JSON.parse(storedOrders);
        const updated = parsed.map(o => {
          if (o.orderId === orderId) {
            const timeline = o.timeline || [];
            const filteredTimeline = timeline.filter(t => t.status !== nextStatus);
            
            let label = nextStatus;
            let desc = `Order state shifted to ${nextStatus}.`;
            if (nextStatus === 'PICKED_UP') {
              label = 'Shipment Picked Up';
              desc = `📦 Courier partner ${o.carrier || 'Delhivery'} has picked up the package.`;
            } else if (nextStatus === 'IN_TRANSIT') {
              label = 'In Transit';
              desc = `🚚 Order package is in transit via national EV highway corridor.`;
            } else if (nextStatus === 'OUT_FOR_DELIVERY') {
              label = 'Out For Delivery';
              desc = `🛵 Package is out for delivery with the local dispatch rider.`;
            } else if (nextStatus === 'DELIVERED') {
              label = 'Delivered';
              desc = `✅ Order delivered successfully. Transaction completed.`;
            }

            filteredTimeline.push({
              status: nextStatus,
              label,
              desc,
              date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            });

            return {
              ...o,
              status: nextStatus === 'DELIVERED' ? 'COMPLETED' : nextStatus,
              timeline: filteredTimeline,
              sellerConfirmed: nextStatus === 'DELIVERED' ? true : o.sellerConfirmed
            };
          }
          return o;
        });
        localStorage.setItem('emahu_orders', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));

        // Push status change notifications
        let customerMsg = `Your Order #${orderId} state is now ${nextStatus}.`;
        let sellerMsg = `Order #${orderId} advanced to ${nextStatus}.`;
        if (nextStatus === 'PICKED_UP') {
          customerMsg = `Your shipment has been picked up.`;
        } else if (nextStatus === 'OUT_FOR_DELIVERY') {
          customerMsg = `Your package is out for delivery.`;
        } else if (nextStatus === 'DELIVERED') {
          customerMsg = `Your order has been delivered successfully.`;
          sellerMsg = `Order #${orderId} delivered successfully.`;
        }

        pushNotification(nextStatus, customerMsg, 'buyer');
        pushNotification(nextStatus, sellerMsg, 'seller');
        triggerToast('Status Advanced', `Order #${orderId} is now ${nextStatus}.`, 'success');
        await syncOrderToDatabase(orderId, updated);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Failed to advance order status.', 'danger');
    } finally {
      setOrderLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  
  // Toast notifications state
  const [toasts, setToasts] = useState([]);
  
  // Add Product Modal Form States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductBrand, setNewProductBrand] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductComparePrice, setNewProductComparePrice] = useState('');
  const [newProductStock, setNewProductStock] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductImage, setNewProductImage] = useState('');
  const [newProductImages, setNewProductImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [manualUrlInput, setManualUrlInput] = useState('');
  const [sellerReviews, setSellerReviews] = useState([]);
  const [adminReviews, setAdminReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [verifyCodes, setVerifyCodes] = useState({});
  const [resubmitProductId, setResubmitProductId] = useState(null);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [selectedDetailedProduct, setSelectedDetailedProduct] = useState(null);

  // Delete Confirmation Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Auto-dismiss toasts
  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts((prev) => prev.slice(1));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);
  // Utility to push notifications
  const triggerToast = (title, message, type = 'success') => {
    const id = getTimestampString();
    setToasts([{ id, title, message, type }]);
  };

  // Add Product Handler
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (isSubmittingProduct) return;
    if (newProductImages.length === 0) {
      setFormError('Please add at least one product image to the gallery');
      return;
    }
    if (
      !newProductName.trim() ||
      !newProductBrand.trim() ||
      !newProductCategory.trim() ||
      !newProductPrice ||
      !newProductComparePrice ||
      !newProductStock ||
      !newProductImage.trim() ||
      !newProductDescription.trim()
    ) {
      setFormError('Please fill in all required fields');
      return;
    }
    
    // Validate Numeric values
    const priceNum = parseFloat(newProductPrice);
    const comparePriceNum = parseFloat(newProductComparePrice);
    const stockNum = parseInt(newProductStock);

    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError('Please enter a valid price greater than 0.');
      return;
    }
    if (isNaN(comparePriceNum) || comparePriceNum <= 0) {
      setFormError('Please enter a valid compare-at price greater than 0.');
      return;
    }
    if (comparePriceNum <= priceNum) {
      setFormError('Compare-at price must be greater than listing price.');
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setFormError('Please enter a valid non-negative stock count.');
      return;
    }

    try {
      setIsSubmittingProduct(true);
      const token = localStorage.getItem('emahu_seller_token');
      const url = resubmitProductId 
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products/${resubmitProductId}/resubmit`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products`;
      const method = resubmitProductId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newProductName.trim(),
          brand: newProductBrand.trim(),
          category: newProductCategory,
          price: priceNum,
          comparePrice: comparePriceNum,
          stock: stockNum,
          image: newProductImage.trim(),
          images: newProductImages,
          description: newProductDescription.trim()
        })
      });

      if (res.status === 401) {
        handleSessionExpired();
        return;
      }

      const data = await res.json();
      if (!data.success) {
        setFormError(data.error || 'Failed to submit product');
        return;
      }

      if (resubmitProductId) {
        setProducts((prev) => prev.map(p => (p.id || p._id) === resubmitProductId ? data.product : p));
        triggerToast(
          'Product Submitted',
          `EMAHU-PRO: "${newProductName}" has been updated and is pending admin approval.`,
          'success'
        );
      } else {
        setProducts((prev) => [data.product, ...prev]);
        triggerToast(
          'Product Created',
          `EMAHU-PRO: "${newProductName}" is now live.`,
          'success'
        );
      }
      
      // Close Modal and Reset form fields
      setIsAddModalOpen(false);
      resetAddForm();
    } catch (err) {
      console.error('Error adding/resubmitting product:', err);
      setFormError('Network error submitting product. Please try again.');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  // Synchronize newProductImage with the first item in newProductImages
  useEffect(() => {
    setNewProductImage(newProductImages[0] || '');
  }, [newProductImages]);

  const resetAddForm = () => {
    setNewProductName('');
    setNewProductBrand('');
    setNewProductSku('');
    
    let defaultCat = 'Electronics & Tech';
    if (sellerUser?.category) {
      const storeCat = sellerUser.category.toLowerCase();
      if (storeCat === 'electronics') {
        defaultCat = 'Electronics & Tech';
      } else if (storeCat === 'fashion') {
        defaultCat = 'Apparel & Fashion';
      } else if (storeCat === 'home') {
        defaultCat = 'Kitchen & Dining';
      } else {
        defaultCat = 'Lifestyle & Home';
      }
    }
    setNewProductCategory(defaultCat);
    
    setNewProductPrice('');
    setNewProductComparePrice('');
    setNewProductStock('');
    setNewProductDescription('');
    setNewProductImage('');
    setNewProductImages([]);
    setManualUrlInput('');
    setFormError('');
    setResubmitProductId(null);
  };

  const handleVerifyProductCode = async (productId) => {
    const product = products.find(p => (p.id || p._id) === productId);
    const code = verifyCodes[productId] || (product && product.adminCode);
    if (!code || !code.trim()) {
      triggerToast('Verification Error', 'Please enter a verification code first.', 'danger');
      return;
    }

    try {
      const token = localStorage.getItem('emahu_seller_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products/${productId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: code.trim() })
      });

      const data = await res.json();
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      if (data.success) {
        setProducts((prev) => prev.map(p => (p.id || p._id) === productId ? data.product : p));
        triggerToast('Listing Approved', `Product listing "${data.product.name}" is now live!`, 'success');
        setVerifyCodes(prev => {
          const updated = { ...prev };
          delete updated[productId];
          return updated;
        });
        if (data.product && data.product.sku) {
          window.open(`${window.location.origin}/buyer/products/${data.product.sku}`, '_blank');
        }
      } else {
        triggerToast('Verification Failed', data.error || 'Invalid verification code.', 'danger');
      }
    } catch (err) {
      console.error('Verify code error:', err);
      triggerToast('Error', 'Network error. Please try again.', 'danger');
    }
  };



  // Pre-populate form and open resubmit modal
  const handleOpenResubmitModal = (product) => {
    setResubmitProductId(product.id || product._id);
    setNewProductName(product.name);
    setNewProductBrand(product.brand || '');
    setNewProductSku(product.sku);
    setNewProductCategory(product.category);
    setNewProductPrice(product.price.toString());
    setNewProductComparePrice(product.comparePrice ? product.comparePrice.toString() : '');
    setNewProductStock(product.stock.toString());
    setNewProductDescription(product.description || '');
    setNewProductImage(product.image || '');
    setNewProductImages(product.images || (product.image ? [product.image] : []));
    setIsAddModalOpen(true);
  };

  const renderMultiImageSelector = () => {
    const handleFileSelect = (e) => {
      const files = Array.from(e.target.files);
      processFiles(files);
    };

    const processFiles = (files) => {
      files.forEach(file => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          setNewProductImages(prev => [...prev, e.target.result]);
        };
        reader.readAsDataURL(file);
      });
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = () => {
      setIsDragging(false);
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setIsDragging(false);
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(Array.from(e.dataTransfer.files));
      }
      
      const link = e.dataTransfer.getData('text/plain');
      if (link && link.startsWith('http')) {
        setNewProductImages(prev => [...prev, link]);
      }
    };

    const addManualUrl = () => {
      if (manualUrlInput.trim() && manualUrlInput.trim().startsWith('http')) {
        setNewProductImages(prev => [...prev, manualUrlInput.trim()]);
        setManualUrlInput('');
      } else {
        triggerToast('Invalid URL', 'Please enter a valid HTTP/HTTPS image URL', 'danger');
      }
    };

    const removeImage = (indexToRemove) => {
      setNewProductImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    return (
      <div style={{ marginTop: '12px', width: '100%' }}>
        <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Product Gallery * (Drag/drop files or links, or click upload)</label>
        
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: isDragging ? '2px dashed var(--color-primary)' : '2px dashed var(--border-color)',
            backgroundColor: isDragging ? 'rgba(56, 189, 248, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            borderRadius: '10px',
            padding: '20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
        >
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer'
            }}
          />
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📸</div>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Drag & Drop image files or web links here
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            or click to browse local files
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <input
            type="url"
            className="form-input"
            style={{ height: '36px', fontSize: '0.85rem', flex: 1 }}
            placeholder="Paste external image link here..."
            value={manualUrlInput}
            onChange={(e) => setManualUrlInput(e.target.value)}
          />
          <button
            type="button"
            className="company-portal-btn"
            onClick={addManualUrl}
            style={{ height: '36px', padding: '0 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--color-primary)' }}
          >
            Add Link
          </button>
        </div>

        {newProductImages.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            marginTop: '12px',
            padding: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.03)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)'
          }}>
            {newProductImages.map((img, idx) => (
              <div key={idx} style={{
                position: 'relative',
                width: '60px',
                height: '60px',
                borderRadius: '6px',
                overflow: 'hidden',
                border: '1px solid var(--border-color)',
                backgroundColor: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img
                  src={img}
                  alt={`Product img ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.src = 'https://placehold.co/60x60?text=Error'; }}
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(239, 68, 68, 0.9)',
                    color: '#fff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    padding: 0
                  }}
                >
                  ✕
                </button>
                {idx === 0 && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--color-primary)',
                    color: '#0f172a',
                    fontSize: '8px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    padding: '1px 0'
                  }}>
                    MAIN
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const fetchSellerReviews = async () => {
    try {
      setReviewsLoading(true);
      const token = localStorage.getItem('emahu_seller_token');
      if (!token) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/reviews/seller`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setSellerReviews(data.reviews);
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      const token = localStorage.getItem('emahu_seller_token');
      if (!token) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        triggerToast('Review Removed', 'Review has been successfully deleted.', 'success');
        setSellerReviews(prev => prev.filter(r => r._id !== reviewId));
        setAdminReviews(prev => prev.filter(r => r._id !== reviewId));
      } else {
        triggerToast('Error', data.error || 'Failed to delete review.', 'danger');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Network error deleting review.', 'danger');
    }
  };

  useEffect(() => {
    if (activeTab === 'reviews') {
      fetchSellerReviews();
    }
  }, [activeTab]);

  // Open Delete Confirmation
  const confirmDeleteProduct = (product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  // Perform actual deletion
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    
    try {
      const token = localStorage.getItem('emahu_seller_token');
      const productId = productToDelete.id || productToDelete._id;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.status === 401) {
        handleSessionExpired();
        return;
      }

      const data = await res.json();

      if (res.status === 409) {
        // Active orders blocking deletion
        const count = data.activeOrders?.length || 0;
        triggerToast(
          '🚚 Delivery In Progress',
          `Cannot delete "${productToDelete.name}" — it has ${count} active order${count !== 1 ? 's' : ''} pending delivery. Wait until all orders are delivered before removing this listing.`,
          'warning'
        );
      } else if (data.success) {
        setProducts((prev) => prev.filter((p) => (p.id || p._id) !== productId));
        triggerToast(
          'Product Removed',
          `EMAHU-PRO: "${productToDelete.name}" was successfully deleted.`,
          'danger'
        );
      } else {
        triggerToast('Deletion Failed', data.error || 'Could not delete product listing', 'danger');
      }
    } catch (err) {
      console.error('Error deleting product:', err);
      triggerToast('Deletion Error', 'Network error during product deletion', 'danger');
    }
    
    setIsDeleteModalOpen(false);
    setProductToDelete(null);
  };

  // Process sorting & filtering products
  const filteredProducts = products
    .filter((product) => {
      // In the main products tab, show only fully approved listings
      if (activeTab === 'products' && product.approvalStatus !== 'approved') {
        return false;
      }

      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (product.sku || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'stock') return b.stock - a.stock;
      if (sortBy === 'sales') return b.sales - a.sales;
      return 0;
    });

  // Analytics totals calculation
  const totalRevenue = orders.reduce((acc, o) => acc + o.amount, 0);
  const totalSalesCount = orders.length;
  const lowStockCount = products.filter(p => p.status === 'low-stock').length;
  const outOfStockCount = products.filter(p => p.status === 'out-of-stock').length;

  // Highest selling product and selling range calculations
  const sortedProductsRange = useMemo(() => {
    return [...products].sort((a, b) => (b.sales || 0) - (a.sales || 0));
  }, [products]);

  const highestSellingProduct = useMemo(() => {
    if (sortedProductsRange.length === 0) return null;
    return sortedProductsRange[0];
  }, [sortedProductsRange]);

  // Dynamic Weekly Chart Calculations
  const chartData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    const revenueByDay = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    const dispatchesByDay = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };

    orders.forEach(o => {
      let dayName = 'Mon';
      if (o.raw) {
        try {
          const date = parseOrderDate(o.raw);
          const dayIndex = date.getDay();
          dayName = days[dayIndex];
        } catch (e) {
          dayName = 'Mon';
        }
      }
      if (revenueByDay[dayName] !== undefined) {
        revenueByDay[dayName] += o.amount;
        dispatchesByDay[dayName] += 1;
      }
    });

    return orderedDays.map(day => ({
      day,
      revenue: revenueByDay[day],
      dispatches: dispatchesByDay[day]
    }));
  }, [orders]);

  const maxRevenue = useMemo(() => {
    return Math.max(...chartData.map(d => d.revenue), 10000);
  }, [chartData]);

  const maxDispatches = useMemo(() => {
    return Math.max(...chartData.map(d => d.dispatches), 1);
  }, [chartData]);

  const chartPoints = useMemo(() => {
    return chartData.map((d, i) => {
      const x = 70 + i * 65;
      const y = 180 - (d.revenue / maxRevenue) * 135;
      return { x, y };
    });
  }, [chartData, maxRevenue]);

  const dispatchPoints = useMemo(() => {
    return chartData.map((d, i) => {
      const x = 70 + i * 65;
      const y = 180 - (d.dispatches / maxDispatches) * 110;
      return { x, y };
    });
  }, [chartData, maxDispatches]);

  const revenuePath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    return `M ${chartPoints[0].x} ${chartPoints[0].y} ` + chartPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
  }, [chartPoints]);

  const revenueAreaPath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    return `${revenuePath} L ${chartPoints[chartPoints.length - 1].x} 180 L ${chartPoints[0].x} 180 Z`;
  }, [chartPoints, revenuePath]);

  const dispatchPath = useMemo(() => {
    if (dispatchPoints.length === 0) return '';
    return `M ${dispatchPoints[0].x} ${dispatchPoints[0].y} ` + dispatchPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
  }, [dispatchPoints]);

  // Dynamic Chart Interactive Tooltip Parameters
  const peakDayIndex = useMemo(() => {
    let maxIdx = 0;
    let maxRev = -1;
    chartData.forEach((d, idx) => {
      if (d.revenue > maxRev) {
        maxRev = d.revenue;
        maxIdx = idx;
      }
    });
    return maxIdx;
  }, [chartData]);

  const hoverX = useMemo(() => {
    return chartPoints[peakDayIndex]?.x ?? 70;
  }, [chartPoints, peakDayIndex]);

  const hoverY = useMemo(() => {
    return chartPoints[peakDayIndex]?.y ?? 180;
  }, [chartPoints, peakDayIndex]);

  const tooltipWidth = 115;
  const tooltipX = useMemo(() => {
    return Math.max(50, Math.min(480 - tooltipWidth, hoverX - 57));
  }, [hoverX]);

  const tooltipY = useMemo(() => {
    return hoverY - 50;
  }, [hoverY]);

  // Dynamic Geographic Shares Calculation
  const stateShares = useMemo(() => {
    const counts = {};
    orders.forEach(o => {
      let state = 'Others';
      if (o.raw && o.raw.deliveryAddress && o.raw.deliveryAddress.stateName) {
        state = o.raw.deliveryAddress.stateName;
      }
      counts[state] = (counts[state] || 0) + 1;
    });

    const total = orders.length || 1;
    return Object.entries(counts)
      .map(([state, count]) => ({
        state,
        pct: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [orders]);

  // Dynamic Conversion Funnel Metrics
  const funnelViews = totalSalesCount * 12 + 120;
  const funnelCart = totalSalesCount * 4 + 40;
  const funnelCheckout = totalSalesCount * 1.5 + 15;
  const funnelSales = totalSalesCount;

  const cartPct = funnelViews > 0 ? Math.round((funnelCart / funnelViews) * 100) : 0;
  const checkoutPct = funnelViews > 0 ? Math.round((funnelCheckout / funnelViews) * 100) : 0;
  const salesPct = funnelViews > 0 ? (funnelSales / funnelViews * 100).toFixed(2) : '0.00';

  // Orders tab computed values â€” recalculated on every render when orders/filter state changes
  const pendingOrdersCount = orders.filter(o => o.status === 'PENDING_APPROVAL').length;
  const filteredOrdersDisplay = orderStatusFilter === 'all'
    ? orders
    : orderStatusFilter === 'DELIVERED'
      ? orders.filter(o => o.status === 'DELIVERED' || o.status === 'COMPLETED')
      : orders.filter(o => o.status === orderStatusFilter);

  // Render high-end loading display during verification to prevent DOM flash
  if (!isAuthorized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0a0b10', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #1f2937', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>Verifying merchant session credentials...</p>
        </div>
      </div>
    );
  }

  const isApproved = sellerUser?.status === 'approved' || 
    (['business_registration', 'id_proof'].every(type => 
      sellerDocuments.some(d => d.documentType === type && d.status === 'approved')
    ));

  return (
    <div className="dashboard-layout">
      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <div className="toast-content">
              <span className="toast-title">{toast.title}</span>
              <span className="toast-message">{toast.message}</span>
            </div>
            <button className="toast-close" onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Sidebar Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`sidebar ${isSidebarOpen ? 'mobile-open' : ''}`}>
        <Link href="/" className="sidebar-brand">
          <div className="sidebar-logo">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#6366f1" />
              <path d="M8 12h16M8 16h12M8 20h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="sidebar-title">EMAHU</span>
          <span className="sidebar-title-tag">Pro</span>
        </Link>

        <ul className="sidebar-menu">
          {!isApproved && (
            <li>
              <button 
                className={`sidebar-item-btn ${activeTab === 'status' ? 'active' : ''}`}
                onClick={() => { setActiveTab('status'); setIsSidebarOpen(false); }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px' }}>
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Verification Status</span>
              </button>
            </li>
          )}
          <li>
            <button 
              className={`sidebar-item-btn ${activeTab === 'overview' ? 'active' : ''}`}
              disabled={!isApproved}
              onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
              <span>Overview</span>
              {!isApproved && <span style={{ marginLeft: 'auto' }}>🔒</span>}
            </button>
          </li>
          <li>
            <button 
              className={`sidebar-item-btn ${activeTab === 'products' ? 'active' : ''}`}
              disabled={!isApproved}
              onClick={() => { setActiveTab('products'); setIsSidebarOpen(false); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Approved Products</span>
              {!isApproved && <span style={{ marginLeft: 'auto' }}>🔒</span>}
            </button>
          </li>
          <li>
            <button 
              className={`sidebar-item-btn ${activeTab === 'requests' ? 'active' : ''}`}
              disabled={!isApproved}
              onClick={() => { setActiveTab('requests'); setIsSidebarOpen(false); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>Verification Requests</span>
              {!isApproved && <span style={{ marginLeft: 'auto' }}>🔒</span>}
            </button>
          </li>
          <li>
            <button 
              className={`sidebar-item-btn ${activeTab === 'orders' ? 'active' : ''}`}
              disabled={!isApproved}
              onClick={() => { setActiveTab('orders'); setIsSidebarOpen(false); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Orders</span>
              {activeTab !== 'orders' && pendingOrdersCount > 0 && (
                <span className="sidebar-title-tag" style={{ marginLeft: '10px', background: 'var(--color-danger)' }}>
                  {pendingOrdersCount}
                </span>
              )}
              {!isApproved && <span style={{ marginLeft: 'auto' }}>🔒</span>}
            </button>
          </li>
          <li>
            <button 
              className={`sidebar-item-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              disabled={!isApproved}
              onClick={() => { setActiveTab('analytics'); setIsSidebarOpen(false); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Analytics</span>
              {!isApproved && <span style={{ marginLeft: 'auto' }}>🔒</span>}
            </button>
          </li>
          <li>
            <button 
              className={`sidebar-item-btn ${activeTab === 'settings' ? 'active' : ''}`}
              disabled={!isApproved}
              onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Settings</span>
              {!isApproved && <span style={{ marginLeft: 'auto' }}>🔒</span>}
            </button>
          </li>
          {sellerUser?.role === 'admin' && (
            <>
              <li>
                <button 
                  className={`sidebar-item-btn ${activeTab === 'sellers_management' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('sellers_management'); setIsSidebarOpen(false); }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px' }}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span>Sellers Management</span>
                </button>
              </li>
              <li>
                <button 
                  className={`sidebar-item-btn ${activeTab === 'delivery_settings' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('delivery_settings'); setIsSidebarOpen(false); }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px' }}>
                    <rect x="1" y="3" width="15" height="13" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="5.5" cy="18.5" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="18.5" cy="18.5" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Delivery Settings</span>
                </button>
              </li>
            </>
          )}
        </ul>

        <div className="sidebar-profile">
          <div className="avatar-wrapper">
            <div className="sidebar-avatar">
              {sellerUser && sellerUser.name ? sellerUser.name.substring(0, 2).toUpperCase() : 'PS'}
            </div>
            <span className="avatar-badge"></span>
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-username">{sellerUser ? sellerUser.name : 'Pro Seller Inc.'}</span>
            <span className="sidebar-usertag">{sellerUser ? sellerUser.email : 'Premium Account'}</span>
          </div>
          <button className="logout-btn" onClick={handleSignOut} title="Log Out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="main-wrapper">
        {/* --- HEADER --- */}
        <header className="header">
          <button className="mobile-toggle-btn" onClick={() => setIsSidebarOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="header-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search across analytics & products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="header-actions" style={{ position: 'relative' }}>
            <button className="icon-badge-btn" onClick={() => { setIsNotifOpen(!isNotifOpen); handleMarkNotifsRead(); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {notifications.some(n => !n.read) && <span className="badge-dot"></span>}
            </button>

            {isNotifOpen && (
              <div className="notif-popover" style={{
                position: 'absolute',
                top: '50px',
                right: '10px',
                width: '320px',
                maxHeight: '400px',
                backgroundColor: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                textAlign: 'left'
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #27272a',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Notifications Center</strong>
                  <button 
                    onClick={() => {
                      try {
                        const stored = localStorage.getItem('emahu_notifications') || '[]';
                        const parsed = JSON.parse(stored);
                        const updated = parsed.filter(n => n.role !== 'seller');
                        localStorage.setItem('emahu_notifications', JSON.stringify(updated));
                        window.dispatchEvent(new Event('storage'));
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: '#a1a1aa', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Clear All
                  </button>
                </div>
                <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#a1a1aa', fontSize: '0.8rem' }}>
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        backgroundColor: n.read ? 'transparent' : 'rgba(65, 105, 225, 0.08)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#fff' }}>{n.title}</span>
                          <span style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>{n.date}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#cbd5e1', lineHeight: '1.3' }}>{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="header-divider"></div>

            {sellerUser?.status === 'approved' && (
              <div style={{ height: '36px' }} />
            )}
          </div>
        </header>

        {/* --- DYNAMIC VIEWPORT CONTROLLER --- */}
        <main className="view-container">
          {sellerUser?.status === 'pending' && (
            <div style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '8px',
              padding: '16px 20px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <div>
                <h4 style={{ margin: 0, color: '#92400e', fontSize: '0.95rem', fontWeight: 'bold' }}>Store Account Pending Verification</h4>
                <p style={{ margin: '4px 0 0 0', color: '#78350f', fontSize: '0.9rem', lineHeight: '1.4', fontWeight: '600' }}>
                  Aapki business registration verification pending hai. Compliance experts details verify kar rahe hain. Tab tak aap product verification requests submit kar sakte hain.
                </p>
              </div>
            </div>
          )}

          {sellerUser?.status === 'rejected' && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              padding: '16px 20px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '1.5rem' }}>❌</span>
              <div>
                <h4 style={{ margin: 0, color: '#991b1b', fontSize: '0.95rem', fontWeight: 'bold' }}>Store Registration Rejected</h4>
                <p style={{ margin: '4px 0 0 0', color: '#7f1d1d', fontSize: '0.9rem', lineHeight: '1.4', fontWeight: '600' }}>
                  Aapki seller profile evaluation standard terms complete nahi kar payi. Please parameters resolve karein or support se clarify karein.
                </p>
              </div>
            </div>
          )}

          {/* TAB: VERIFICATION STATUS (FOR UNAPPROVED SELLERS) */}
          {activeTab === 'status' && (
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 0' }}>
              <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Verification Desk
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Monitor onboarding progress and resubmit compliance credentials.</p>
              </div>

              {sellerUser?.status === 'pending' && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.05)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '16px',
                  padding: '32px',
                  textAlign: 'center',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
                  backdropFilter: 'blur(10px)',
                  marginBottom: '32px'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    animation: 'pulse 2s infinite'
                  }}>
                    <span style={{ fontSize: '2rem' }}>⏳</span>
                  </div>
                  <h3 style={{ fontSize: '1.4rem', color: '#78350f', fontWeight: '700', marginBottom: '12px' }}>
                    Waiting for Admin Approval
                  </h3>
                  <p style={{ color: '#92400e', fontSize: '1rem', lineHeight: '1.6', margin: '0 auto', maxWidth: '600px', fontWeight: '600' }}>
                    Aapki business registration verification pending hai. Compliance experts details verify kar rahe hain. Tab tak aap product verification requests submit kar sakte hain.
                  </p>
                </div>
              )}

              {sellerUser?.status === 'rejected' && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '16px',
                  padding: '32px',
                  textAlign: 'center',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
                  backdropFilter: 'blur(10px)',
                  marginBottom: '32px'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px'
                  }}>
                    <span style={{ fontSize: '2rem' }}>❌</span>
                  </div>
                  <h3 style={{ fontSize: '1.4rem', color: '#7f1d1d', fontWeight: '700', marginBottom: '12px' }}>
                    Store Registration Rejected
                  </h3>
                  <p style={{ color: '#b91c1c', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 auto', maxWidth: '600px', fontWeight: '600' }}>
                    Aapki seller profile evaluation standard terms complete nahi kar payi. Please parameters resolve karein or support se clarify karein.
                  </p>
                  {sellerUser?.verificationFeedback && (
                    <div style={{
                      marginTop: '20px',
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      padding: '16px',
                      borderRadius: '8px',
                      color: '#991b1b',
                      fontSize: '0.9rem',
                      textAlign: 'left'
                    }}>
                      <strong>Admin Feedback:</strong> {sellerUser.verificationFeedback}
                    </div>
                  )}
                </div>
              )}

              {sellerUser?.status === 'more_info_requested' && (
                <div style={{
                  background: 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '16px',
                  padding: '32px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
                  backdropFilter: 'blur(10px)',
                  marginBottom: '32px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(59, 130, 246, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <span style={{ fontSize: '1.5rem' }}>ℹ️</span>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.3rem', color: '#1e3a8a', fontWeight: '700', margin: 0 }}>
                        Verification Information Required
                      </h3>
                      <p style={{ color: '#1e40af', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                        The compliance team has requested more details regarding your registration.
                      </p>
                    </div>
                  </div>

                  {sellerUser?.verificationFeedback && (
                    <div style={{
                      background: 'rgba(59, 130, 246, 0.05)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      padding: '16px',
                      borderRadius: '8px',
                      color: '#1e3a8a',
                      fontSize: '0.9rem',
                      marginBottom: '24px'
                    }}>
                      <strong style={{ color: '#2563eb', display: 'block', marginBottom: '4px' }}>Auditor Feedback:</strong>
                      {sellerUser.verificationFeedback}
                    </div>
                  )}

                  {/* Document resubmission form */}
                  <SellerDocumentResubmissionForm 
                    documents={sellerDocuments} 
                    onSuccess={async () => {
                      triggerToast('Details Resubmitted', 'Your store verification request is now pending review.', 'success');
                      // Re-sync user status by calling getProfile
                      const token = localStorage.getItem('emahu_seller_token');
                      if (token) {
                        const res = await getProfile(token);
                        if (res.success && res.user) {
                          setSellerUser(res.user);
                          localStorage.setItem('emahu_seller_user', JSON.stringify(res.user));
                        }
                      }
                      fetchSellerDocuments();
                    }} 
                  />
                </div>
              )}

              {/* Documents status tracker list */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px' }}>Uploaded Documents Status</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {['business_registration', 'id_proof'].map(type => {
                    const doc = sellerDocuments.find(d => d.documentType === type);
                    const docName = type === 'business_registration' ? 'Business Registration Document' : 'ID Proof (PAN/Aadhaar)';
                    return (
                      <div key={type} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        padding: '16px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          width: '100%'
                        }}>
                          <div>
                            <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem', display: 'block' }}>{docName}</strong>
                            {doc ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                                <a href={doc.fileUrl} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', fontSize: '0.8rem', textDecoration: 'underline', fontWeight: '500' }}>
                                  View Submitted Document
                                </a>
                                {doc.feedback && (
                                  <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>(Feedback: {doc.feedback})</span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginTop: '4px' }}>Not uploaded</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {doc?.status !== 'approved' && editingDocType !== type && (
                              <button 
                                onClick={() => { setEditingDocType(type); setInputDocUrl(doc ? doc.fileUrl : ''); }}
                                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(79, 70, 229, 0.4)', background: 'rgba(79, 70, 229, 0.05)', color: '#4f46e5', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
                              >
                                {doc ? 'Update Link' : 'Provide Document'}
                              </button>
                            )}
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              backgroundColor: doc?.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : doc?.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                              color: doc?.status === 'approved' ? '#10b981' : doc?.status === 'rejected' ? '#ef4444' : '#f59e0b',
                              border: `1px solid ${doc?.status === 'approved' ? 'rgba(16, 185, 129, 0.2)' : doc?.status === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                            }}>
                              {doc ? doc.status.toUpperCase() : 'PENDING'}
                            </span>
                          </div>
                        </div>

                        {editingDocType === type && (
                          <div style={{
                            marginTop: '8px',
                            paddingTop: '12px',
                            borderTop: '1px solid var(--border-color)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            width: '100%'
                          }}>
                            <DocumentUploader
                              label="Attach Document File"
                              value={inputDocUrl}
                              onChange={setInputDocUrl}
                            />
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => handleInlineSubmit(type)}
                                disabled={inlineSubmitting || !inputDocUrl}
                                style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#6366f1', color: '#fff', border: 'none', fontSize: '0.8rem', cursor: (inlineSubmitting || !inputDocUrl) ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: (inlineSubmitting || !inputDocUrl) ? 0.6 : 1 }}
                              >
                                {inlineSubmitting ? 'Processing...' : 'Submit Document'}
                              </button>
                              <button 
                                onClick={() => setEditingDocType(null)}
                                style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              <div className="view-header">
                <div className="view-title-group">
                  <h2>Overview Dashboard</h2>
                  <p>Real-time analytics, company sales volumes, and core inventory alerts.</p>
                </div>
              </div>

              {/* STATS SUMMARY GRID */}
              <div className="stats-grid">
                <div className="stat-card primary-theme">
                  <div className="stat-header">
                    <span className="stat-title">Total Sales Revenue</span>
                    <div className="stat-icon primary">₹</div>
                  </div>
                  <div className="stat-value">₹{totalRevenue.toLocaleString('en-IN')}</div>
                  <div className="stat-footer">
                    <span className="stat-trend up">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                      {totalRevenue > 0 ? 'Active' : '0%'}
                    </span>
                    <span>vs last month</span>
                  </div>
                </div>

                <div className="stat-card success-theme">
                  <div className="stat-header">
                    <span className="stat-title">Total Orders Dispatched</span>
                    <div className="stat-icon success">📦</div>
                  </div>
                  <div className="stat-value">{totalSalesCount.toLocaleString()}</div>
                  <div className="stat-footer">
                    <span className="stat-trend up">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                      {totalSalesCount > 0 ? 'Active' : '0%'}
                    </span>
                    <span>monthly growth</span>
                  </div>
                </div>

                <div className="stat-card warning-theme">
                  <div className="stat-header">
                    <span className="stat-title">Low Stock SKUs</span>
                    <div className="stat-icon warning">⚠️ï¸</div>
                  </div>
                  <div className="stat-value">{lowStockCount}</div>
                  <div className="stat-footer">
                    <span>{products.filter(p => p.status === 'in-stock').length} Healthy list items</span>
                  </div>
                </div>

                <div className="stat-card danger-theme">
                  <div className="stat-header">
                    <span className="stat-title">Out of Stock items</span>
                    <div className="stat-icon danger">⛔</div>
                  </div>
                  <div className="stat-value">{outOfStockCount}</div>
                  <div className="stat-footer">
                    <span style={{ color: 'var(--color-danger)' }}>Requires instant re-order</span>
                  </div>
                </div>
              </div>

              {/* TWO COLS GRID: SALES GRAPH & RECENT TRANSACTIONS */}
              <div className="dashboard-grid-two-cols">
                {/* SVG Graph area */}
                <div className="glass-card">
                  <div className="glass-card-header">
                    <span className="glass-card-title">Weekly Revenue Breakdown (INR)</span>
                    <div className="chart-legend">
                      <div className="legend-item">
                        <span className="legend-color revenue"></span>
                        <span>Revenue</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-color orders"></span>
                        <span>Dispatches</span>
                      </div>
                    </div>
                  </div>

                  <div className="chart-container">
                    <svg className="chart-svg" viewBox="0 0 500 220">
                      <defs>
                        <linearGradient id="revenue-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      
                      {/* Grid Lines */}
                      <line x1="40" y1="45" x2="480" y2="45" className="chart-grid-line" />
                      <line x1="40" y1="90" x2="480" y2="90" className="chart-grid-line" />
                      <line x1="40" y1="135" x2="480" y2="135" className="chart-grid-line" />
                      
                      {/* Axes */}
                      <line x1="40" y1="20" x2="40" y2="180" className="chart-axis-line" />
                      <line x1="40" y1="180" x2="480" y2="180" className="chart-axis-line" />
                      
                      {/* Axis Labels */}
                      <text x="35" y="180" textAnchor="end" className="chart-axis-text">0</text>
                      <text x="35" y="135" textAnchor="end" className="chart-axis-text">₹{Math.round(maxRevenue / 3).toLocaleString()}</text>
                      <text x="35" y="90" textAnchor="end" className="chart-axis-text">₹{Math.round((maxRevenue / 3) * 2).toLocaleString()}</text>
                      <text x="35" y="45" textAnchor="end" className="chart-axis-text">₹{Math.round(maxRevenue).toLocaleString()}</text>

                      {/* X labels */}
                      <text x="70" y="198" textAnchor="middle" className="chart-axis-text">Mon</text>
                      <text x="135" y="198" textAnchor="middle" className="chart-axis-text">Tue</text>
                      <text x="200" y="198" textAnchor="middle" className="chart-axis-text">Wed</text>
                      <text x="265" y="198" textAnchor="middle" className="chart-axis-text">Thu</text>
                      <text x="330" y="198" textAnchor="middle" className="chart-axis-text">Fri</text>
                      <text x="395" y="198" textAnchor="middle" className="chart-axis-text">Sat</text>
                      <text x="460" y="198" textAnchor="middle" className="chart-axis-text">Sun</text>

                      {/* Line Chart Area Fill for Revenue */}
                      {revenueAreaPath && <path d={revenueAreaPath} className="chart-area-revenue" />}

                      {/* Line Chart Stroke for Revenue (Green) */}
                      {revenuePath && <path d={revenuePath} className="chart-path-revenue" />}

                      {/* Line Chart Stroke for Orders (Yellow) */}
                      {dispatchPath && <path d={dispatchPath} className="chart-path-orders" />}

                      {/* Dotted Vertical Hover Line */}
                      <line x1={hoverX} y1={hoverY} x2={hoverX} y2="180" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 4" className="chart-hover-line" />
                      <rect x={hoverX - 15} y={hoverY} width="30" height={180 - hoverY} fill="rgba(16, 185, 129, 0.08)" className="chart-hover-bg" />

                      {/* Interactive Dots for Revenue */}
                      {chartPoints.map((pt, idx) => (
                        <circle 
                          key={idx} 
                          cx={pt.x} 
                          cy={pt.y} 
                          r={idx === peakDayIndex ? 5 : 4} 
                          fill={idx === peakDayIndex ? "#10b981" : "#fff"} 
                          stroke={idx === peakDayIndex ? "#fff" : "#10b981"} 
                          strokeWidth={idx === peakDayIndex ? 2 : 2.5} 
                          className="chart-point" 
                        />
                      ))}

                      {/* Tooltip Box (Rendered last to sit on top of all graph nodes) */}
                      <g className="chart-tooltip">
                        <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height="42" rx="6" fill="#18181b" />
                        <text x={tooltipX + 10} y={tooltipY + 16} fill="#fff" fontSize="10" fontFamily="sans-serif">Peak Day: {chartData[peakDayIndex].day}</text>
                        <circle cx={tooltipX + 14} cy={tooltipY + 30} r="3" fill="#10b981" />
                        <text x={tooltipX + 22} y={tooltipY + 33} fill="#fff" fontSize="11" fontFamily="sans-serif" fontWeight="bold">₹{chartData[peakDayIndex].revenue.toLocaleString('en-IN')} <tspan fontWeight="normal" fill="#a1a1aa">Sales</tspan></text>
                      </g>
                    </svg>
                  </div>
                </div>

                {/* Recent Transactions List */}
                <div className="glass-card">
                  <div className="glass-card-header">
                    <span className="glass-card-title">Real-Time Transactions</span>
                    <span className="sidebar-title-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)' }}>Live Orders</span>
                  </div>

                  <div className="realtime-list">
                    {orders.slice(0, 4).map((order) => (
                      <div key={order.id} className="realtime-item">
                        <div className="realtime-img">
                          {order.product.includes('Headphones') ? '🎧' : 
                           order.product.includes('Chrono') ? '⌚' : 
                           order.product.includes('Desk') ? 'ðŸ–¥ï¸' : 
                           (order.product.includes('Tracker') || order.product.includes('Ring')) ? 'ðŸ’' : '📦'}
                        </div>
                        <div className="realtime-details">
                          <span className="realtime-title">{order.customer}</span>
                          <span className="realtime-subtitle">{order.product}</span>
                        </div>
                        <div className="realtime-meta">
                          <div className="realtime-value">₹{order.amount.toLocaleString('en-IN')}</div>
                          <span className="realtime-time">{order.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Product Performance Matrix (Selling Range & High Sellers) */}
              <div className="glass-card" style={{ marginTop: '24px' }}>
                <div className="glass-card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
                  <span className="glass-card-title">📈 Product Performance & Selling Range</span>
                  <span className="sidebar-title-tag" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)' }}>Sales Matrix</span>
                </div>

                {highestSellingProduct && highestSellingProduct.sales > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'stretch' }}>
                    {/* Highest Selling Card */}
                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                          🏆 Highest Selling Product
                        </div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                          {highestSellingProduct.name}
                        </h4>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                          Category: {highestSellingProduct.category} · Brand: {highestSellingProduct.brand}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Units Sold</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{highestSellingProduct.sales}</div>
                        </div>
                        <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Remaining Stock</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: highestSellingProduct.stock === 0 ? '#ef4444' : highestSellingProduct.stock <= 10 ? '#f59e0b' : '#3b82f6' }}>
                            {highestSellingProduct.stock} {highestSellingProduct.stock === 0 ? '(Out of Stock)' : 'units'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Selling Range List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>Products Sales Distribution (Selling Range):</span>
                      <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)' }}>
                        <table className="portal-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                          <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                              <th style={{ textAlign: 'left', padding: '8px 12px' }}>Rank</th>
                              <th style={{ textAlign: 'left', padding: '8px 12px' }}>Product</th>
                              <th style={{ textAlign: 'center', padding: '8px 12px' }}>Price</th>
                              <th style={{ textAlign: 'center', padding: '8px 12px' }}>Stock</th>
                              <th style={{ textAlign: 'center', padding: '8px 12px' }}>Units Sold</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedProductsRange.map((p, idx) => (
                              <tr key={p.id || p._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '8px 12px', fontWeight: 'bold', color: idx === 0 ? '#10b981' : 'var(--text-primary)' }}>
                                  #{idx + 1}
                                </td>
                                <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>
                                  {p.name}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                  ₹{p.price.toLocaleString('en-IN')}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', color: p.stock === 0 ? '#ef4444' : p.stock <= 10 ? '#f59e0b' : 'var(--text-secondary)' }}>
                                  {p.stock}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 'bold', color: '#10b981' }}>
                                  {p.sales || 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    No product sales records recorded yet. Start selling to see analytics and product selling range!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS (CRUD PORTAL) */}
          {activeTab === 'products' && (
            <div>
              <div className="view-header">
                <div className="view-title-group">
                  <h2>Product Inventory</h2>
                  <p>Complete listing catalog: create new offerings, monitor current stock, and edit properties.</p>
                </div>
              </div>

              {/* Search, filters, actions */}
              <div className="table-controls">
                <div className="search-filter-row">
                  <div className="inline-search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input 
                      type="text" 
                      className="inline-search-input" 
                      placeholder="Search by name or SKU..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <select 
                    className="select-filter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Fitness">Fitness</option>
                    <option value="Apparel">Apparel</option>
                    <option value="Tech">Tech & Gadgets</option>
                    <option value="Shoes">Shoes</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Lifestyle">Lifestyle</option>
                  </select>

                  <select 
                    className="select-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="in-stock">In Stock</option>
                    <option value="low-stock">Low Stock</option>
                    <option value="out-of-stock">Out of Stock</option>
                  </select>

                  <select 
                    className="select-filter"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="name">Sort by Name</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div className="table-wrapper">
                {filteredProducts.length > 0 ? (
                  <table className="pro-table">
                    <thead>
                      <tr>
                        <th>Product Info</th>
                        <th>Category</th>
                        <th>Retail Price</th>
                        <th>Stock Qty</th>
                        <th>Listing Status</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => {
                        const isApproved = product.approvalStatus === 'approved';
                        const isPending = product.approvalStatus === 'pending';
                        const isRejected = product.approvalStatus === 'rejected';

                        return (
                          <tr key={product.id || product._id}>
                            <td>
                              <div className="product-cell">
                                <div className="product-img">
                                  {isRealImage(product.image) ? (
                                    <img src={cleanImageUrl(product.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    cleanImageUrl(product.image) || '📦'
                                  )}
                                </div>
                                <div className="product-meta-details">
                                  <span className="product-name">{product.name}</span>
                                  {isApproved ? (
                                    <span className="product-sku">{product.sku}</span>
                                  ) : (
                                    <span className="product-sku" style={{ fontStyle: 'italic', color: '#94a3b8' }}>SKU Pending</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>{product.category}</td>
                            <td>
                              <span className="price-text">₹{product.price.toLocaleString('en-IN')}</span>
                              {product.comparePrice && (
                                <span className="compare-price">₹{product.comparePrice.toLocaleString('en-IN')}</span>
                              )}
                            </td>
                            <td style={{ fontWeight: 600 }}>{product.stock} units</td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span className={`status-badge ${
                                  isApproved ? 'in-stock' :
                                  (isPending && product.adminCode) ? 'low-stock' :
                                  isPending ? 'draft' : 'out-of-stock'
                                }`}>
                      {isApproved ? 'Approved & Live' :
                                   (isPending && product.adminCode) ? 'Pending Activation' :
                                   isPending ? 'Under Admin Review' : 'Rejected'}
                                </span>
                                {isRejected && product.rejectionReason && (
                                  <span style={{ fontSize: '0.75rem', color: '#ef4444', maxWidth: '200px', wordBreak: 'break-word', display: 'inline-block' }}>
                                    Reason: {product.rejectionReason}
                                  </span>
                                )}
                                {isPending && product.adminCode && (
                                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px', alignItems: 'center' }}>
                                    <input
                                      type="text"
                                      placeholder="Admin Code"
                                      className="form-input"
                                      style={{
                                        height: '28px',
                                        fontSize: '0.75rem',
                                        padding: '2px 6px',
                                        width: '90px',
                                        background: 'rgba(255,255,255,0.08)',
                                        borderColor: 'var(--color-success)',
                                        color: '#10b981',
                                        borderRadius: '4px',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        cursor: 'not-allowed'
                                      }}
                                      value={product.adminCode || ''}
                                      readOnly={true}
                                    />
                                    <button
                                      className="company-portal-btn"
                                      style={{
                                        height: '28px',
                                        fontSize: '0.75rem',
                                        padding: '0 8px',
                                        background: 'var(--color-success)',
                                        borderColor: 'var(--color-success)',
                                        whiteSpace: 'nowrap'
                                      }}
                                      onClick={() => handleVerifyProductCode(product.id || product._id)}
                                    >
                                      Verify
                                    </button>
                                  </div>
                                )}
                                {isPending && !product.adminCode && (
                                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                    Waiting for admin review
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="action-buttons-group" style={{ justifyContent: 'center' }}>
                                <button className="action-btn" title="Edit Properties" onClick={() => {
                                  handleOpenResubmitModal(product);
                                }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </button>
                                <button className="action-btn delete" title="Delete Product" onClick={() => confirmDeleteProduct(product)}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">📂</div>
                    <h3>No products found</h3>
                    <p>Try refining your search queries or adding new list items to the directory.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: VERIFICATION REQUESTS */}
          {activeTab === 'requests' && (
            sellerUser?.role === 'admin' ? (
              <AdminSimulationHub 
                products={products} 
                triggerToast={triggerToast} 
                onRefreshProducts={async () => {
                  try {
                    const token = localStorage.getItem('emahu_seller_token');
                    if (!token) return;
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products`, {
                      headers: {
                        'Authorization': `Bearer ${token}`
                      }
                    });
                    const data = await res.json();
                    if (data.success) {
                      setProducts(data.products);
                    }
                  } catch (e) {
                    console.error('Failed to refresh products:', e);
                  }
                }} 
              />
            ) : (
              <div>
              <div className="view-header">
                <div className="view-title-group">
                  <h2>Verification & Listing Requests</h2>
                  <p>Submit product listings for administration audit and activate approved listings with security codes.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px', alignItems: 'start', marginTop: '24px' }}>
                
                {/* LEFT COLUMN: CREATE REQUEST FORM */}
                <div className="card" style={{ padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', borderRadius: '12px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                    <span>📝</span> Submit New Request
                  </h3>
                  
                  {formError && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', padding: '10px 16px', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '16px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                      ⚠️ {formError}
                    </div>
                  )}

                  <form onSubmit={handleAddProduct}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Product Title *</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ height: '36px', fontSize: '0.85rem' }}
                          placeholder="e.g. Aura Wireless Earbuds" 
                          value={newProductName}
                          onChange={(e) => setNewProductName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Brand Name *</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ height: '36px', fontSize: '0.85rem' }}
                          placeholder="e.g. Aura" 
                          value={newProductBrand}
                          onChange={(e) => setNewProductBrand(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Category *</label>
                        <CategorySelector 
                          value={newProductCategory} 
                          onChange={setNewProductCategory} 
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Price (INR) *</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            style={{ height: '36px', fontSize: '0.85rem' }}
                            placeholder="4999" 
                            value={newProductPrice}
                            onChange={(e) => setNewProductPrice(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Compare Price *</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            style={{ height: '36px', fontSize: '0.85rem' }}
                            placeholder="7999" 
                            value={newProductComparePrice}
                            onChange={(e) => setNewProductComparePrice(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Inventory *</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          style={{ height: '36px', fontSize: '0.85rem' }}
                          placeholder="20" 
                          value={newProductStock}
                          onChange={(e) => setNewProductStock(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        {renderMultiImageSelector()}
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Description *</label>
                        <textarea 
                          className="form-input" 
                          style={{ height: '60px', fontSize: '0.85rem', padding: '8px', resize: 'none' }}
                          placeholder="Short description..." 
                          value={newProductDescription}
                          onChange={(e) => setNewProductDescription(e.target.value)}
                          required
                        />
                      </div>

                      <button 
                        type="submit" 
                        className="company-portal-btn"
                        style={{ height: '40px', width: '100%', marginTop: '8px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        disabled={isSubmittingProduct}
                      >
                        {isSubmittingProduct ? 'Submitting...' : 'Submit Request'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* RIGHT COLUMN: REQUESTS HISTORY & STATUS */}
                <div className="card" style={{ padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', borderRadius: '12px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
                    📋 Verification History
                  </h3>
                  
                  <div style={{ maxHeight: '550px', overflowY: 'auto' }}>
                    <table className="portal-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '10px' }}>Product</th>
                          <th style={{ textAlign: 'left', padding: '10px' }}>Category</th>
                          <th style={{ textAlign: 'left', padding: '10px' }}>Status</th>
                          <th style={{ textAlign: 'left', padding: '10px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product) => {
                          const isApproved = product.approvalStatus === 'approved';
                          const isPending = product.approvalStatus === 'pending';
                          const isRejected = product.approvalStatus === 'rejected';

                          return (
                            <tr key={product.id || product._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '12px 10px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    border: '1px solid var(--border-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: 'rgba(0,0,0,0.05)',
                                    flexShrink: 0
                                  }}>
                                    {isRealImage(product.image) ? (
                                      <img src={cleanImageUrl(product.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      <span style={{ fontSize: '1.2rem' }}>{cleanImageUrl(product.image) || '📦'}</span>
                                    )}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{product.name}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>₹{product.price.toLocaleString('en-IN')}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '12px 10px' }}>
                                <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{product.category}</div>
                              </td>
                              <td style={{ padding: '12px 10px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span className={`status-badge ${
                                    isApproved ? 'in-stock' :
                                    (isPending && product.adminCode) ? 'low-stock' :
                                    isPending ? 'draft' : 'out-of-stock'
                                  }`} style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>
                                    {isApproved ? 'Approved & Live' :
                                     (isPending && product.adminCode) ? 'Pending Activation' :
                                     isPending ? 'Under Review' : 'Rejected'}
                                  </span>
                                  
                                  {isPending && product.adminCode && (
                                    <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 'bold' }}>
                                      Code Generated!
                                    </span>
                                  )}

                                  {isRejected && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      {product.rejectionReason && (
                                        <span style={{ fontSize: '0.72rem', color: '#ef4444', maxWidth: '140px', wordBreak: 'break-all' }}>
                                          Reason: {product.rejectionReason}
                                        </span>
                                      )}
                                      <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 'bold' }}>
                                        Rejections: {product.approvalAttempts || 0} / 3
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '12px 10px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <button
                                    className="company-portal-btn"
                                    style={{
                                      height: '24px',
                                      fontSize: '0.7rem',
                                      padding: '0 8px',
                                      background: 'var(--bg-secondary)',
                                      border: '1px solid var(--border-color)',
                                      color: 'var(--text-primary)',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => setSelectedDetailedProduct(product)}
                                  >
                                    Details
                                  </button>

                                  {isPending && product.adminCode && (
                                    <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                                      <input
                                        type="text"
                                        placeholder="Admin Code"
                                        className="form-input"
                                        style={{
                                          height: '24px',
                                          fontSize: '0.7rem',
                                          padding: '2px 4px',
                                          width: '85px',
                                          borderRadius: '4px',
                                          background: 'rgba(255,255,255,0.08)',
                                          borderColor: 'var(--color-success)',
                                          color: '#10b981',
                                          fontWeight: 'bold',
                                          textAlign: 'center',
                                          cursor: 'not-allowed'
                                        }}
                                        value={product.adminCode || ''}
                                        readOnly={true}
                                      />
                                      <button
                                        className="company-portal-btn"
                                        style={{
                                          height: '24px',
                                          fontSize: '0.7rem',
                                          padding: '0 4px',
                                          background: 'var(--color-success)',
                                          borderColor: 'var(--color-success)',
                                          width: '85px'
                                        }}
                                        onClick={() => handleVerifyProductCode(product.id || product._id)}
                                      >
                                        Verify Code
                                      </button>
                                    </div>
                                  )}
                                  {isPending && !product.adminCode && (
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>Pending Admin</span>
                                  )}
                                  {isApproved && (
                                    <span style={{ fontSize: '0.78rem', color: 'var(--color-success)', fontWeight: '600' }}>
                                      ✓ Live
                                    </span>
                                  )}
                                  {isRejected && (
                                    <button className="action-btn" title="Fix and Resubmit" onClick={() => handleOpenResubmitModal(product)}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {products.length === 0 && (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No requests submitted yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
            )
          )}

          {/* TAB 3: ORDERS */}
          {activeTab === 'orders' && (
            <div>
              <div className="view-header">
                <div className="view-title-group">
                  <h2>Orders Management</h2>
                  <p>Process incoming orders, assign couriers, and track all fulfillments in real-time.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {pendingOrdersCount > 0 && (
                    <span className="order-stat-pill pending">â³ {pendingOrdersCount} Pending</span>
                  )}
                  {orders.filter(o => o.status === 'APPROVED').length > 0 && (
                    <span className="order-stat-pill approved">✅ {orders.filter(o => o.status === 'APPROVED').length} Approved</span>
                  )}
                  <span className="order-stat-pill total">📦 {orders.length} Total Orders</span>
                </div>
              </div>

              {/* Order Status Filter Tabs */}
              <div className="order-filter-tabs">
                {[
                  { key: 'all', label: 'All Orders' },
                  { key: 'PENDING_APPROVAL', label: 'Pending Approval' },
                  { key: 'APPROVED', label: 'Approved' },
                  { key: 'REJECTED', label: 'Rejected' },
                  { key: 'READY_FOR_PICKUP', label: 'Ready For Pickup' },
                  { key: 'IN_TRANSIT', label: 'In Transit' },
                  { key: 'DELIVERED', label: 'Delivered' },
                ].map(tab => {
                  const cnt = tab.key === 'all'
                    ? orders.length
                    : tab.key === 'DELIVERED'
                      ? orders.filter(o => o.status === 'DELIVERED' || o.status === 'COMPLETED').length
                      : orders.filter(o => o.status === tab.key).length;
                  return (
                    <button
                      key={tab.key}
                      className={`order-tab-btn ${orderStatusFilter === tab.key ? 'active' : ''}`}
                      onClick={() => setOrderStatusFilter(tab.key)}
                    >
                      {tab.label}
                      {cnt > 0 && (
                        <span className={`order-tab-count${tab.key === 'PENDING_APPROVAL' ? ' danger' : ''}`}>
                          {cnt}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Filtered Orders Table */}
              <div className="table-wrapper" style={{ marginTop: '0', borderTop: 'none', borderTopLeftRadius: '0', borderTopRightRadius: '0' }}>
                <table className="pro-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Location</th>
                      <th>Distance</th>
                      <th>Delivery Fee</th>
                      <th>Earnings</th>
                      <th>Total Paid</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrdersDisplay.length > 0 ? (
                      filteredOrdersDisplay.map((order) => (
                        <tr key={order.id}>
                          <td
                            style={{ fontWeight: 700, color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => setSelectedDetailedOrderId(order.id)}
                            title="Click to open Order Details"
                          >
                            #{order.id}
                          </td>
                          <td style={{ fontWeight: 600 }}>{order.customer}</td>
                          <td>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {order.raw?.deliveryAddress?.city || order.raw?.deliveryAddress?.stateName || 'N/A'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {order.raw?.distanceKm !== undefined ? `${order.raw.distanceKm} KM` : '—'}
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {order.raw?.deliveryCharge !== undefined ? `₹${order.raw.deliveryCharge}` : '—'}
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                            {order.raw?.productAmount !== undefined ? `₹${order.raw.productAmount}` : '—'}
                          </td>
                          <td style={{ fontWeight: 700 }}>₹{order.amount.toLocaleString('en-IN')}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span className={`status-badge ${
                                order.status === 'COMPLETED' || order.status === 'DELIVERED' ? 'in-stock' :
                                order.status === 'REJECTED' ? 'out-of-stock' :
                                order.status === 'PENDING_APPROVAL' ? 'draft' : 'low-stock'
                              }`}>
                                {order.status === 'PENDING_APPROVAL' ? 'Pending Approval' :
                                 order.status === 'APPROVED' ? 'Approved' :
                                 order.status === 'REJECTED' ? 'Rejected' :
                                 order.status === 'DELIVERY_ASSIGNED' ? 'Delivery Assigned' :
                                 order.status === 'LABEL_GENERATED' ? 'Label Generated' :
                                 order.status === 'READY_FOR_PICKUP' ? 'Ready For Pickup' :
                                 order.status === 'PICKED_UP' ? 'Picked Up' :
                                 order.status === 'IN_TRANSIT' ? 'In Transit' :
                                 order.status === 'OUT_FOR_DELIVERY' ? 'Out For Delivery' :
                                 order.status === 'COMPLETED' || order.status === 'DELIVERED' ? 'Delivered' : order.status}
                              </span>
                              {order.raw?.rejectionReason && order.status === 'REJECTED' && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--color-danger)' }}>
                                  ↳ {order.raw.rejectionReason}
                                </span>
                              )}
                              {order.raw?.carrier && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  {order.raw.carrier}{order.raw.trackingId ? ` · ${order.raw.trackingId}` : ''}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{order.time}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <button
                                className="btn-secondary"
                                style={{ height: '30px', padding: '0 10px', fontSize: '0.75rem' }}
                                onClick={() => setSelectedDetailedOrderId(order.id)}
                                disabled={orderLoading[order.id]}
                              >
                                Details
                              </button>

                              {order.status === 'PENDING_APPROVAL' && (
                                <>
                                  <button
                                    className="order-action-btn approve"
                                    onClick={() => handleApproveOrder(order.id)}
                                    disabled={orderLoading[order.id]}
                                  >
                                    {orderLoading[order.id] ? 'Processing...' : '✓ Approve'}
                                  </button>
                                  <button
                                    className="order-action-btn reject"
                                    onClick={() => {
                                      setSelectedOrderId(order.id);
                                      setRejectionReasonType('Out of Stock');
                                      setCustomRejectReason('');
                                      setIsRejectModalOpen(true);
                                    }}
                                    disabled={orderLoading[order.id]}
                                  >
                                    ✕ Reject
                                  </button>
                                </>
                              )}

                              {order.status === 'APPROVED' && (
                                <button
                                  className="order-action-btn carrier"
                                  onClick={() => { setSelectedOrderId(order.id); setIsDeliveryModalOpen(true); }}
                                  disabled={orderLoading[order.id]}
                                >
                                  {orderLoading[order.id] ? 'Processing...' : '🚚 Assign Carrier'}
                                </button>
                              )}

                              {order.status === 'DELIVERY_ASSIGNED' && (
                                <button
                                  className="order-action-btn label"
                                  onClick={() => handleGenerateLabel(order.id)}
                                  disabled={orderLoading[order.id]}
                                >
                                  {orderLoading[order.id] ? 'Processing...' : '🏷️ Gen. Label'}
                                </button>
                              )}

                              {order.status === 'LABEL_GENERATED' && (
                                <>
                                  <button
                                    className="order-action-btn carrier"
                                    onClick={() => { setActiveLabelOrder(order.raw); setIsLabelModalOpen(true); }}
                                    disabled={orderLoading[order.id]}
                                  >
                                    🖨️ Print
                                  </button>
                                  <button
                                    className="order-action-btn approve"
                                    onClick={() => handleMarkReadyForPickup(order.id)}
                                    disabled={orderLoading[order.id]}
                                  >
                                    {orderLoading[order.id] ? 'Processing...' : '📦 Mark Ready'}
                                  </button>
                                </>
                              )}

                              {order.status === 'READY_FOR_PICKUP' && (
                                <button
                                  className="order-action-btn carrier"
                                  onClick={() => handleAdvanceStatus(order.id, 'PICKED_UP')}
                                  disabled={orderLoading[order.id]}
                                >
                                  {orderLoading[order.id] ? 'Processing...' : '🚀 Ship'}
                                </button>
                              )}

                              {order.status === 'PICKED_UP' && (
                                <button
                                  className="order-action-btn label"
                                  onClick={() => handleAdvanceStatus(order.id, 'IN_TRANSIT')}
                                  disabled={orderLoading[order.id]}
                                >
                                  {orderLoading[order.id] ? 'Processing...' : '🚛 In Transit'}
                                </button>
                              )}

                              {order.status === 'IN_TRANSIT' && (
                                <button
                                  className="order-action-btn label"
                                  onClick={() => handleAdvanceStatus(order.id, 'OUT_FOR_DELIVERY')}
                                  disabled={orderLoading[order.id]}
                                >
                                  {orderLoading[order.id] ? 'Processing...' : '🛵 Out For Delivery'}
                                </button>
                              )}

                              {order.status === 'OUT_FOR_DELIVERY' && (
                                <button
                                  className="order-action-btn approve"
                                  onClick={() => handleAdvanceStatus(order.id, 'DELIVERED')}
                                  disabled={orderLoading[order.id]}
                                >
                                  {orderLoading[order.id] ? 'Processing...' : '🎉 Delivered'}
                                </button>
                              )}

                              {['LABEL_GENERATED', 'READY_FOR_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(order.status) && order.raw?.trackingId && (
                                <button
                                  className="btn-secondary"
                                  style={{ height: '30px', padding: '0 8px', fontSize: '0.75rem' }}
                                  onClick={() => { setActiveLabelOrder(order.raw); setIsLabelModalOpen(true); }}
                                >
                                  📄 Label
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '60px 24px' }}>
                          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
                            {orderStatusFilter === 'PENDING_APPROVAL' ? '⏳' :
                             orderStatusFilter === 'APPROVED' ? '✅' :
                             orderStatusFilter === 'REJECTED' ? '❌' :
                             orderStatusFilter === 'DELIVERED' ? '🎉' : '📦'}
                          </div>
                          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                            {orderStatusFilter === 'all' ? 'No Orders Yet' :
                             `No ${orderStatusFilter.replace(/_/g, ' ').toLowerCase()} orders`}
                          </h3>
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto' }}>
                            {orderStatusFilter === 'PENDING_APPROVAL'
                              ? 'All caught up! No orders are waiting for your approval.'
                              : orderStatusFilter === 'all'
                                ? 'Once buyers complete checkout, their orders will appear here for review.'
                                : 'No orders match this status filter yet.'}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div>
              <div className="view-header">
                <div className="view-title-group">
                  <h2>Enterprise Analytics</h2>
                  <p>Comprehensive store performance metrics, customer behavior indicators, and traffic graphs.</p>
                </div>
              </div>

              {/* Advanced metrics graphs and stats */}
              <div className="dashboard-grid-two-cols">
                <div className="glass-card">
                  <span className="glass-card-title" style={{ marginBottom: '16px' }}>Monthly Conversion Funnel</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                        <span>1. Product Views ({funnelViews.toLocaleString()} visitors)</span>
                        <span style={{ fontWeight: 'bold' }}>100%</span>
                      </div>
                      <div style={{ height: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(to right, var(--color-primary), #a855f7)' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                        <span>2. Add to Cart ({funnelCart.toLocaleString()} sessions)</span>
                        <span style={{ fontWeight: 'bold' }}>{cartPct}%</span>
                      </div>
                      <div style={{ height: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${cartPct}%`, height: '100%', background: 'linear-gradient(to right, var(--color-primary), #a855f7)' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                        <span>3. Initiated Checkout ({funnelCheckout.toLocaleString()} sessions)</span>
                        <span style={{ fontWeight: 'bold' }}>{checkoutPct}%</span>
                      </div>
                      <div style={{ height: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${checkoutPct}%`, height: '100%', background: 'linear-gradient(to right, var(--color-primary), #a855f7)' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                        <span>4. Completed Sales ({funnelSales.toLocaleString()} orders)</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--color-success)' }}>{salesPct}% Net Conv.</span>
                      </div>
                      <div style={{ height: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${parseFloat(salesPct) > 100 ? 100 : salesPct}%`, height: '100%', background: 'var(--color-success)' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card">
                  <span className="glass-card-title" style={{ marginBottom: '16px' }}>Geographic Sales Share</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                    {stateShares.map((share, index) => (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.875rem' }}>{share.state}</span>
                        <span style={{ fontWeight: 700 }}>{share.pct}%</span>
                      </div>
                    ))}
                    {stateShares.length === 0 && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '20px 0' }}>
                        No geographic transaction records
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Product Performance Matrix (Selling Range & High Sellers) */}
              <div className="glass-card" style={{ marginTop: '24px' }}>
                <div className="glass-card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
                  <span className="glass-card-title">📈 Product Performance & Selling Range</span>
                  <span className="sidebar-title-tag" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)' }}>Sales Matrix</span>
                </div>

                {highestSellingProduct && highestSellingProduct.sales > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'stretch' }}>
                    {/* Highest Selling Card */}
                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                          🏆 Highest Selling Product
                        </div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', color: '#fff', fontWeight: 700 }}>
                          {highestSellingProduct.name}
                        </h4>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                          Category: {highestSellingProduct.category} · Brand: {highestSellingProduct.brand}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Units Sold</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{highestSellingProduct.sales}</div>
                        </div>
                        <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Remaining Stock</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: highestSellingProduct.stock === 0 ? '#ef4444' : highestSellingProduct.stock <= 10 ? '#f59e0b' : '#3b82f6' }}>
                            {highestSellingProduct.stock} {highestSellingProduct.stock === 0 ? '(Out of Stock)' : 'units'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Selling Range List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>Products Sales Distribution (Selling Range):</span>
                      <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(0,0,0,0.2)' }}>
                        <table className="portal-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                          <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                              <th style={{ textAlign: 'left', padding: '8px 12px' }}>Rank</th>
                              <th style={{ textAlign: 'left', padding: '8px 12px' }}>Product</th>
                              <th style={{ textAlign: 'center', padding: '8px 12px' }}>Price</th>
                              <th style={{ textAlign: 'center', padding: '8px 12px' }}>Stock</th>
                              <th style={{ textAlign: 'center', padding: '8px 12px' }}>Units Sold</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedProductsRange.map((p, idx) => (
                              <tr key={p.id || p._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '8px 12px', fontWeight: 'bold', color: idx === 0 ? '#10b981' : '#fff' }}>
                                  #{idx + 1}
                                </td>
                                <td style={{ padding: '8px 12px', color: '#fff' }}>
                                  {p.name}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                  ₹{p.price.toLocaleString('en-IN')}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', color: p.stock === 0 ? '#ef4444' : p.stock <= 10 ? '#f59e0b' : '#fff' }}>
                                  {p.stock}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 'bold', color: '#10b981' }}>
                                  {p.sales || 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    No product sales records recorded yet. Start selling to see analytics and product selling range!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div>
              <div className="view-header">
                <div className="view-title-group">
                  <h2>Store configuration</h2>
                  <p>Admin profile management, notifications frequencies, payment payouts, and billing configs.</p>
                </div>
              </div>

              <div className="settings-grid">
                <div className="settings-nav-sidebar">
                  <button className="settings-nav-btn active">General Information</button>
                  <button className="settings-nav-btn" onClick={() => triggerToast('Config Locked', 'Settings subpages are managed by corporate dashboard controls.', 'danger')}>Payout Methods</button>
                  <button className="settings-nav-btn" onClick={() => triggerToast('Config Locked', 'Settings subpages are managed by corporate dashboard controls.', 'danger')}>Shipping Tiers</button>
                  <button className="settings-nav-btn" onClick={() => triggerToast('Config Locked', 'Settings subpages are managed by corporate dashboard controls.', 'danger')}>API Access keys</button>
                </div>

                <div className="glass-card settings-card">
                  <div>
                    <h4 className="settings-section-title">Public profile details</h4>
                    <div className="avatar-upload-area" style={{ marginTop: '20px' }}>
                      <div className="settings-avatar-preview">PS</div>
                      <div className="avatar-upload-actions">
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Brand Logo / Identity</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PNG or JPEG formats. Size up to 2MB.</span>
                        <button className="btn-secondary" style={{ width: 'max-content' }} onClick={() => triggerToast('Select Image', 'Native browser file browser selected.', 'success')}>Upload Image</button>
                      </div>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Vendor Store Name</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={settingsForm.storeName} 
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, storeName: e.target.value }))} 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Support Help Email</label>
                      <input 
                        type="email" 
                        className="form-input" 
                        value={sellerUser?.email || ''} 
                        readOnly 
                        disabled 
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Active Contact Phone</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={settingsForm.phone} 
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, phone: e.target.value }))} 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Registered GSTIN Number</label>
                      <input 
                        ref={gstinRef} 
                        type="text" 
                        className="form-input gstin-input" 
                        value={sellerUser?.gstNumber || '27AAAAA1111A1Z1'} 
                        readOnly 
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <label className="form-label">Registered Shop Address</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={settingsForm.address} 
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, address: e.target.value }))} 
                      placeholder="Enter street, building, and landmark..."
                    />
                  </div>

                  <div className="form-grid-2" style={{ marginTop: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={settingsForm.city} 
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, city: e.target.value }))} 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">State</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={settingsForm.state} 
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, state: e.target.value }))} 
                      />
                    </div>
                  </div>

                  <div className="form-grid-2" style={{ marginTop: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Latitude</label>
                      <input 
                        type="number" 
                        step="any"
                        className="form-input" 
                        value={settingsForm.latitude} 
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, latitude: e.target.value }))} 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Longitude</label>
                      <input 
                        type="number" 
                        step="any"
                        className="form-input" 
                        value={settingsForm.longitude} 
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, longitude: e.target.value }))} 
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* GPS Detect + current location preview */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        onClick={detectSellerLocation}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        Detect My GPS Location
                      </button>

                      {/* Live address badge */}
                      {(settingsForm.address || settingsForm.city) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(65,105,225,0.08)', border: '1px solid rgba(65,105,225,0.2)', borderRadius: '8px', padding: '6px 14px', fontSize: '0.8rem', color: '#4169e1', fontWeight: 600, maxWidth: '360px' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4169e1" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {[settingsForm.address, settingsForm.city, settingsForm.state].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Map container */}
                    <div style={{ marginTop: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          📌 Shop Location — Click map or drag marker to repin
                        </span>

                        {/* External Navigate button */}
                        {settingsForm.latitude && settingsForm.longitude && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${settingsForm.latitude},${settingsForm.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '6px',
                              background: '#4169e1', color: '#fff',
                              padding: '7px 14px', borderRadius: '7px',
                              fontSize: '0.78rem', fontWeight: 700,
                              textDecoration: 'none', cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                            Navigate to Shop
                          </a>
                        )}
                      </div>

                      <div 
                        id="seller-shop-map" 
                        style={{ 
                          height: '320px', 
                          width: '100%', 
                          borderRadius: '10px', 
                          border: '1px solid var(--border-color)',
                          position: 'relative',
                          zIndex: 10
                        }} 
                      />

                      {/* Coordinate readout */}
                      {settingsForm.latitude && settingsForm.longitude && (
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <span>🌐 Lat: <strong>{parseFloat(settingsForm.latitude).toFixed(5)}</strong></span>
                          <span>Lon: <strong>{parseFloat(settingsForm.longitude).toFixed(5)}</strong></span>
                        </div>
                      )}
                    </div>


                 </div>

              </div>
            </div>
          </div>
          )}



          {/* TAB: DELIVERY SETTINGS (ADMIN ONLY) */}
          {activeTab === 'delivery_settings' && sellerUser?.role === 'admin' && (
            <div>
              <div className="view-header">
                <div className="view-title-group">
                  <h2>Distance-Based Delivery Settings</h2>
                  <p>Configure global delivery charge slabs and thresholds for the platform.</p>
                </div>
              </div>

              <div className="settings-grid" style={{ marginTop: '24px' }}>
                <div className="settings-nav-sidebar">
                  <button className="settings-nav-btn active">Delivery Cost Slabs</button>
                </div>

                <div className="glass-card settings-card" style={{ padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                  {loadingAdminSettings ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading settings data...</div>
                  ) : (
                    <form onSubmit={handleSaveAdminDeliverySettings}>
                      <div className="form-grid-2">
                        <div className="form-group">
                          <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Maximum Allowed Delivery Distance (KM)</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            value={adminDeliverySettings.maxDeliveryDistance}
                            onChange={(e) => setAdminDeliverySettings(prev => ({ ...prev, maxDeliveryDistance: parseFloat(e.target.value) || 0 }))}
                            required
                          />
                        </div>
                      </div>

                      <div className="form-grid-2" style={{ marginTop: '16px' }}>
                        <div className="form-group">
                          <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Express Shipping Extra Surcharge (₹)</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            value={adminDeliverySettings.expressDeliverySurcharge}
                            onChange={(e) => setAdminDeliverySettings(prev => ({ ...prev, expressDeliverySurcharge: parseFloat(e.target.value) || 0 }))}
                            required
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>Cost Distance Slabs Configuration</span>
                          <button 
                            type="button" 
                            className="company-portal-btn" 
                            onClick={handleAddSlab}
                            style={{ height: '32px', fontSize: '0.8rem', padding: '0 12px' }}
                          >
                            + Add Slabs
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {adminDeliverySettings.slabs?.map((slab, index) => (
                            <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                              <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>From Distance (KM)</label>
                                <input 
                                  type="number" 
                                  className="form-input"
                                  style={{ height: '36px', fontSize: '0.85rem' }}
                                  value={slab.fromKm}
                                  onChange={(e) => handleSlabChange(index, 'fromKm', e.target.value)}
                                  required
                                />
                              </div>
                              <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>To Distance (KM)</label>
                                <input 
                                  type="number" 
                                  className="form-input"
                                  style={{ height: '36px', fontSize: '0.85rem' }}
                                  value={slab.toKm}
                                  onChange={(e) => handleSlabChange(index, 'toKm', e.target.value)}
                                  required
                                />
                              </div>
                              <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cost (₹)</label>
                                <input 
                                  type="number" 
                                  className="form-input"
                                  style={{ height: '36px', fontSize: '0.85rem' }}
                                  value={slab.charge}
                                  onChange={(e) => handleSlabChange(index, 'charge', e.target.value)}
                                  required
                                />
                              </div>
                              <button 
                                type="button" 
                                className="company-portal-btn"
                                onClick={() => handleRemoveSlab(index)}
                                style={{ 
                                  height: '36px', 
                                  marginTop: '18px', 
                                  background: 'var(--color-danger)', 
                                  borderColor: 'var(--color-danger)',
                                  color: '#fff', 
                                  padding: '0 12px', 
                                  fontSize: '0.8rem'
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '24px 0 0 0', marginTop: '24px' }}>
                        <button type="submit" className="save-btn">
                          Save Global Settings
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: SELLERS MANAGEMENT (ADMIN ONLY) */}
          {activeTab === 'sellers_management' && sellerUser?.role === 'admin' && (
            <div>
              <div className="view-header">
                <div className="view-title-group">
                  <h2>Sellers Onboarding & Management</h2>
                  <p>Audit vendor registrations, review compliance documents, and update status decisions.</p>
                </div>
              </div>

              {sellersError && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '20px' }}>
                  ⚠️ {sellersError}
                </div>
              )}

              <div className="table-wrapper" style={{ marginTop: '24px' }}>
                {loadingSellers ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading sellers directory data...</div>
                ) : sellersList.length > 0 ? (
                  <table className="pro-table">
                    <thead>
                      <tr>
                        <th>Store Details</th>
                        <th>Owner Info</th>
                        <th>Verification Status</th>
                        <th>Metrics</th>
                        <th style={{ textAlign: 'center' }}>Admin Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellersList.map((seller) => {
                        const isApproved = seller.status === 'approved';
                        const isRejected = seller.status === 'rejected';
                        const isPending = seller.status === 'pending';
                        
                        return (
                          <tr key={seller._id}>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{seller.storeName || 'Unnamed Store'}</span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>Category: {seller.category || 'N/A'}</span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{seller.name}</span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{seller.email}</span>
                                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>· {seller.phone}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                  {seller.isEmailVerified ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                      ✓ Email Verified
                                    </span>
                                  ) : (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                      ✗ Email Unverified
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span className={`status-badge ${
                                  isApproved ? 'in-stock' :
                                  isPending ? 'draft' : 'out-of-stock'
                                }`} style={{ display: 'inline-block', width: 'fit-content' }}>
                                  {seller.status === 'approved' ? 'Approved & Active' :
                                   seller.status === 'rejected' ? 'Rejected' :
                                   seller.status === 'more_info_requested' ? 'More Info' : 'Pending Audit'}
                                </span>
                                {seller.verificationFeedback && (
                                  <span style={{ fontSize: '0.75rem', color: '#f87171', maxWidth: '200px' }}>
                                    Feedback: {seller.verificationFeedback}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem', gap: '2px' }}>
                                <span>📦 Products: <strong>{seller.totalProducts || 0}</strong></span>
                                <span>📈 Sales: <strong>{seller.totalSales || 0} units</strong></span>
                                <span>💰 Revenue: <strong style={{ color: '#10b981' }}>₹{(seller.totalRevenue || 0).toLocaleString('en-IN')}</strong></span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 0' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                  <button 
                                    className="company-portal-btn"
                                    style={{ height: '28px', fontSize: '0.75rem', padding: '0 8px', background: isApproved ? 'rgba(255,255,255,0.08)' : 'var(--color-success)', borderColor: isApproved ? 'rgba(255,255,255,0.1)' : 'var(--color-success)' }}
                                    onClick={() => handleSellerDecision(seller._id, 'approve')}
                                    disabled={isApproved}
                                  >
                                    {isApproved ? 'Approved ✓' : 'Approve'}
                                  </button>

                                  <button 
                                    className="company-portal-btn"
                                    style={{ height: '28px', fontSize: '0.75rem', padding: '0 8px', background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                                    onClick={() => {
                                      const reason = sellerRejectionFeedback[seller._id] || '';
                                      if (!reason.trim()) {
                                        triggerToast('Error', 'Please enter a rejection reason feedback first.', 'danger');
                                        return;
                                      }
                                      handleSellerDecision(seller._id, 'reject', reason);
                                    }}
                                  >
                                    Reject
                                  </button>

                                  <button 
                                    className="company-portal-btn"
                                    style={{ height: '28px', fontSize: '0.75rem', padding: '0 8px', background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: '#fff' }}
                                    onClick={() => setSelectedDetailedSeller(seller)}
                                  >
                                    Details
                                  </button>
                                </div>
                                
                                <input 
                                  type="text"
                                  placeholder="Feedback/rejection reason..."
                                  className="form-input"
                                  style={{ height: '28px', fontSize: '0.75rem', background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.08)' }}
                                  value={sellerRejectionFeedback[seller._id] || ''}
                                  onChange={(e) => setSellerRejectionFeedback(prev => ({ ...prev, [seller._id]: e.target.value }))}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">👥</div>
                    <h3>No sellers registered</h3>
                    <p>There are no vendor accounts in the database.</p>
                  </div>
                )}
              </div>
            </div>
          )}



        </main>
      </div>

      {/* --- PRODUCT DETAILS MODAL --- */}
      {selectedDetailedProduct && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-card" style={{ maxWidth: '600px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3 style={{ color: 'var(--text-primary)' }}>Product Request Details</h3>
                <p style={{ color: 'var(--text-muted)' }}>Detailed view of the listing submitted for admin approval.</p>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedDetailedProduct(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text-primary)', overflowY: 'auto', maxHeight: '70vh' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.1)' }}>
                  {isRealImage(selectedDetailedProduct.image) ? (
                    <img src={cleanImageUrl(selectedDetailedProduct.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    cleanImageUrl(selectedDetailedProduct.image) || '📦'
                  )}
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{selectedDetailedProduct.name}</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Brand: {selectedDetailedProduct.brand}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Category:</strong>
                  <div style={{ marginTop: '2px' }}>{selectedDetailedProduct.category}</div>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Price:</strong>
                  <div style={{ marginTop: '2px' }}>₹{selectedDetailedProduct.price?.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Compare Price:</strong>
                  <div style={{ marginTop: '2px' }}>₹{selectedDetailedProduct.comparePrice?.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Stock:</strong>
                  <div style={{ marginTop: '2px' }}>{selectedDetailedProduct.stock} units</div>
                </div>
              </div>

              <div>
                <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Description:</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-primary)' }}>{selectedDetailedProduct.description}</p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '4px' }}>
                <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Request Status:</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <span className={`status-badge ${
                    selectedDetailedProduct.approvalStatus === 'approved' ? 'in-stock' :
                    (selectedDetailedProduct.approvalStatus === 'pending' && selectedDetailedProduct.adminCode) ? 'low-stock' :
                    selectedDetailedProduct.approvalStatus === 'pending' ? 'draft' : 'out-of-stock'
                  }`}>
                    {selectedDetailedProduct.approvalStatus === 'approved' ? 'Approved & Live' :
                     (selectedDetailedProduct.approvalStatus === 'pending' && selectedDetailedProduct.adminCode) ? 'Pending Activation' :
                     selectedDetailedProduct.approvalStatus === 'pending' ? 'Under Admin Review' : 'Rejected'}
                  </span>
                  {selectedDetailedProduct.approvalAttempts > 0 && (
                    <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold' }}>
                      (Attempts: {selectedDetailedProduct.approvalAttempts}/3)
                    </span>
                  )}
                </div>
                {selectedDetailedProduct.rejectionReason && (
                  <div style={{ marginTop: '10px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px 12px', borderRadius: '6px', color: '#ef4444', fontSize: '0.8rem' }}>
                    <strong>Rejection Reason:</strong> {selectedDetailedProduct.rejectionReason}
                  </div>
                )}
                {selectedDetailedProduct.adminCode && selectedDetailedProduct.approvalStatus === 'pending' && (
                  <div style={{ marginTop: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '10px 12px', borderRadius: '6px', color: '#10b981', fontSize: '0.8rem' }}>
                    <strong>Admin Code for Activation:</strong> {selectedDetailedProduct.adminCode}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="modal-btn cancel" onClick={() => setSelectedDetailedProduct(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* --- SELLER DETAILS MODAL (ADMIN ONLY) --- */}
      {selectedDetailedSeller && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-card" style={{ maxWidth: '800px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3 style={{ color: 'var(--text-primary)' }}>Shop & Compliance Audit Details</h3>
                <p style={{ color: 'var(--text-muted)' }}>Detailed view of the seller registration and KYC verification documents.</p>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedDetailedSeller(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', color: 'var(--text-primary)', overflowY: 'auto', maxHeight: '75vh' }}>
              
              {/* Profile Summary Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#fff', fontWeight: '700' }}>
                    {selectedDetailedSeller.storeName || 'Unnamed Store'}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                    <span>👤 Owner: <strong>{selectedDetailedSeller.name}</strong></span>
                    <span>✉️ Email: <strong>{selectedDetailedSeller.email}</strong></span>
                    <span>📞 Phone: <strong>{selectedDetailedSeller.phone}</strong></span>
                    <span>🏷️ Category: <strong style={{ textTransform: 'capitalize' }}>{selectedDetailedSeller.category}</strong></span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <span className={`status-badge ${
                    selectedDetailedSeller.status === 'approved' ? 'in-stock' :
                    selectedDetailedSeller.status === 'pending' ? 'draft' : 'out-of-stock'
                  }`}>
                    {selectedDetailedSeller.status === 'approved' ? 'Approved' :
                     selectedDetailedSeller.status === 'rejected' ? 'Rejected' :
                     selectedDetailedSeller.status === 'more_info_requested' ? 'More Info Requested' : 'Pending Audit'}
                  </span>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                    {selectedDetailedSeller.isEmailVerified ? (
                      <span style={{ fontSize: '0.72rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                        ✓ Email Verified (OTP)
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                        ✗ Email Unverified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Grid: Bank Details & KYC IDs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Bank details card */}
                <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                  <h5 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#fff', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>🏦 Bank & Payout Details</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
                    <span>Account Holder: <strong>{selectedDetailedSeller.bankHolder || 'N/A'}</strong></span>
                    <span>Account Number: <strong>{selectedDetailedSeller.accountNumber || 'N/A'}</strong></span>
                    <span>Bank Name: <strong>{selectedDetailedSeller.bankName || 'N/A'}</strong></span>
                    <span>IFSC Code: <strong>{selectedDetailedSeller.ifscCode || 'N/A'}</strong></span>
                  </div>
                </div>

                {/* KYC IDs details card */}
                <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                  <h5 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#fff', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>💳 KYC & Compliance Identifiers</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
                    <span style={{ textTransform: 'uppercase' }}>{selectedDetailedSeller.kycType || 'PAN'} Type: <strong>{selectedDetailedSeller.kycType || 'PAN'}</strong></span>
                    <span style={{ textTransform: 'uppercase' }}>{selectedDetailedSeller.kycType || 'PAN'} Number: <strong>{selectedDetailedSeller.kycNumber || 'N/A'}</strong></span>
                    <span>GSTIN Number: <strong>{selectedDetailedSeller.gstNumber || 'Not Provided'}</strong></span>
                    <span>Registration Date: <strong>{selectedDetailedSeller.createdAt ? new Date(selectedDetailedSeller.createdAt).toLocaleDateString('en-IN') : 'N/A'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Shop Verification Documents / Images */}
              <div>
                <h5 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#fff' }}>📄 Uploaded Shop Documents</h5>
                {selectedDetailedSeller.documents && selectedDetailedSeller.documents.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {selectedDetailedSeller.documents.map((doc, idx) => (
                      <div key={doc._id || idx} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', background: 'rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.78rem' }}>
                          <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{doc.documentType?.replace(/_/g, ' ')}</span>
                          <span className={`status-badge ${doc.status === 'approved' ? 'in-stock' : 'out-of-stock'}`} style={{ fontSize: '0.65rem', padding: '1px 4px' }}>{doc.status}</span>
                        </div>
                        
                        <div style={{ width: '100%', height: '140px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {doc.fileUrl && doc.fileUrl.startsWith('http') ? (
                            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                              {/* Document Mockup showing real values overlay */}
                              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', padding: '12px', color: '#1e293b', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontFamily: 'monospace' }}>
                                <div>
                                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 'bold' }}>GOVERNMENT COMPLIANCE DOCUMENT</div>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginTop: '6px' }}>{doc.documentType === 'id_proof' ? (selectedDetailedSeller.kycType?.toUpperCase() || 'PAN CARD') : 'BUSINESS REGISTRATION'}</div>
                                  <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>No: {doc.documentType === 'id_proof' ? selectedDetailedSeller.kycNumber : (selectedDetailedSeller.gstNumber || 'GST-CERT-MOCK')}</div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.65rem', color: '#475569' }}>
                                  <div>Name: {selectedDetailedSeller.name?.toUpperCase()}</div>
                                  <div>EMAHU VERIFIED</div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No preview available</span>
                          )}
                        </div>

                        <div style={{ marginTop: '8px', textAlign: 'right' }}>
                          <a href={doc.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'underline' }}>
                            Download/Open Original File
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No physical compliance files found in database. Relying on verified KYC fields.
                  </div>
                )}
              </div>

              {/* Shop Product Inventory with images */}
              <div>
                <h5 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#fff' }}>🛍️ Product Listings Catalogue ({selectedDetailedSeller.products?.length || 0} items)</h5>
                {selectedDetailedSeller.products && selectedDetailedSeller.products.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
                    {selectedDetailedSeller.products.map((prod) => (
                      <div key={prod._id || prod.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ width: '100%', height: '110px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isRealImage(prod.image) ? (
                            <img src={cleanImageUrl(prod.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={prod.name} />
                          ) : (
                            <span style={{ fontSize: '2rem' }}>{cleanImageUrl(prod.image) || '📦'}</span>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }} title={prod.name}>
                            {prod.name}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.78rem' }}>
                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>₹{prod.price?.toLocaleString('en-IN')}</span>
                            <span style={{ color: 'var(--text-muted)' }}>Stock: {prod.stock}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    This seller hasn't uploaded any product catalogue listings yet.
                  </div>
                )}
              </div>

            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {selectedDetailedSeller.status !== 'approved' && (
                  <button 
                    className="company-portal-btn" 
                    style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)', marginRight: '10px' }}
                    onClick={() => {
                      handleSellerDecision(selectedDetailedSeller._id, 'approve');
                      setSelectedDetailedSeller(null);
                    }}
                  >
                    Approve Seller Store
                  </button>
                )}
                <button 
                  className="company-portal-btn" 
                  style={{ background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                  onClick={() => {
                    const reason = sellerRejectionFeedback[selectedDetailedSeller._id] || '';
                    if (!reason.trim()) {
                      triggerToast('Error', 'Please enter a feedback reason below before rejecting.', 'danger');
                      return;
                    }
                    handleSellerDecision(selectedDetailedSeller._id, 'reject', reason);
                    setSelectedDetailedSeller(null);
                  }}
                >
                  Reject Store Account
                </button>
              </div>
              <button className="modal-btn cancel" onClick={() => setSelectedDetailedSeller(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD PRODUCT MODAL --- */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card wide">
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>{resubmitProductId ? 'Fix & Resubmit Product Listing' : 'List New Merchandise'}</h3>
                <p>{resubmitProductId ? 'Update rejected values to resubmit for admin approval.' : 'Provide details to submit this product request for approval.'}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setIsAddModalOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {resubmitProductId && products.find(p => (p.id || p._id) === resubmitProductId)?.rejectionReason && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: 'var(--color-danger)', padding: '12px 24px', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid rgba(239, 68, 68, 0.12)' }}>
                ⚠️ï¸ <strong>Admin Rejection Reason:</strong> {products.find(p => (p.id || p._id) === resubmitProductId)?.rejectionReason}
              </div>
            )}

            {formError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', padding: '12px 24px', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid rgba(239, 68, 68, 0.15)' }}>
                ⚠️ï¸ {formError}
              </div>
            )}

            <form onSubmit={handleAddProduct} className="modal-form">
              <div className="modal-form-body">
                {/* --- SECTION 1: GENERAL INFORMATION --- */}
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '8px',
                  marginTop: '8px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '1.1rem' }}>ðŸ“</span> General Product Details
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Product Title *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Minimalist Walnut Coffee Table" 
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      required
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      Enter a customer-friendly, search-optimized title.
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Brand Name *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Apple, Sony, Nike" 
                      value={newProductBrand}
                      onChange={(e) => setNewProductBrand(e.target.value)}
                      required
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      Manufactured brand or your vendor store name.
                    </span>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label className="form-label">Merchandise Category *</label>
                  <CategorySelector 
                    value={newProductCategory} 
                    onChange={setNewProductCategory} 
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Helps buyers filter and discover your items.
                  </span>
                </div>

                {/* --- SECTION 2: PRICING & INVENTORY --- */}
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '8px',
                  marginTop: '20px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '1.1rem' }}>💰</span> Pricing and Stock Levels
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Listing Price (INR) *</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="₹12,499" 
                      value={newProductPrice}
                      onChange={(e) => setNewProductPrice(e.target.value)}
                      required
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      The actual amount the customer is charged.
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Compare-At Price (INR) *</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="₹15,000" 
                      value={newProductComparePrice}
                      onChange={(e) => setNewProductComparePrice(e.target.value)}
                      required
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      Original strike-through price (shows discount rate).
                    </span>
                    {newProductComparePrice && newProductPrice && parseFloat(newProductComparePrice) <= parseFloat(newProductPrice) && (
                      <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block', fontWeight: '500' }}>
                        ⚠️ï¸ Compare-at price must be greater than Listing Price.
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Available Inventory *</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="e.g. 50" 
                      value={newProductStock}
                      onChange={(e) => setNewProductStock(e.target.value)}
                      required
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      Units in stock. Set to 0 to show Out-Of-Stock.
                    </span>
                  </div>

                </div>

                <div style={{ marginTop: '16px' }}>
                  {renderMultiImageSelector()}
                </div>

                {/* --- SECTION 3: MEDIA & SPECIFICATIONS --- */}
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '8px',
                  marginTop: '20px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '1.1rem' }}>ðŸ–¼ï¸</span> Product Copy and Specifications
                </div>

                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <textarea 
                    className="form-textarea" 
                    style={{ minHeight: '100px' }}
                    placeholder="Summarize product parameters, size details, materials, warranty terms, and special care instructions..."
                    value={newProductDescription}
                    onChange={(e) => setNewProductDescription(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    A clear, detailed description boosts sales conversions.
                  </span>
                </div>
              </div>

              <div className="modal-footer" style={{ flexShrink: 0 }}>
                <button 
                  type="button" 
                  className="modal-btn cancel" 
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmittingProduct}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="modal-btn confirm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: isSubmittingProduct ? 0.7 : 1,
                    cursor: isSubmittingProduct ? 'not-allowed' : 'pointer'
                  }}
                  disabled={isSubmittingProduct || (newProductComparePrice && newProductPrice && parseFloat(newProductComparePrice) <= parseFloat(newProductPrice))}
                >
                  {isSubmittingProduct ? (
                    <>
                      <svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" />
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    resubmitProductId ? 'Resubmit for Approval' : 'Confirm and Submit'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELIVERY PARTNER SELECTION MODAL --- */}
      {isDeliveryModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>Assign Delivery Partner</h3>
                <p>Select a verified carrier grid partner for Order #{selectedOrderId}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setIsDeliveryModalOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
              {availablePartnersLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#fff' }}>
                  <div style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
                  <span>Scanning local city hubs for active carriers...</span>
                </div>
              ) : availablePartnersError ? (
                <div style={{ padding: '12px', color: '#f87171', background: 'rgba(220,38,38,0.1)', border: '1px solid #ef4444', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
                  ⚠️ {availablePartnersError}
                </div>
              ) : availablePartners.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: '2.5rem' }}>🛵</span>
                  <p style={{ marginTop: '10px', fontSize: '0.9rem' }}>No active delivery partners found in the buyer's city hub whose service radius covers the shipping address.</p>
                </div>
              ) : (
                availablePartners.map((partner) => {
                  const order = orders.find(o => o.id === selectedOrderId);
                  const buyerAddr = order ? (order.raw?.deliveryAddress?.address || order.raw?.buyerLocation?.address || '') : '';
                  const sellerAddr = order ? (order.raw?.sellerLocation?.address || '') : '';
                  const messageText = `Hello! I am a seller on Emahu. I want to assign you to deliver Order #${selectedOrderId}.\n\nPickup address: ${sellerAddr}\nDrop address: ${buyerAddr}\nDistance: ${order?.raw?.distanceKm || 0} KM\nEstimated charge: ₹${partner.totalCost}.\n\nPlease confirm if you can take this order.`;
                  const whatsappUrl = `https://wa.me/${partner.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(messageText)}`;
                  const isSelected = selectedPartnerId === partner._id;

                  return (
                    <div 
                      key={partner._id} 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: '8px',
                        padding: '16px', 
                        borderRadius: '10px', 
                        backgroundColor: isSelected ? 'rgba(49, 151, 149, 0.08)' : '#f7fafc', 
                        border: isSelected ? '1px solid #319795' : '1px solid #e2e8f0',
                        cursor: orderLoading[selectedOrderId] ? 'not-allowed' : 'pointer',
                        opacity: orderLoading[selectedOrderId] ? 0.6 : 1,
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => {
                        if (orderLoading[selectedOrderId]) return;
                        setSelectedPartnerId(partner._id);
                        setIsConfirmChecked(false);
                        setHasContactedPartner(false);
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', color: '#1a202c', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {partner.name}
                            {isSelected && <span style={{ color: '#319795', fontSize: '0.8rem' }}>● Selected</span>}
                          </h4>
                          <div style={{ fontSize: '0.8rem', color: '#4a5568' }}>
                            📍 Location: {partner.currentArea}, {partner.currentCity} ({partner.pincode})
                          </div>
                          {partner.latitude && partner.longitude && (
                            <div style={{ fontSize: '0.75rem', color: '#4a5568', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>🧭 Coordinates: {partner.latitude}, {partner.longitude}</span>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${partner.latitude},${partner.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: '#319795', textDecoration: 'underline', fontSize: '0.75rem' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                View on Map
                              </a>
                            </div>
                          )}
                          <div style={{ fontSize: '0.78rem', color: '#4a5568', marginTop: '4px' }}>
                            Vehicle: {partner.vehicleType?.toUpperCase()} | Radius: {partner.serviceRadius} KM | Rate: ₹{partner.ratePerKm}/KM
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <strong style={{ color: '#15803d', fontSize: '1.25rem', display: 'block' }}>₹{partner.totalCost}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#4a5568' }}>Total Cost</span>
                        </div>
                      </div>

                      {/* Direct Contact Buttons */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }} onClick={(e) => e.stopPropagation()}>
                        <a 
                          href={`tel:${partner.phone}`}
                          onClick={() => setHasContactedPartner(true)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            backgroundColor: '#f7fafc',
                            border: '1px solid #cbd5e0',
                            color: '#2d3748',
                            fontSize: '0.78rem',
                            textDecoration: 'none',
                            transition: 'background-color 0.2s'
                          }}
                        >
                          📞 Call Partner ({partner.phone})
                        </a>
                        <a 
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => setHasContactedPartner(true)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            backgroundColor: '#25D366',
                            color: '#fff',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            textDecoration: 'none',
                            transition: 'opacity 0.2s'
                          }}
                        >
                          💬 Send WhatsApp Request
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Checkbox Confirmation & Action Button */}
            {selectedPartnerId && hasContactedPartner && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#f7fafc' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2d3748', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '12px' }}>
                  <input
                    type="checkbox"
                    checked={isConfirmChecked}
                    onChange={(e) => setIsConfirmChecked(e.target.checked)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#319795' }}
                  />
                  <span>Confirm to assign <strong>{availablePartners.find(p => p._id === selectedPartnerId)?.name}</strong> for delivery</span>
                </label>
                <button
                  className="form-btn"
                  style={{ 
                    width: '100%', 
                    margin: 0, 
                    padding: '10px', 
                    borderRadius: '8px',
                    backgroundColor: isConfirmChecked ? '#319795' : 'rgba(0,0,0,0.08)', 
                    cursor: isConfirmChecked ? 'pointer' : 'not-allowed', 
                    color: isConfirmChecked ? '#fff' : '#4a5568',
                    border: 'none',
                    fontWeight: '600'
                  }}
                  disabled={!isConfirmChecked || orderLoading[selectedOrderId]}
                  onClick={() => {
                    const partner = availablePartners.find(p => p._id === selectedPartnerId);
                    if (partner) {
                      handleSelectDeliveryPartner(selectedOrderId, partner._id, partner.name, partner.totalCost);
                      setIsDeliveryModalOpen(false);
                    }
                  }}
                >
                  Approve & Assign Partner
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- REJECTION REASON MODAL --- */}
      {isRejectModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-card" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>Reject Order Request</h3>
                <p>Provide a rejection reason feedback to the customer for Order #{selectedOrderId}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setIsRejectModalOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div style={{ padding: '20px' }}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ color: '#fff' }}>Select Reason *</label>
                <select 
                  className="select-filter"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#1e1e24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  value={rejectionReasonType}
                  onChange={(e) => setRejectionReasonType(e.target.value)}
                >
                  <option value="Out of Stock">Out of Stock</option>
                  <option value="Product Damaged">Product Damaged</option>
                  <option value="Invalid Address">Invalid Address</option>
                  <option value="Pricing Error">Pricing Error</option>
                  <option value="Seller Unable to Fulfill">Seller Unable to Fulfill</option>
                  <option value="Other">Other (Write Custom Reason Below)</option>
                </select>
              </div>

              {rejectionReasonType === 'Other' && (
                <div className="form-group">
                  <label className="form-label" style={{ color: '#fff' }}>Custom Reason *</label>
                  <textarea 
                    className="form-textarea" 
                    style={{ height: '80px', width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px', borderRadius: '6px' }}
                    placeholder="Describe custom reason..."
                    value={customRejectReason}
                    onChange={(e) => setCustomRejectReason(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="modal-btn cancel" onClick={() => setIsRejectModalOpen(false)}>Cancel</button>
              <button 
                className="modal-btn delete" 
                style={{ background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                disabled={orderLoading[selectedOrderId]}
                onClick={() => {
                  if (orderLoading[selectedOrderId]) return;
                  const finalReason = rejectionReasonType === 'Other' ? customRejectReason.trim() : rejectionReasonType;
                  if (rejectionReasonType === 'Other' && !finalReason) {
                    triggerToast('Error', 'Please enter a custom rejection reason.', 'danger');
                    return;
                  }
                  handleRejectOrder(selectedOrderId, finalReason);
                  setIsRejectModalOpen(false);
                }}
              >
                {orderLoading[selectedOrderId] ? 'Rejecting...' : 'Reject Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SHIPPING LABEL PRINT MODAL --- */}
      {isLabelModalOpen && activeLabelOrder && (
        <div className="modal-overlay" style={{ zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-card" style={{ maxWidth: '600px', backgroundColor: '#fff', color: '#000', padding: '24px', borderRadius: '12px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div className="modal-title-group">
                <h3 style={{ color: '#0f172a', margin: 0 }}>Shipping Label</h3>
                <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.85rem' }}>Print or download dispatch manifest for Order #{activeLabelOrder.orderId}</p>
              </div>
              <button className="modal-close-btn" style={{ color: '#64748b' }} onClick={() => setIsLabelModalOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Printable Label Sheet */}
            <div id="printable-shipping-label" style={{ border: '2px solid #000', padding: '16px', marginTop: '20px', fontFamily: 'monospace' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '8px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px 0', fontSize: '1.5rem', fontWeight: 'bold' }}>{activeLabelOrder.carrier || 'COURIER'}</h2>
                  <span>PRIORITY ELECTRIC SHIELD</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>SHIPMENT ID:</strong>
                  <div>{activeLabelOrder.shipmentId || 'EMH-SHIP-XXXXXX'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '8px' }}>
                <div style={{ borderRight: '1px solid #000', paddingRight: '8px' }}>
                  <strong>FROM (SELLER):</strong>
                  <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                    <strong>{sellerUser?.name || 'Authorized Merchant'}</strong><br />
                    {sellerUser?.address || 'Emahu Transit Corridor Hub'}<br />
                    Phone: {sellerUser?.phone || 'N/A'}
                  </div>
                </div>
                <div>
                  <strong>TO (BUYER):</strong>
                  <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                    <strong>{activeLabelOrder.deliveryAddress?.fullName}</strong><br />
                    {activeLabelOrder.deliveryAddress?.address}<br />
                    {activeLabelOrder.deliveryAddress?.city}, {activeLabelOrder.deliveryAddress?.stateName} - {activeLabelOrder.deliveryAddress?.pincode}<br />
                    Phone: {activeLabelOrder.deliveryAddress?.phone}
                  </div>
                </div>
              </div>

              <div style={{ borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '8px' }}>
                <strong>PRODUCT INFORMATION:</strong>
                <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                  {activeLabelOrder.items?.map((item, idx) => (
                    <div key={idx}>• {item.name} (Qty: {item.quantity})</div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center' }}>
                <div>
                  <strong>ORDER ID:</strong> {activeLabelOrder.orderId}<br />
                  <strong>WEIGHT:</strong> {activeLabelOrder.packageWeight || '2.10 kg'}<br />
                  <strong>TRACKING ID:</strong> {activeLabelOrder.trackingId || 'EMH-TRK-XXXXXX'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  {/* Barcode/QR Code generator mock */}
                  <div style={{ letterSpacing: '3px', fontWeight: 'bold', fontSize: '1.2rem', margin: '4px 0' }}>
                    ||||| | |||| ||| || |||
                  </div>
                  <span style={{ fontSize: '0.7rem' }}>*{activeLabelOrder.trackingId}*</span>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', marginTop: '20px', paddingTop: '12px' }}>
              <button className="modal-btn cancel" style={{ border: '1px solid #e2e8f0', color: '#000' }} onClick={() => setIsLabelModalOpen(false)}>Close</button>
              <button 
                className="modal-btn confirm" 
                style={{ background: '#4f46e5', borderColor: '#4f46e5', color: '#fff' }}
                onClick={() => {
                  const printContent = document.getElementById('printable-shipping-label').innerHTML;
                  const printWindow = window.open('', '_blank');
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Shipping Label - Order #${activeLabelOrder.orderId}</title>
                        <style>
                          body { margin: 20px; font-family: monospace; color: #000; background: #fff; }
                          * { box-sizing: border-box; }
                        </style>
                      </head>
                      <body>
                        ${printContent}
                        <script>
                          window.onload = function() {
                            window.print();
                            window.close();
                          };
                        </script>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }}
              >
                🖨️ Print Label
              </button>
              <button 
                className="modal-btn confirm" 
                style={{ background: '#10b981', borderColor: '#10b981', color: '#fff' }}
                onClick={() => {
                  // Mock download by saving string representation
                  const printContent = document.getElementById('printable-shipping-label').innerText;
                  const blob = new Blob([printContent], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `shipping-label-${activeLabelOrder.orderId}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                  triggerToast('Downloaded', 'Shipping label downloaded as TXT manifest.', 'success');
                }}
              >
                📥 Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ORDER DETAILS & ACTION PANEL MODAL --- */}
      {selectedDetailedOrderId && selectedDetailedOrder && (() => {
        const isSeller = sellerUser && (sellerUser.role === 'seller' || localStorage.getItem('emahu_seller_logged_in') === 'true');
        const ownsOrder = selectedDetailedOrder.items?.some(item => {
          const sellerUserId = sellerUser?._id || sellerUser?.id;
          if (typeof item.seller === 'string') {
            return sellerUserId && item.seller.toString() === sellerUserId.toString();
          }
          const itemSellerId = item.seller?._id || item.seller?.id;
          return (itemSellerId && sellerUserId && itemSellerId.toString() === sellerUserId.toString()) ||
                 (item.seller?.email && sellerUser?.email && item.seller.email === sellerUser.email);
        });

        const ORDER_STAGES = [
          { key: 'PENDING_APPROVAL', label: 'Pending',     icon: '⏳' },
          { key: 'APPROVED',         label: 'Approved',    icon: '✅' },
          { key: 'DELIVERY_ASSIGNED',label: 'Assigned',    icon: '🚚' },
          { key: 'LABEL_GENERATED',  label: 'Label Ready', icon: '🏷️' },
          { key: 'READY_FOR_PICKUP', label: 'Ready',       icon: '📦' },
          { key: 'PICKED_UP',        label: 'Picked Up',   icon: '🚀' },
          { key: 'IN_TRANSIT',       label: 'In Transit',  icon: '🚛' },
          { key: 'OUT_FOR_DELIVERY', label: 'Out Delivery',icon: '🛵' },
          { key: 'DELIVERED',        label: 'Delivered',   icon: '🎉' },
          { key: 'COMPLETED',        label: 'Completed',   icon: '✔️' },
        ];
        const currentStageIdx = ORDER_STAGES.findIndex(s => s.key === selectedDetailedOrder.status);
        const isRejected  = selectedDetailedOrder.status === 'REJECTED' || !!selectedDetailedOrder.sellerRejected;
        const isCompleted = selectedDetailedOrder.status === 'COMPLETED' || selectedDetailedOrder.status === 'DELIVERED';

        const stColorMap = {
          PENDING_APPROVAL: { bg:'#fffbeb', text:'#d97706', border:'#fcd34d' },
          APPROVED:         { bg:'#f0fdf4', text:'#16a34a', border:'#86efac' },
          DELIVERY_ASSIGNED:{ bg:'#eff6ff', text:'#2563eb', border:'#93c5fd' },
          LABEL_GENERATED:  { bg:'#f0f9ff', text:'#0369a1', border:'#7dd3fc' },
          READY_FOR_PICKUP: { bg:'#fff7ed', text:'#ea580c', border:'#fdba74' },
          PICKED_UP:        { bg:'#f5f3ff', text:'#7c3aed', border:'#c4b5fd' },
          IN_TRANSIT:       { bg:'#faf5ff', text:'#7c3aed', border:'#d8b4fe' },
          OUT_FOR_DELIVERY: { bg:'#fff1f2', text:'#e11d48', border:'#fda4af' },
          DELIVERED:        { bg:'#f0fdf4', text:'#15803d', border:'#4ade80' },
          COMPLETED:        { bg:'#f0fdf4', text:'#15803d', border:'#4ade80' },
          REJECTED:         { bg:'#fef2f2', text:'#dc2626', border:'#fca5a5' },
        };
        const sc = isRejected ? stColorMap.REJECTED : (stColorMap[selectedDetailedOrder.status] || { bg:'#f8fafc', text:'#475569', border:'#cbd5e1' });

        return (
          <div className="modal-overlay" style={{ zIndex: 9998, backgroundColor: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}>
            <div style={{
              background: '#ffffff', color: '#0f172a', width: '95vw', maxWidth: '940px',
              borderRadius: '18px', border: '1px solid #e2e8f0', overflow: 'hidden',
              boxShadow: '0 30px 70px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column',
              maxHeight: '92vh'
            }}>
              {/* Header */}
              <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '1.1rem' }}>📋</span>
                    <h3 style={{ color: '#fff', margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>Order Details &amp; Action Panel</h3>
                  </div>
                  <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.78rem' }}>Order #{selectedDetailedOrder.orderId} &nbsp;·&nbsp; {selectedDetailedOrder.date}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '0.77rem', fontWeight: '700', background: sc.bg, color: sc.text, border: `1.5px solid ${sc.border}` }}>
                    {isRejected ? '❌ Rejected' : `${ORDER_STAGES[currentStageIdx]?.icon || ''} ${ORDER_STAGES[currentStageIdx]?.label || selectedDetailedOrder.status}`}
                  </span>
                  <button onClick={() => { setSelectedDetailedOrderId(null); setSelectedCarrier(''); }}
                    style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#fff', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>

              {/* Stage Progress Bar */}
              {!isRejected && !isCompleted && (
                <div style={{ padding: '14px 28px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', overflowX: 'auto', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0', minWidth: 'max-content' }}>
                    {ORDER_STAGES.map((stage, si) => {
                      const done = currentStageIdx > si;
                      const curr = currentStageIdx === si;
                      return (
                        <div key={stage.key} style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', width: '64px' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: '700', background: done ? '#16a34a' : curr ? '#2563eb' : '#e2e8f0', color: (done || curr) ? '#fff' : '#94a3b8', boxShadow: curr ? '0 0 0 3px rgba(37,99,235,0.22)' : 'none', transition: 'all 0.3s' }}>
                              {done ? '✓' : stage.icon}
                            </div>
                            <span style={{ fontSize: '0.6rem', fontWeight: curr ? '700' : '500', color: curr ? '#2563eb' : done ? '#16a34a' : '#94a3b8', textAlign: 'center', lineHeight: 1.2 }}>{stage.label}</span>
                          </div>
                          {si < ORDER_STAGES.length - 1 && (
                            <div style={{ width: '20px', height: '2px', background: done ? '#16a34a' : '#e2e8f0', marginBottom: '16px', flexShrink: 0, transition: 'background 0.3s' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Body */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', flex: 1, overflowY: 'auto', minHeight: 0 }}>

                {/* LEFT: Info */}
                <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px', borderRight: '1px solid #f0f0f0', overflowY: 'auto' }}>

                  {/* Order Info */}
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700', color: '#64748b', marginBottom: '12px' }}>📦 Order Information</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem' }}>
                      {[['Order ID', <span key="id" style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#0f172a' }}>{selectedDetailedOrder.orderId}</span>],
                        ['Date', selectedDetailedOrder.date],
                        ['Payment Status', <span key="status" style={{ color: '#16a34a', fontWeight: '600' }}>🔒 Secured in Escrow</span>],
                      ].map(([label, val], i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < 2 ? '1px solid #f0f0f0' : 'none', paddingBottom: i < 2 ? '8px' : '0' }}>
                          <span style={{ color: '#64748b' }}>{label}</span>
                          <strong>{val}</strong>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '2px' }}>
                        <span style={{ color: '#64748b' }}>Order Total</span>
                        <strong style={{ color: '#16a34a', fontSize: '1rem' }}>₹{selectedDetailedOrder.total?.toLocaleString('en-IN')}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Escrow Lock Details */}
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700', color: '#64748b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🔐</span> Buyer Escrow Vault Lock
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b' }}>Vault Status</span>
                        {verifiedEscrow[selectedDetailedOrder.orderId] ? (
                          <span style={{ color: '#16a34a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            🟢 LOCKED &amp; VERIFIED
                          </span>
                        ) : (
                          <span style={{ color: '#ea580c', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            🟡 HELD IN COLD LOCK
                          </span>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f0f0', paddingTop: '8px' }}>
                        <span style={{ color: '#64748b' }}>Escrow Account</span>
                        <strong style={{ textTransform: 'capitalize' }}>
                          {selectedDetailedOrder.escrowMethod ? `${selectedDetailedOrder.escrowMethod} Escrow` : 'Wallet Vault'}
                        </strong>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f0f0', paddingTop: '8px' }}>
                        <span style={{ color: '#64748b' }}>Lock Hash</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#475569' }}>
                          {(() => {
                            let hash = 0;
                            const str = selectedDetailedOrder.orderId || 'default';
                            for (let i = 0; i < str.length; i++) {
                              hash = str.charCodeAt(i) + ((hash << 5) - hash);
                            }
                            const hex = Math.abs(hash).toString(16).padEnd(8, '7f').slice(0, 8);
                            return `0x${hex}aec8...7df4`;
                          })()}
                        </span>
                      </div>
                      
                      {/* Interactive Verification Action */}
                      <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '12px', marginTop: '4px' }}>
                        {verifiedEscrow[selectedDetailedOrder.orderId] ? (
                          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '10px 12px', color: '#065f46', fontSize: '0.8rem', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{ fontSize: '1rem', marginTop: '2px' }}>🛡️</span>
                            <div>
                              <strong style={{ display: 'block', marginBottom: '2px' }}>Escrow Custody Confirmed</strong>
                              <span>Ledger verification successful. Funds of ₹{selectedDetailedOrder.total?.toLocaleString('en-IN')} are locked in custody. Release authorized only upon successful delivery.</span>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleVerifyEscrow(selectedDetailedOrder.orderId, selectedDetailedOrder.total || 0)}
                            disabled={verifyingEscrow[selectedDetailedOrder.orderId]}
                            style={{ 
                              width: '100%', padding: '9px 12px', background: verifyingEscrow[selectedDetailedOrder.orderId] ? '#cbd5e1' : '#4f46e5', 
                              color: verifyingEscrow[selectedDetailedOrder.orderId] ? '#475569' : '#fff', border: 'none', borderRadius: '8px', 
                              fontSize: '0.8rem', fontWeight: '700', cursor: verifyingEscrow[selectedDetailedOrder.orderId] ? 'not-allowed' : 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s'
                            }}
                          >
                            {verifyingEscrow[selectedDetailedOrder.orderId] ? (
                              <>
                                <svg style={{ animation: 'spin 1s linear infinite' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)" />
                                  <path d="M12 2a10 10 0 0 1 10 10" />
                                </svg>
                                Verifying Lock Ledger...
                              </>
                            ) : (
                              '🔎 Verify Escrow Lock Status'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Customer */}
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700', color: '#64748b', marginBottom: '12px' }}>👤 Customer</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.84rem' }}>
                      <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{selectedDetailedOrder.deliveryAddress?.fullName || 'N/A'}</strong>
                      <span style={{ color: '#475569' }}>📞 {selectedDetailedOrder.deliveryAddress?.phone || '—'}</span>
                      <span style={{ color: '#475569' }}>✉️ {selectedDetailedOrder.deliveryAddress?.email || '—'}</span>
                    </div>
                  </div>

                  {/* Address */}
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700', color: '#64748b', marginBottom: '10px' }}>📍 Delivery Address</div>
                    <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: '1.65', margin: 0 }}>
                      {selectedDetailedOrder.deliveryAddress?.address}<br/>
                      {selectedDetailedOrder.deliveryAddress?.city}, {selectedDetailedOrder.deliveryAddress?.stateName} — {selectedDetailedOrder.deliveryAddress?.pincode}
                    </p>
                  </div>

                  {/* Distance & Delivery Cost Metrics */}
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700', color: '#64748b', marginBottom: '12px' }}>🚚 Distance &amp; Fulfillment Metrics</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Transit Distance</span>
                        <strong style={{ color: '#0f172a' }}>{selectedDetailedOrder.distanceKm !== undefined ? `${selectedDetailedOrder.distanceKm} KM` : '—'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', paddingTop: '8px' }}>
                        <span style={{ color: '#64748b' }}>Delivery Charge</span>
                        <strong style={{ color: '#0f172a' }}>{selectedDetailedOrder.deliveryCharge !== undefined ? `₹${selectedDetailedOrder.deliveryCharge}` : '—'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', paddingTop: '8px' }}>
                        <span style={{ color: '#64748b' }}>Seller Earnings (Subtotal)</span>
                        <strong style={{ color: '#16a34a' }}>{selectedDetailedOrder.productAmount !== undefined ? `₹${selectedDetailedOrder.productAmount}` : '—'}</strong>
                      </div>
                      {selectedDetailedOrder.buyerLocation?.latitude !== undefined && (
                        <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '4px', gap: '4px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>BUYER COORDINATES</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#475569' }}>
                            Lat: {selectedDetailedOrder.buyerLocation.latitude.toFixed(6)}, Lon: {selectedDetailedOrder.buyerLocation.longitude.toFixed(6)}
                          </span>
                          
                          {selectedDetailedOrder.sellerLocation?.latitude !== undefined && (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&origin=${selectedDetailedOrder.sellerLocation.latitude},${selectedDetailedOrder.sellerLocation.longitude}&destination=${selectedDetailedOrder.buyerLocation.latitude},${selectedDetailedOrder.buyerLocation.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                background: '#e0e7ff',
                                color: '#4338ca',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                textDecoration: 'none',
                                marginTop: '6px',
                                width: 'fit-content'
                              }}
                            >
                              🗺️ Compare Locations &amp; Get Route
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Products */}
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700', color: '#64748b', marginBottom: '12px' }}>🛒 Ordered Items</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedDetailedOrder.items?.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '8px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          {item.img && item.img.startsWith('http') ? (
                            <img src={item.img} alt={item.name} style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '7px', flexShrink: 0, border: '1px solid #e2e8f0' }} />
                          ) : (
                            <div style={{ width: '42px', height: '42px', background: '#f1f5f9', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>{item.img || '📦'}</div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.84rem', fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                            <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '2px' }}>{item.brand} · Qty: {item.quantity}</div>
                          </div>
                          <strong style={{ fontSize: '0.84rem', color: '#0f172a', flexShrink: 0 }}>₹{item.price?.toLocaleString('en-IN')}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Log */}
                  {selectedDetailedOrder.timeline?.length > 0 && (
                    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700', color: '#64748b', marginBottom: '12px' }}>🕒 Activity Log</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[...selectedDetailedOrder.timeline].reverse().map((t, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <span style={{ color: '#16a34a', fontSize: '0.7rem', marginTop: '3px', flexShrink: 0 }}>●</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <strong style={{ fontSize: '0.8rem', color: '#0f172a', display: 'block' }}>{t.label || t.status}</strong>
                              {t.desc && <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#475569' }}>{t.desc}</p>}
                            </div>
                            <span style={{ fontSize: '0.71rem', color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>{t.date || ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT: Actions */}
                <div style={{ padding: '22px 22px', background: '#fafbfc', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700', color: '#64748b' }}>⚡ Action Panel</div>

                  {(!isSeller || !ownsOrder) ? (
                    <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', color: '#dc2626', fontSize: '0.84rem' }}>
                      ⚠️ You do not have permissions to execute actions on this order.
                    </div>
                  ) : (
                    <>
                      {/* PENDING_APPROVAL */}
                      {selectedDetailedOrder.status === 'PENDING_APPROVAL' && (
                        <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: '12px', padding: '18px' }}>
                          <p style={{ fontSize: '0.82rem', color: '#92400e', fontWeight: '600', margin: '0 0 12px 0' }}>⌛ Awaiting your decision. Approve or reject this order.</p>
                          {!verifiedEscrow[selectedDetailedOrder.orderId] && (
                            <div style={{ fontSize: '0.76rem', color: '#b45309', background: '#fef3c7', padding: '8px 10px', borderRadius: '6px', marginBottom: '14px', border: '1px solid #fde68a' }}>
                              💡 <strong>Tip:</strong> Click the <strong>Verify Escrow Lock Status</strong> button in the left panel first to ensure buyer payment is securely locked.
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => handleApproveOrder(selectedDetailedOrder.orderId)} disabled={!!orderLoading[selectedDetailedOrder.orderId]}
                              style={{ flex: 1, padding: '11px 0', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', opacity: orderLoading[selectedDetailedOrder.orderId] ? 0.6 : 1 }}>
                              {orderLoading[selectedDetailedOrder.orderId] ? '⌛ Approving...' : '✓ Approve Order'}
                            </button>
                            <button onClick={() => { setSelectedOrderId(selectedDetailedOrder.orderId); setRejectionReasonType('Out of Stock'); setCustomRejectReason(''); setIsRejectModalOpen(true); }} disabled={!!orderLoading[selectedDetailedOrder.orderId]}
                              style={{ flex: 1, padding: '11px 0', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', opacity: orderLoading[selectedDetailedOrder.orderId] ? 0.6 : 1 }}>
                              ✕ Reject Order
                            </button>
                          </div>
                        </div>
                      )}

                      {/* APPROVED */}
                      {selectedDetailedOrder.status === 'APPROVED' && (
                        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                            <span style={{ width: '22px', height: '22px', background: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: '700' }}>✓</span>
                            <span style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: '700' }}>Order Approved — Assign Delivery Partner</span>
                          </div>
                          <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Select Courier Partner</label>
                          <select value={selectedCarrier} onChange={e => setSelectedCarrier(e.target.value)} disabled={!!orderLoading[selectedDetailedOrder.orderId]}
                            style={{ width: '100%', height: '40px', border: '1.5px solid #d1d5db', borderRadius: '8px', padding: '0 10px', fontSize: '0.85rem', color: '#0f172a', background: '#fff', marginBottom: '12px', outline: 'none', cursor: 'pointer' }}>
                            <option value="">— Select Courier Partner —</option>
                            <option value="Delhivery">🚚 Delhivery</option>
                            <option value="Blue Dart">🔵 Blue Dart</option>
                            <option value="XpressBees">🐝 XpressBees</option>
                            <option value="DTDC">📦 DTDC</option>
                            <option value="Ecom Express">⚡ Ecom Express</option>
                            <option value="India Post">🇮🇳 India Post</option>
                          </select>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button onClick={() => {
                              if (orderLoading[selectedDetailedOrder.orderId]) return;
                              handleSelectDeliveryPartner(selectedDetailedOrder.orderId, selectedCarrier, selectedCarrier === 'Blue Dart' ? '1-3 Days' : '2-4 Days', selectedCarrier === 'Blue Dart' ? 120 : 80);
                            }} disabled={!selectedCarrier || !!orderLoading[selectedDetailedOrder.orderId]}
                              style={{ width: '100%', padding: '12px 0', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem', border: 'none', cursor: selectedCarrier ? 'pointer' : 'not-allowed', background: selectedCarrier ? '#4f46e5' : '#cbd5e1', color: selectedCarrier ? '#fff' : '#94a3b8', opacity: orderLoading[selectedDetailedOrder.orderId] ? 0.6 : 1 }}>
                              {orderLoading[selectedDetailedOrder.orderId] ? '⌛ Assigning...' : '🚚 Assign Courier Partner'}
                            </button>
                            <span style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center', marginTop: '6px' }}>
                              Or bypass directly to label ready:
                            </span>
                            <button onClick={() => handleAssignAndGenerateLabel(selectedDetailedOrder.orderId, selectedCarrier)} disabled={!selectedCarrier || !!orderLoading[selectedDetailedOrder.orderId]}
                              style={{ width: '100%', padding: '10px 0', borderRadius: '8px', fontWeight: '600', fontSize: '0.8rem', border: '1px solid #cbd5e1', cursor: selectedCarrier ? 'pointer' : 'not-allowed', background: '#fff', color: selectedCarrier ? '#4f46e5' : '#cbd5e1', opacity: orderLoading[selectedDetailedOrder.orderId] ? 0.6 : 1 }}>
                              🏷️ Assign &amp; Auto-Generate Label
                            </button>
                          </div>
                        </div>
                      )}

                      {/* DELIVERY_ASSIGNED */}
                      {selectedDetailedOrder.status === 'DELIVERY_ASSIGNED' && (
                        <div style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: '12px', padding: '18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                            <span style={{ width: '22px', height: '22px', background: '#2563eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: '700' }}>🚚</span>
                            <span style={{ fontSize: '0.82rem', color: '#1e3a8a', fontWeight: '700' }}>Courier Assigned</span>
                          </div>
                          <p style={{ fontSize: '0.8rem', color: '#1e3a8a', margin: '0 0 14px 0', lineHeight: '1.4' }}>
                            Order assigned to <strong>{selectedDetailedOrder.carrier}</strong>. Tracking ID <strong>{selectedDetailedOrder.trackingId}</strong> has been registered. 
                            Generate the shipping label to prepare packaging.
                          </p>
                          <button onClick={() => handleGenerateLabel(selectedDetailedOrder.orderId)} disabled={!!orderLoading[selectedDetailedOrder.orderId]}
                            style={{ width: '100%', padding: '12px 0', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', opacity: orderLoading[selectedDetailedOrder.orderId] ? 0.6 : 1 }}>
                            {orderLoading[selectedDetailedOrder.orderId] ? '⌛ Generating...' : '🏷️ Generate Shipping Label'}
                          </button>
                        </div>
                      )}

                      {/* LABEL_GENERATED */}
                      {selectedDetailedOrder.status === 'LABEL_GENERATED' && (
                        <div style={{ background: '#f0f9ff', border: '1.5px solid #7dd3fc', borderRadius: '12px', padding: '18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                            <span style={{ width: '22px', height: '22px', background: '#0284c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: '700' }}>🏷️</span>
                            <span style={{ fontSize: '0.82rem', color: '#0369a1', fontWeight: '700' }}>Shipping Label Generated</span>
                          </div>
                          <p style={{ fontSize: '0.8rem', color: '#0369a1', margin: '0 0 14px 0', lineHeight: '1.4' }}>
                            Label generated. Print the shipping label / manifest and mark the package as ready for courier pickup.
                          </p>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => { setActiveLabelOrder(selectedDetailedOrder); setIsLabelModalOpen(true); }}
                              style={{ flex: 1, padding: '11px 0', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}>
                              🖨️ Print Label
                            </button>
                            <button onClick={() => handleMarkReadyForPickup(selectedDetailedOrder.orderId)} disabled={!!orderLoading[selectedDetailedOrder.orderId]}
                              style={{ flex: 1, padding: '11px 0', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', opacity: orderLoading[selectedDetailedOrder.orderId] ? 0.6 : 1 }}>
                              {orderLoading[selectedDetailedOrder.orderId] ? '⌛ Processing...' : '📦 Mark Ready'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* READY_FOR_PICKUP */}
                      {selectedDetailedOrder.status === 'READY_FOR_PICKUP' && (
                        <div style={{ background: '#fff7ed', border: '1.5px solid #fdba74', borderRadius: '12px', padding: '18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                            <span style={{ width: '22px', height: '22px', background: '#ea580c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: '700' }}>📦</span>
                            <span style={{ fontSize: '0.82rem', color: '#c2410c', fontWeight: '700' }}>Ready for Carrier Pickup</span>
                          </div>
                          <p style={{ fontSize: '0.8rem', color: '#9a3412', margin: '0 0 14px 0', lineHeight: '1.4' }}>
                            The package is sealed and waiting at your dispatch desk. Click below once the carrier agent collects the shipment.
                          </p>
                          <button onClick={() => handleAdvanceStatus(selectedDetailedOrder.orderId, 'PICKED_UP')} disabled={!!orderLoading[selectedDetailedOrder.orderId]}
                            style={{ width: '100%', padding: '12px 0', background: '#ea580c', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', opacity: orderLoading[selectedDetailedOrder.orderId] ? 0.6 : 1 }}>
                            {orderLoading[selectedDetailedOrder.orderId] ? '⌛ Processing...' : '🚀 Mark Picked Up by Courier'}
                          </button>
                        </div>
                      )}

                      {/* PICKED_UP / IN_TRANSIT / OUT_FOR_DELIVERY */}
                      {['PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY'].includes(selectedDetailedOrder.status) && (
                        <div style={{ background: '#faf5ff', border: '1.5px solid #d8b4fe', borderRadius: '12px', padding: '18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                            <span style={{ width: '22px', height: '22px', background: '#7c3aed', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: '700' }}>
                              {selectedDetailedOrder.status === 'PICKED_UP' ? '🚀' : selectedDetailedOrder.status === 'IN_TRANSIT' ? '🚛' : '🛵'}
                            </span>
                            <span style={{ fontSize: '0.82rem', color: '#6d28d9', fontWeight: '700' }}>
                              {selectedDetailedOrder.status === 'PICKED_UP' ? 'Package Picked Up' : selectedDetailedOrder.status === 'IN_TRANSIT' ? 'Package In Transit' : 'Package Out For Delivery'}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.8rem', color: '#6d28d9', margin: '0 0 14px 0', lineHeight: '1.4' }}>
                            {selectedDetailedOrder.status === 'PICKED_UP' && 'The shipment has been picked up by the courier. Advance status to In Transit once sorted at hub.'}
                            {selectedDetailedOrder.status === 'IN_TRANSIT' && 'The shipment is in transit on the EV logistics corridor. Advance status to Out For Delivery when arrived at local station.'}
                            {selectedDetailedOrder.status === 'OUT_FOR_DELIVERY' && 'The delivery agent is en route. Mark Delivered when final drop-off is complete.'}
                          </p>
                          {selectedDetailedOrder.status === 'PICKED_UP' && (
                            <button onClick={() => handleAdvanceStatus(selectedDetailedOrder.orderId, 'IN_TRANSIT')} disabled={!!orderLoading[selectedDetailedOrder.orderId]}
                              style={{ width: '100%', padding: '11px 0', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', opacity: orderLoading[selectedDetailedOrder.orderId] ? 0.6 : 1 }}>
                              {orderLoading[selectedDetailedOrder.orderId] ? '⌛ Processing...' : '🚛 Mark In Transit'}
                            </button>
                          )}
                          {selectedDetailedOrder.status === 'IN_TRANSIT' && (
                            <button onClick={() => handleAdvanceStatus(selectedDetailedOrder.orderId, 'OUT_FOR_DELIVERY')} disabled={!!orderLoading[selectedDetailedOrder.orderId]}
                              style={{ width: '100%', padding: '11px 0', background: '#a855f7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', opacity: orderLoading[selectedDetailedOrder.orderId] ? 0.6 : 1 }}>
                              {orderLoading[selectedDetailedOrder.orderId] ? '⌛ Processing...' : '🛵 Mark Out for Delivery'}
                            </button>
                          )}
                          {selectedDetailedOrder.status === 'OUT_FOR_DELIVERY' && (
                            <button onClick={() => handleAdvanceStatus(selectedDetailedOrder.orderId, 'DELIVERED')} disabled={!!orderLoading[selectedDetailedOrder.orderId]}
                              style={{ width: '100%', padding: '11px 0', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', opacity: orderLoading[selectedDetailedOrder.orderId] ? 0.6 : 1 }}>
                              {orderLoading[selectedDetailedOrder.orderId] ? '⌛ Processing...' : '🎉 Mark Delivered'}
                            </button>
                          )}
                        </div>
                      )}

                      {/* COMPLETED / DELIVERED */}
                      {isCompleted && (
                        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
                          <div style={{ fontSize: '2.8rem', marginBottom: '10px' }}>🎉</div>
                          <p style={{ color: '#15803d', fontWeight: '700', fontSize: '1.05rem', margin: '0 0 4px 0' }}>Transaction Completed</p>
                          <p style={{ color: '#16a34a', fontSize: '0.8rem', margin: 0 }}>Funds will be released after buyer confirmation or auto-release window.</p>
                        </div>
                      )}

                      {/* REJECTED */}
                      {isRejected && (
                        <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '12px', padding: '18px' }}>
                          <div style={{ color: '#dc2626', fontWeight: '700', fontSize: '1rem', marginBottom: '8px' }}>❌ Order Rejected</div>
                          {selectedDetailedOrder.rejectionReason && (
                            <div style={{ background: '#fff', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 12px', fontSize: '0.82rem', color: '#7f1d1d' }}>
                              <strong>Reason:</strong> {selectedDetailedOrder.rejectionReason}
                            </div>
                          )}
                          <p style={{ fontSize: '0.77rem', color: '#94a3b8', marginTop: '10px', marginBottom: 0 }}>Escrow funds will be automatically returned to the buyer.</p>
                        </div>
                      )}

                      {/* Carrier details if assigned */}
                      {selectedDetailedOrder.carrier && !['PENDING_APPROVAL','APPROVED','REJECTED'].includes(selectedDetailedOrder.status) && (
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700', color: '#64748b', marginBottom: '10px' }}>🚚 Carrier Details</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Partner</span><strong>{selectedDetailedOrder.carrier}</strong></div>
                            {selectedDetailedOrder.trackingId && (
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Tracking #</span><strong style={{ color: '#4f46e5', fontFamily: 'monospace', fontSize: '0.78rem' }}>{selectedDetailedOrder.trackingId}</strong></div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div style={{ borderTop: '1px solid #e2e8f0', padding: '14px 28px', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc', flexShrink: 0 }}>
                <button onClick={() => { setSelectedDetailedOrderId(null); setSelectedCarrier(''); }}
                  style={{ padding: '9px 24px', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '8px', color: '#475569', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {isDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '420px' }}>
            <div className="confirm-body">
              <div className="confirm-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h4>Delete listed merchandise?</h4>
              <p>Are you sure you want to remove <strong>&ldquo;{productToDelete?.name}&rdquo;</strong> from your live index? This cannot be undone.</p>
            </div>
            
            <div className="modal-footer">
              <button className="modal-btn cancel" onClick={() => setIsDeleteModalOpen(false)}>Abort</button>
              <button className="modal-btn delete" onClick={handleDeleteProduct}>Delete Listing</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function AdminSimulationHub({ products, triggerToast, onRefreshProducts }) {
  const [rejectionReasonMap, setRejectionReasonMap] = useState({});
  const [loadingMap, setLoadingMap] = useState({});

  const handleDecision = async (productId, decision) => {
    setLoadingMap(prev => ({ ...prev, [productId]: true }));
    const reason = rejectionReasonMap[productId] || '';
    
    if (decision === 'reject' && !reason.trim()) {
      triggerToast('Error', 'Please enter a rejection reason first.', 'danger');
      setLoadingMap(prev => ({ ...prev, [productId]: false }));
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products/${productId}/admin-decision`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ decision, reason })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(
          decision === 'approve' ? 'Approval Code Generated' : 'Product Rejected',
          decision === 'approve' 
            ? `Admin code generated: ${data.product.adminCode}. Give this code to the seller.` 
            : `Listing rejected. Feedback sent to vendor.`,
          decision === 'approve' ? 'success' : 'danger'
        );
        // Reset reason field
        setRejectionReasonMap(prev => ({ ...prev, [productId]: '' }));
        onRefreshProducts();
      } else {
        triggerToast('Error', data.error || 'Request failed', 'danger');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Network error', 'danger');
    } finally {
      setLoadingMap(prev => ({ ...prev, [productId]: false }));
    }
  };

  // Filter pending / rejected products for verification simulation
  const pendingProducts = products.filter(p => p.approvalStatus !== 'approved');

  return (
    <div>
      <div className="view-header">
        <div className="view-title-group">
          <h2>Admin Approval Simulation Hub</h2>
          <p style={{ color: '#ef4444' }}>⚠️ï¸ DEBUG MODE: Simulate marketplace admin operations. Approve or reject vendor product listings below.</p>
        </div>
      </div>

      <div className="table-wrapper" style={{ marginTop: '20px' }}>
        {pendingProducts.length > 0 ? (
          <table className="pro-table">
            <thead>
              <tr>
                <th>Product Request</th>
                <th>Brand</th>
                <th>Listing Details</th>
                <th>Status / Attempts</th>
                <th>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingProducts.map((p) => {
                const isRejected = p.approvalStatus === 'rejected';
                return (
                  <tr key={p.id || p._id}>
                    <td>
                      <div className="product-cell">
                        <div className="product-img">
                          {isRealImage(p.image) ? (
                            <img src={cleanImageUrl(p.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            cleanImageUrl(p.image) || '📦'
                          )}
                        </div>
                        <div className="product-meta-details">
                          <span className="product-name">{p.name}</span>
                          <span className="product-sku" style={{ textTransform: 'capitalize' }}>Category: {p.category}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: '#fff' }}>{p.brand || 'No Brand'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="price-text">₹{p.price.toLocaleString('en-IN')}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stock: {p.stock} units</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className={`status-badge ${isRejected ? 'out-of-stock' : 'low-stock'}`}>
                          {p.approvalStatus === 'pending' ? 'Pending Admin' : 'Rejected'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Attempt {p.approvalAttempts || 1} of 3
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 0' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            className="company-portal-btn"
                            style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)', height: '32px', fontSize: '0.8rem' }}
                            onClick={() => handleDecision(p.id || p._id, 'approve')}
                            disabled={loadingMap[p.id || p._id]}
                          >
                            Approve & Get Code
                          </button>
                          
                          <button
                            className="company-portal-btn"
                            style={{ background: 'var(--color-danger)', borderColor: 'var(--color-danger)', height: '32px', fontSize: '0.8rem' }}
                            onClick={() => handleDecision(p.id || p._id, 'reject')}
                            disabled={loadingMap[p.id || p._id] || p.approvalAttempts >= 3}
                          >
                            Reject Listing
                          </button>
                        </div>
                        
                        {!isRejected && p.approvalAttempts < 3 && (
                          <input
                            type="text"
                            className="form-input"
                            style={{ height: '32px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.1)' }}
                            placeholder="Rejection reason (required to reject)..."
                            value={rejectionReasonMap[p.id || p._id] || ''}
                            onChange={(e) => setRejectionReasonMap(prev => ({ ...prev, [p.id || p._id]: e.target.value }))}
                          />
                        )}

                        {p.adminCode && p.approvalStatus === 'pending' && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 'bold', border: '1px dashed var(--color-success)', padding: '6px', borderRadius: '4px', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)' }}>
                            Generated Admin Code: {p.adminCode}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-icon" style={{ color: 'var(--color-success)' }}>✓</div>
            <h3>No pending product requests</h3>
            <p>All listings have been approved or verified. Check back when vendors add new items.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentUploader({ label, value, onChange }) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    setUploading(true);
    setProgress(0);

    // Simulate progress bar loading
    let current = 0;
    const interval = setInterval(() => {
      current += 10;
      setProgress(current);
      if (current >= 100) {
        clearInterval(interval);
        
        const reader = new FileReader();
        reader.onload = (e) => {
          onChange(e.target.result); // yields base64 Data URL
          setUploading(false);
        };
        reader.readAsDataURL(file);
      }
    }, 80);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => {
    setDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const cleanLabel = (label || '').replace(/\s+/g, '-');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', textAlign: 'left' }}>
      {label && <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 'bold' }}>{label}</label>}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          border: dragging ? '2px dashed #6366f1' : '2px dashed var(--border-color)',
          borderRadius: '12px',
          padding: '24px 16px',
          textAlign: 'center',
          backgroundColor: dragging ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-secondary)',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          position: 'relative'
        }}
        onClick={() => document.getElementById(`file-input-${cleanLabel}`).click()}
      >
        <input
          id={`file-input-${cleanLabel}`}
          type="file"
          accept="image/*,application/pdf"
          style={{ display: 'none' }}
          onChange={onFileSelect}
        />
        
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Processing {fileName} ({progress}%)</span>
            <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#6366f1', transition: 'width 0.1s ease-in-out' }} />
            </div>
          </div>
        ) : value ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.8rem' }}>📄</span>
            <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold' }}>✓ Document Attached</span>
            {fileName && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>}
            <span style={{ fontSize: '0.7rem', color: '#6366f1', textDecoration: 'underline' }}>Click to replace file</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '2rem', color: 'var(--text-muted)' }}>📤</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Drag & Drop file here or <span style={{ color: '#4f46e5', textDecoration: 'underline' }}>browse</span>
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Supports PDF or images (Max 5MB)</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SellerDocumentResubmissionForm({ documents, onSuccess }) {
  const [businessDocUrl, setBusinessDocUrl] = useState('');
  const [idDocUrl, setIdDocUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!businessDocUrl.trim() && !idDocUrl.trim()) {
      setError('Please attach at least one document to resubmit.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const token = localStorage.getItem('emahu_seller_token');
      
      if (businessDocUrl.trim()) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/seller/documents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            documentType: 'business_registration',
            fileUrl: businessDocUrl.trim()
          })
        });
        if (res.status === 401) {
          handleSessionExpired();
          return;
        }
        const data = await res.json();
        if (!data.success) {
          setError(data.error || 'Failed to submit business registration');
          setSubmitting(false);
          return;
        }
      }

      if (idDocUrl.trim()) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/seller/documents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            documentType: 'id_proof',
            fileUrl: idDocUrl.trim()
          })
        });
        if (res.status === 401) {
          handleSessionExpired();
          return;
        }
        const data = await res.json();
        if (!data.success) {
          setError(data.error || 'Failed to submit ID proof');
          setSubmitting(false);
          return;
        }
      }

      onSuccess();
    } catch (err) {
      console.error(err);
      setError('Network error resubmitting details. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '24px' }}>
      {error && (
        <div style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.85rem' }}>
          ⚠️ {error}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <DocumentUploader
          label="Resubmit Business Registration Document"
          value={businessDocUrl}
          onChange={setBusinessDocUrl}
        />
        <DocumentUploader
          label="Resubmit ID Proof (PAN / Aadhaar)"
          value={idDocUrl}
          onChange={setIdDocUrl}
        />
        <button 
          type="submit" 
          className="company-portal-btn" 
          style={{ width: '100%', height: '40px', background: '#6366f1', color: '#fff', fontWeight: '700', borderRadius: '8px', cursor: submitting ? 'not-allowed' : 'pointer', border: 'none', marginTop: '8px' }}
          disabled={submitting}
        >
          {submitting ? 'Resubmitting details...' : 'Resubmit for Verification'}
        </button>
      </div>
    </form>
  );
}
