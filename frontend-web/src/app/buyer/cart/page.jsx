'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import BuyerHeader from '@/components/buyer_home/buyer_header';
import './cart.css';

import { STATIC_PRODUCTS } from '@/utils/mockProducts';

export default function CartPage() {
  const [cartItems, setCartItems] = useState([]);
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
    freeShippingThreshold: 2000,
    expressDeliverySurcharge: 100
  });
  const [buyerCoordinates, setBuyerCoordinates] = useState({ latitude: '', longitude: '' });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [buyerCity, setBuyerCity] = useState('');

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

  // ── Load Cart items on mount ──
  useEffect(() => {
    const loadCartAndProducts = async () => {
      let formattedList = [];
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products`);
        const data = await res.json();
        if (data.success && data.products) {
          formattedList = data.products.map(p => {
            let mappedCategory = p.category;
            if (p.category === 'Electronics') mappedCategory = 'Tech';
            else if (p.category === 'Fitness' || p.category === 'Furniture') mappedCategory = 'Lifestyle';

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
              img: p.image || '📦',
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
        const allProducts = [...formattedList, ...STATIC_PRODUCTS.map(p => ({ ...p, stock: p.stock ?? 99 }))];
        const seen = new Set();
        const uniqueProducts = allProducts.filter(p => {
          if (!p || !p.id) return false;
          const pid = p.id.toString();
          if (seen.has(pid)) return false;
          seen.add(pid);
          return true;
        });

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
    };

    loadCartAndProducts();
  }, []);

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
        setBuyerCoordinates({ latitude: lat.toFixed(6), longitude: lon.toFixed(6) });
        setGpsLoading(false);
        // Reverse geocode to get city name
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const data = await res.json();
          if (data && data.address) {
            setBuyerCity(data.address.city || data.address.town || data.address.village || data.address.county || '');
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
  const shippingFee = subtotal === 0 ? 0 : deliveryCharge;
  const taxAmount = Math.round(subtotal * 0.18);
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
              address: buyerCity || 'Emahu Hub Office',
              city: buyerCity || 'Delhi',
              stateName: 'Delhi',
              pincode: '110001'
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
                    {typeof p.img === 'string' && p.img.startsWith('http') ? (
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
                      <span>Color: <strong>{p.selectedColor}</strong></span>
                      <span className="cart-item-row__specs-dot" />
                      <span>Size: <strong>{p.selectedSize}</strong></span>
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
                      onClick={() => { setBuyerCoordinates({ latitude: '', longitude: '' }); setBuyerCity(''); }}
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
                    ) : shippingFee === 0 ? (
                      <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: '800' }}>🚚 FREE SHIPPING</span>
                    ) : (
                      `₹${shippingFee}`
                    )}
                  </strong>
                </div>

                {/* Per-seller breakdown */}
                {deliveryBreakdown.length > 1 && (
                  <div style={{ background: 'rgba(100,116,139,0.05)', borderRadius: '8px', padding: '10px', marginTop: '-4px', marginBottom: '4px' }}>
                    <p style={{ fontSize: '0.71rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Seller Breakdown</p>
                    {deliveryBreakdown.map((b, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', padding: '3px 0' }}>
                        <span>{b.sellerName} — {b.distanceKm} km</span>
                        <span style={{ fontWeight: '600' }}>{b.freeShippingApplied ? 'FREE' : `₹${b.deliveryCharge}`}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="cart-summary-row">
                  <span>Vault Escrow Tax (CGST + SGST 18%)</span>
                  <strong>₹{taxAmount.toLocaleString('en-IN')}</strong>
                </div>

                <div className="cart-summary-divider" />

                <div className="cart-summary-row cart-summary-row--total">
                  <span>Escrow Grand Total</span>
                  <strong>₹{grandTotal.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              {/* Trust Badge Indicators */}
              <div className="cart-summary-trust">
                <div className="cart-trust-item">
                  <span className="cart-trust-item__dot" style={{ backgroundColor: '#4169e1' }} />
                  <div>
                    <strong>Secure Escrow Locks Protection</strong>
                    <p>Funds held in safety escrow, released only when you inspect and verify delivery.</p>
                  </div>
                </div>
                <div className="cart-trust-item">
                  <span className="cart-trust-item__dot" style={{ backgroundColor: '#10b981' }} />
                  <div>
                    <strong>Carbon-Neutral Fast EV Transit</strong>
                    <p>Zero carbon emission localized EV couriers route directly to your door.</p>
                  </div>
                </div>
              </div>

              {/* Large Matte Checkout Button */}
              <Link href="/buyer/checkout" className="cart-checkout-btn" style={{ textDecoration: 'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Proceed to Checkout</span>
              </Link>

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
