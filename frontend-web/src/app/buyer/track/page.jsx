'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import BuyerHeader from '@/components/buyer_home/buyer_header';
import './track.css';

// Sub-component for interactive Leaflet Map for a specific orderId
function LiveTrackingMap({ orderId, trackingData, leafletLoaded }) {
  const mapRef = useRef(null);
  const mapContainerId = `map-container-${orderId}`;
  
  const markerCourierRef = useRef(null);
  const markerSellerRef = useRef(null);
  const markerBuyerRef = useRef(null);
  const polylineRef = useRef(null);

  useEffect(() => {
    if (!leafletLoaded || typeof window === 'undefined' || !window.L || !trackingData) return;

    const container = document.getElementById(mapContainerId);
    if (!container) return;

    const sLat = trackingData.sellerLocation?.latitude || 23.0225;
    const sLon = trackingData.sellerLocation?.longitude || 72.5714;
    const bLat = trackingData.buyerLocation?.latitude || 23.0225;
    const bLon = trackingData.buyerLocation?.longitude || 72.5714;
    
    // Fallback: If courier coordinates are not yet set/known, default to seller
    const cLat = trackingData.partnerLocation?.latitude || sLat;
    const cLon = trackingData.partnerLocation?.longitude || sLon;

    // Initialize Leaflet map if not already done
    if (!mapRef.current) {
      mapRef.current = window.L.map(mapContainerId).setView([cLat, cLon], 13);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);

      const sellerIcon = window.L.divIcon({
        html: '<div style="background-color:#dd6b20; width:14px; height:14px; border-radius:50%; border:3px solid white; box-shadow:0 0 5px rgba(0,0,0,0.3)"></div>',
        className: 'custom-div-icon',
        iconSize: [14, 14]
      });

      const buyerIcon = window.L.divIcon({
        html: '<div style="background-color:#e53e3e; width:14px; height:14px; border-radius:50%; border:3px solid white; box-shadow:0 0 5px rgba(0,0,0,0.3)"></div>',
        className: 'custom-div-icon',
        iconSize: [14, 14]
      });

      const courierIcon = window.L.divIcon({
        html: '<div style="background-color:#319795; width:18px; height:18px; border-radius:50%; border:3px solid white; box-shadow:0 0 7px rgba(0,0,0,0.4)"></div>',
        className: 'custom-div-icon',
        iconSize: [18, 18]
      });

      markerSellerRef.current = window.L.marker([sLat, sLon], { icon: sellerIcon })
        .addTo(mapRef.current)
        .bindPopup(`<strong>Merchant Pickup</strong>`);

      markerBuyerRef.current = window.L.marker([bLat, bLon], { icon: buyerIcon })
        .addTo(mapRef.current)
        .bindPopup(`<strong>Your Dropoff</strong>`);

      markerCourierRef.current = window.L.marker([cLat, cLon], { icon: courierIcon })
        .addTo(mapRef.current)
        .bindPopup(`<strong>Courier Location</strong>`);

      polylineRef.current = window.L.polyline([[sLat, sLon], [bLat, bLon]], { color: '#319795', weight: 4, dashArray: '5, 8' })
        .addTo(mapRef.current);

      mapRef.current.fitBounds([[sLat, sLon], [bLat, bLon]], { padding: [40, 40] });
    } else {
      // Update courier marker position dynamically when tracking coordinates shift
      if (markerCourierRef.current && trackingData.partnerLocation) {
        markerCourierRef.current.setLatLng([cLat, cLon]);
      }
    }
  }, [leafletLoaded, trackingData, mapContainerId]);

  return (
    <div style={{ marginBottom: '24px' }}>
      <div id={mapContainerId} style={{ height: '350px', width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0', zIndex: 1 }} />
    </div>
  );
}

const STATUS_ORDER = [
  'PENDING_APPROVAL',
  'APPROVED',
  'DELIVERY_ASSIGNED',
  'LABEL_GENERATED',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED'
];

// Separate core tracking logic so Suspense boundary works perfectly in Next.js
function TrackOrderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryId = searchParams.get('id') || '';

  const [searchId, setSearchId] = useState(queryId);
  const [activeOrder, setActiveOrder] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Loaded orders list from localStorage
  const [allOrders, setAllOrders] = useState([]);
  
  const [liveTracking, setLiveTracking] = useState({});
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Lazy-load Leaflet CDNs
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

  // Poll live tracking details for all active sub-orders in the current activeOrder
  useEffect(() => {
    if (!activeOrder || !activeOrder.ordersList) return;

    const activeSubOrders = activeOrder.ordersList.filter(o => 
      o.deliveryPartnerId && 
      ['assigned', 'accepted', 'picked_up', 'in_transit', 'out_for_delivery', 'arrived'].includes(o.deliveryStatus)
    );

    if (activeSubOrders.length === 0) {
      setLiveTracking({});
      return;
    }

    const fetchLiveTracking = async () => {
      const updatedTracking = { ...liveTracking };
      let changed = false;

      for (const subOrd of activeSubOrders) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/delivery/track/live/${subOrd.orderId}`);
          const data = await res.json();
          if (data.success) {
            updatedTracking[subOrd.orderId] = data;
            changed = true;
          }
        } catch (err) {
          console.warn(`Error fetching live tracking for sub-order ${subOrd.orderId}:`, err);
        }
      }

      if (changed) {
        setLiveTracking(updatedTracking);
      }
    };

    fetchLiveTracking();
    const interval = setInterval(fetchLiveTracking, 5000);
    return () => clearInterval(interval);
  }, [activeOrder?.orderId]);

  useEffect(() => {
    // 1. Load from localStorage first for instant initial paint
    try {
      const storedOrders = localStorage.getItem('emahu_orders');
      if (storedOrders) {
        const parsed = JSON.parse(storedOrders);
        setTimeout(() => setAllOrders(parsed), 0);
      } else {
        const seedOrders = [
          {
            orderId: 'EMH_772918',
            date: '24 May 2026',
            createdAt: new Date('2026-05-24T00:00:00.000Z').toISOString(),
            items: [
              {
                productId: 'prod_mock_sony',
                name: 'Sony WH-1000XM5 Headphones',
                price: 26999,
                quantity: 1,
                brand: 'Sony',
                img: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&q=80',
                seller: {
                  name: 'Sony India Retail',
                  email: 'retail@sony.co.in',
                  phone: '+91 1800 103 7799'
                }
              }
            ],
            total: 31958,
            status: '🔒 ESCROW VAULT SECURED',
            shippingSpeed: 'standard',
            escrowMethod: 'wallet',
            deliveryAddress: {
              fullName: 'Rahul Sharma',
              phone: '+91 98765 43210',
              email: 'rahul@example.com',
              address: 'Block A, Apex Greens, Sector 45',
              city: 'Noida',
              stateName: 'Uttar Pradesh',
              pincode: '201303'
            }
          }
        ];
        localStorage.setItem('emahu_orders', JSON.stringify(seedOrders));
        setTimeout(() => setAllOrders(seedOrders), 0);
      }
    } catch (e) {
      console.error(e);
    }

    // 2. Determine buyer/guest identifier
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

    // 3. Fetch orders from live API
    const fetchOrders = async () => {
      if (!buyerUserId) return;
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/orders?userId=${buyerUserId}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.orders) {
          setTimeout(() => setAllOrders(data.orders), 0);
          localStorage.setItem('emahu_orders', JSON.stringify(data.orders));
        }
      } catch (err) {
        console.warn('API error tracking orders:', err);
      }
    };

    fetchOrders();

    // 4. Poll orders every 3 seconds for live tracking step updates
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  // Live polling of the specific tracked order by Escrow Lock ID (queryId)
  useEffect(() => {
    if (!queryId) return;

    const fetchTrackedOrder = async () => {
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/orders?orderId=${queryId.trim()}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.orders && data.orders.length > 0) {
          setAllOrders(prev => {
            // Filter out existing instances of this order/bill to prevent duplication
            const otherOrders = prev.filter(ord => 
              ord.orderId.toLowerCase() !== queryId.trim().toLowerCase() &&
              (!ord.billId || ord.billId.toLowerCase() !== queryId.trim().toLowerCase())
            );
            return [...otherOrders, ...data.orders];
          });
        }
      } catch (err) {
        console.warn('API error tracking specific order:', err);
      }
    };

    fetchTrackedOrder();
    const interval = setInterval(fetchTrackedOrder, 3000);
    return () => clearInterval(interval);
  }, [queryId]);

  // Update tracking view if query param ID changes or if orders loaded
  useEffect(() => {
    if (queryId && allOrders.length > 0) {
      const matchingGroup = allOrders.filter(ord => 
        (ord.billId && ord.billId.toLowerCase() === queryId.trim().toLowerCase()) || 
        ord.orderId.toLowerCase() === queryId.trim().toLowerCase()
      );
      
      if (matchingGroup.length > 0) {
        const first = matchingGroup[0];
        const mergedItems = [];
        let totalVal = 0;
        matchingGroup.forEach(ord => {
          // Tag each item with its sub-order status for per-item status display
          const taggedItems = ord.items.map(item => ({
            ...item,
            _orderId: ord.orderId,
            _status: ord.status,
            _sellerRejected: ord.sellerRejected || false,
            _rejectionReason: ord.rejectionReason || null
          }));
          mergedItems.push(...taggedItems);
          totalVal += ord.total;
        });

        const statuses = matchingGroup.map(o => o.status);
        const hasDisputed = statuses.some(s => s.includes('DISPUTED') || s === 'disputed' || s === '⚠️ VAULT DISPUTED / FROZEN');

        // ── Distinguish ALL rejected vs SOME rejected ──
        const isOrderRejected = (o) => o.sellerRejected || o.status.includes('REJECTED') || o.status.includes('Rejected') || o.status === '❌ Order Rejected by Seller';
        const allRejected = matchingGroup.every(o => isOrderRejected(o));
        const someRejected = !allRejected && matchingGroup.some(o => isOrderRejected(o));

        const allReleased = statuses.every(s => s.includes('RELEASED') || s.includes('Released') || s === '🔓 FUNDS RELEASED');
        // hasConfirmed: at least one NON-rejected sub-order is confirmed/in-progress
        const hasConfirmed = matchingGroup.some(o => !isOrderRejected(o) && (o.sellerConfirmed || ['DELIVERY_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(o.status)));
        const isPending = matchingGroup.every(o => o.status === 'PENDING_APPROVAL');

        // Collect rejected sub-orders info for display
        const rejectedSubOrders = matchingGroup.filter(o => isOrderRejected(o)).map(o => ({
          orderId: o.orderId,
          rejectionReason: o.rejectionReason || null,
          items: o.items
        }));

        let overallStatus = '🔒 ESCROW VAULT SECURED';
        if (hasDisputed) {
          overallStatus = '⚠️ VAULT DISPUTED / FROZEN';
        } else if (allReleased) {
          overallStatus = '🔓 FUNDS RELEASED';
        } else if (allRejected) {
          overallStatus = '❌ Order Rejected by Seller';
        } else if (someRejected && hasConfirmed) {
          overallStatus = '⚠️ Partial Rejection — Items in Transit';
        } else if (someRejected) {
          overallStatus = '⚠️ Partial Rejection — Items Pending';
        } else if (hasConfirmed) {
          overallStatus = '✓ Delivery Confirmed by Seller';
        } else if (isPending) {
          overallStatus = 'PENDING_APPROVAL';
        }

        // rawStatusVal: use BEST progress among non-rejected sub-orders
        let rawStatusVal = 'PENDING_APPROVAL';
        if (hasDisputed) {
          rawStatusVal = '⚠️ VAULT DISPUTED / FROZEN';
        } else if (allRejected) {
          rawStatusVal = 'REJECTED';
        } else if (allReleased) {
          rawStatusVal = 'COMPLETED';
        } else {
          let maxIdx = -1;
          matchingGroup.forEach(ord => {
            // Skip rejected sub-orders when computing delivery timeline progress
            if (isOrderRejected(ord)) return;
            let s = ord.status;
            if (s === '🔓 FUNDS RELEASED') s = 'COMPLETED';
            const idx = STATUS_ORDER.indexOf(s);
            if (idx > maxIdx) {
              maxIdx = idx;
              rawStatusVal = ord.status;
            }
          });
        }

        const mergedOrder = {
          ...first,
          orderId: first.billId || first.orderId,
          items: mergedItems,
          total: totalVal,
          status: overallStatus,
          rawStatus: rawStatusVal,
          timeline: first.timeline,
          allRejected,
          someRejected,
          rejectedSubOrders
        };

        setTimeout(() => {
          setActiveOrder(mergedOrder);
          setErrorMsg('');
          setSearchId(queryId);
        }, 0);
      } else {
        setTimeout(() => {
          setActiveOrder(null);
          setErrorMsg(`No active transaction found with Escrow Lock ID "${queryId}". Please verify the code and try again.`);
        }, 0);
      }
    } else if (!queryId) {
      if (allOrders.length > 0) {
        const firstOrder = allOrders[allOrders.length - 1];
        const targetId = firstOrder.billId || firstOrder.orderId;
        router.replace(`/buyer/track?id=${targetId}`);
      }
    }
  }, [queryId, allOrders, router]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    router.push(`/buyer/track?id=${searchId.trim().toUpperCase()}`);
  };

  // Determine active tracking steps based on status
  const getTrackingSteps = (status, isFullyRejected) => {
    // Only collapse timeline to rejected if ALL sub-orders are rejected
    const isRejected = isFullyRejected || status === 'REJECTED';
    
    const statusVal = status === '🔓 FUNDS RELEASED' ? 'COMPLETED' : (status === '⚠️ VAULT DISPUTED / FROZEN' ? 'COMPLETED' : status);
    const currentIndex = STATUS_ORDER.indexOf(statusVal);
    
    const stepsData = [
      {
        title: 'Payment Completed',
        desc: '✅ Checkout lock success. Escrow vault capital secured.',
        status: 'PAYMENT_COMPLETED'
      },
      {
        title: 'Seller Approval Pending',
        desc: '⏳ Awaiting approval from merchant listing owner.',
        status: 'PENDING_APPROVAL'
      },
      {
        title: 'Seller Approved',
        desc: '✅ Order approved by the seller.',
        status: 'APPROVED'
      },
      {
        title: 'Delivery Partner Assigned',
        desc: '🚚 Assigning courier partner and printing package manifest tags.',
        status: 'DELIVERY_ASSIGNED'
      },
      {
        title: 'Shipping Label Generated',
        desc: '📄 Shipping label has been generated successfully.',
        status: 'LABEL_GENERATED'
      },
      {
        title: 'Ready For Pickup',
        desc: '📦 Package is packed and ready for carrier pickup.',
        status: 'READY_FOR_PICKUP'
      },
      {
        title: 'Picked Up',
        desc: '📦 Package picked up by courier partner dispatch agent.',
        status: 'PICKED_UP'
      },
      {
        title: 'In Transit',
        desc: '🚛 Package in transit via EV highway cargo corridor.',
        status: 'IN_TRANSIT'
      },
      {
        title: 'Out For Delivery',
        desc: '🛵 Package is out with local dispatch rider. Arriving today.',
        status: 'OUT_FOR_DELIVERY'
      },
      {
        title: 'Delivered',
        desc: '🎉 Package delivered. Awaiting escrow release.',
        status: 'DELIVERED'
      },
      {
        title: 'Order Completed',
        desc: '✅ Escrow release confirmation received. Transaction completed.',
        status: 'COMPLETED'
      }
    ];

    return stepsData.map((step, idx) => {
      let state = 'upcoming';
      
      if (isRejected) {
        if (idx === 0) state = 'completed';
        else if (idx === 1) state = 'disputed'; // Rejection indicator color
      } else {
        if (idx === 0) {
          state = 'completed';
        } else {
          const statusIdx = idx - 1;
          if (statusIdx < currentIndex) {
            state = 'completed';
          } else if (statusIdx === currentIndex) {
            state = 'current';
          }
        }
      }

      // Read custom dates or descriptions from timeline array if stored
      const matchedLog = activeOrder?.timeline?.find(t => t.status === step.status || (step.status === 'COMPLETED' && t.status === 'DELIVERED'));
      const displayDesc = matchedLog ? matchedLog.desc : step.desc;
      const displayDate = matchedLog ? matchedLog.date : (state === 'completed' || state === 'current' ? 'Processed' : 'Awaiting update');

      return {
        title: step.title,
        desc: displayDesc,
        date: displayDate,
        state
      };
    });
  };

  return (
    <div className="track-container">
      {/* Header Search Dashboard */}
      <div className="track-search-section">
        <h1 className="track-main-title">Direct Escrow Track</h1>
        <p className="track-main-subtitle">Enter your Emahu Escrow Lock ID code to trace secure courier dispatch, inspect status, and verify vault holdings.</p>
        
        <form onSubmit={handleSearchSubmit} className="track-search-form">
          <div className="track-input-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input 
              type="text" 
              placeholder="e.g., EMH_772918" 
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="track-search-input"
            />
          </div>
          <button type="submit" className="track-search-btn">
            Trace Escrow Code
          </button>
        </form>

        {errorMsg && <p className="track-error-message">{errorMsg}</p>}
      </div>

      {activeOrder ? (
        <div className="track-grid-layout">
          
          {/* Left Column: Tracking Timeline */}
          <div className="track-timeline-card">
            <div className="timeline-card-header">
              <h3>📦 LIVE DISPATCH & ESCROW STATUS</h3>
              <span className={`track-status-badge ${
                activeOrder.status.includes('DISPUTED') ? 'badge-disputed' : 
                activeOrder.status.includes('RELEASED') ? 'badge-released' : 'badge-locked'
              }`}>
                {activeOrder.status}
              </span>
            </div>

            {/* Alert if Disputed */}
            {activeOrder.status.includes('DISPUTED') && (
              <div className="track-dispute-alert">
                <div className="dispute-alert-icon">⚠️</div>
                <div>
                  <h4>TRANSACTION HOLD: VAULT DISPUTED</h4>
                  <p>Escrow capital remains completely frozen. The courier has been instructed to hold dispatch/delivery. Emahu claims arbitration will contact both parties within 24 hours to resolve quality claims.</p>
                </div>
              </div>
            )}

            {/* ── Partial rejection notice — shown when SOME (not all) items are rejected ── */}
            {activeOrder.someRejected && !activeOrder.allRejected && (
              <div style={{
                margin: '0 0 16px 0', padding: '14px 16px',
                background: 'rgba(245,158,11,0.07)', border: '1.5px solid rgba(245,158,11,0.3)',
                borderRadius: '10px', display: 'flex', gap: '12px', alignItems: 'flex-start'
              }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>⚠️</span>
                <div>
                  <p style={{ margin: 0, fontWeight: '700', fontSize: '0.85rem', color: '#92400e' }}>
                    Partial Rejection — Some Items Cannot Be Delivered
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#78350f', lineHeight: 1.5 }}>
                    {activeOrder.rejectedSubOrders.length} item group(s) were rejected by the seller.
                    The remaining items are still being processed and tracked below.
                    Escrow funds for rejected items will be refunded automatically.
                  </p>
                  {activeOrder.rejectedSubOrders.map((rs, ri) => rs.rejectionReason && (
                    <div key={ri} style={{ marginTop: '6px', fontSize: '0.75rem', color: '#92400e', background: 'rgba(245,158,11,0.12)', borderRadius: '6px', padding: '4px 10px', display: 'inline-block' }}>
                      ❌ {rs.items.map(i => i.name).join(', ')}: {rs.rejectionReason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── All rejected alert ── */}
            {activeOrder.allRejected && (
              <div style={{
                margin: '0 0 16px 0', padding: '14px 16px',
                background: 'rgba(239,68,68,0.06)', border: '1.5px solid rgba(239,68,68,0.25)',
                borderRadius: '10px', display: 'flex', gap: '12px', alignItems: 'flex-start'
              }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>❌</span>
                <div>
                  <p style={{ margin: 0, fontWeight: '700', fontSize: '0.85rem', color: '#991b1b' }}>All Items Rejected by Seller</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#7f1d1d', lineHeight: 1.5 }}>
                    The seller rejected this entire order. Escrow vault funds will be fully refunded to your account.
                  </p>
                </div>
              </div>
            )}

            {/* Live Tracking Map Component */}
            {leafletLoaded && Object.keys(liveTracking).map(subOrdId => {
              const trackingData = liveTracking[subOrdId];
              return (
                <div key={subOrdId} className="live-map-card" style={{ marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '850', color: '#1e293b' }}>
                      🚚 LIVE ROUTE MAP (Order #{subOrdId})
                    </h4>
                    <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      {trackingData.deliveryStatus?.replace('_', ' ')}
                    </span>
                  </div>
                  <LiveTrackingMap orderId={subOrdId} trackingData={trackingData} leafletLoaded={leafletLoaded} />
                  
                  {/* Distance and ETA */}
                  {trackingData.remainingDistanceKm !== null && (
                    <div style={{ display: 'flex', gap: '20px', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold' }}>Remaining Distance</span>
                        <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{trackingData.remainingDistanceKm} KM</strong>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold' }}>Estimated Time (ETA)</span>
                        <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{trackingData.etaMinutes} mins</strong>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Vertical Steps Timeline */}
            <div className="track-steps-list">
              {getTrackingSteps(activeOrder.rawStatus || activeOrder.status, activeOrder.allRejected).map((step, idx) => (
                <div key={idx} className={`track-step-item step-item--${step.state}`}>
                  <div className="step-bullet-column">
                    <div className="step-bullet-circle">
                      {step.state === 'completed' && '✓'}
                      {step.state === 'disputed' && '!'}
                      {step.state === 'frozen' && '🔒'}
                      {step.state === 'current' && '●'}
                      {step.state === 'upcoming' && ''}
                    </div>
                    {idx < 10 && <div className="step-connector-line" />}
                  </div>
                  <div className="step-text-content">
                    <div className="step-title-row">
                      <h4>{step.title}</h4>
                      <span className="step-timestamp">{step.date}</span>
                    </div>
                    <p>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Order Info Details */}
          <div className="track-info-sidebar">
            
            {/* Escrow summary details */}
            <div className="sidebar-info-block">
              <h3>🔒 Escrow Agreement</h3>
              <div className="sidebar-metrics-grid">
                <div>
                  <span>Escrow Lock ID</span>
                  <strong>{activeOrder.orderId}</strong>
                </div>
                <div>
                  <span>Date Initiated</span>
                  <strong>{activeOrder.date}</strong>
                </div>
                <div>
                  <span>Transit Speed</span>
                  <strong style={{ textTransform: 'capitalize' }}>
                    {activeOrder.shippingSpeed === 'priority' ? 'EV Priority Courier' : 'EV Standard Routing'}
                  </strong>
                </div>
                <div>
                  <span>Vault Capital</span>
                  <strong style={{ color: '#10b981' }}>₹{activeOrder.total.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>

            {/* Live Courier Details */}
            {Object.keys(liveTracking).length > 0 ? (
              Object.keys(liveTracking).map(subOrdId => {
                const trackingData = liveTracking[subOrdId];
                const partner = trackingData.partnerDetails;
                if (!partner) return null;
                return (
                  <div key={subOrdId} className="sidebar-info-block" style={{ borderLeft: '4px solid #319795', paddingTop: '16px' }}>
                    <h3>🚚 Driver Logistics (Order #{subOrdId})</h3>
                    <div className="sidebar-metrics-grid">
                      <div>
                        <span>Driver Name</span>
                        <strong style={{ fontSize: '0.95rem' }}>{partner.name}</strong>
                      </div>
                      <div>
                        <span>Vehicle Info</span>
                        <strong>{partner.vehicleType?.toUpperCase()} ({partner.vehicleNumber || 'N/A'})</strong>
                      </div>
                      {partner.phone && (
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                          <a 
                            href={`tel:${partner.phone}`} 
                            style={{ 
                              flex: 1, 
                              textAlign: 'center', 
                              padding: '8px 12px', 
                              background: '#319795', 
                              color: '#fff', 
                              borderRadius: '6px', 
                              fontSize: '0.75rem', 
                              fontWeight: 'bold', 
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            📞 Call Partner
                          </a>
                          <a 
                            href={`https://wa.me/91${partner.phone.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ 
                              flex: 1, 
                              textAlign: 'center', 
                              padding: '8px 12px', 
                              background: '#10b981', 
                              color: '#fff', 
                              borderRadius: '6px', 
                              fontSize: '0.75rem', 
                              fontWeight: 'bold', 
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            💬 WhatsApp
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : activeOrder.carrier ? (
              <div className="sidebar-info-block" style={{ borderLeft: '3px solid #10b981', paddingTop: '16px' }}>
                <h3>🚚 Dispatch Logistics</h3>
                <div className="sidebar-metrics-grid">
                  <div>
                    <span>Delivery Partner</span>
                    <strong>{activeOrder.carrier}</strong>
                  </div>
                  <div>
                    <span>Tracking Number</span>
                    <strong style={{ color: '#4169e1' }}>{activeOrder.trackingId}</strong>
                  </div>
                  <div>
                    <span>Estimated Delivery</span>
                    <strong>{activeOrder.estDays || 'N/A'}</strong>
                  </div>
                  <div>
                    <span>Fulfillment Cost</span>
                    <strong>₹{activeOrder.deliveryCost || '0'}</strong>
                  </div>
                </div>
              </div>
            ) : null}

            {(activeOrder.status === 'REJECTED' || activeOrder.status === '❌ Order Rejected by Seller' || activeOrder.rawStatus === 'REJECTED') && activeOrder.rejectionReason && (
              <div className="sidebar-info-block" style={{ borderLeft: '3px solid #ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)', paddingTop: '16px' }}>
                <h3 style={{ color: '#ef4444' }}>❌ Order Rejected</h3>
                <div style={{ fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>Reason:</span>
                  <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#0f172a' }}>{activeOrder.rejectionReason}</p>
                </div>
              </div>
            )}

            {/* Product items summary list */}
            <div className="sidebar-info-block">
              <h3>📦 Locked Merchandise</h3>
              <div className="sidebar-products-stack">
                {activeOrder.items.map((item, idx) => {
                  const isItemRejected = item._sellerRejected || (item._status && (item._status.includes('REJECTED') || item._status === '❌ Order Rejected by Seller'));
                  const isItemPending = !item._status || item._status === 'PENDING_APPROVAL';
                  const isItemConfirmed = !isItemRejected && item._status && ['APPROVED','DELIVERY_ASSIGNED','LABEL_GENERATED','READY_FOR_PICKUP','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','COMPLETED','✓ Delivery Confirmed by Seller','🔓 FUNDS RELEASED'].some(s => item._status.includes(s));
                  return (
                    <div key={idx} className="sidebar-product-row" style={isItemRejected ? { opacity: 0.7, background: 'rgba(239,68,68,0.04)', borderRadius: '10px', padding: '6px 8px' } : {}}>
                      <img src={item.img} alt={item.name} style={isItemRejected ? { filter: 'grayscale(0.5)' } : {}} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4>{item.name}</h4>
                        <span>Qty: {item.quantity} • Brand: {item.brand}</span>
                        {/* Per-item delivery status inline badge */}
                        {isItemRejected && (
                          <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: '700', color: '#ef4444', background: 'rgba(239,68,68,0.12)', borderRadius: '5px', padding: '2px 8px', width: 'fit-content' }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                              Not Deliverable
                            </span>
                            {item._rejectionReason && (
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8', paddingLeft: '2px' }}>Reason: {item._rejectionReason}</span>
                            )}
                          </div>
                        )}
                        {isItemPending && !isItemRejected && (
                          <span style={{ marginTop: '5px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: '700', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', borderRadius: '5px', padding: '2px 8px', width: 'fit-content' }}>
                            ⏳ Awaiting Seller Approval
                          </span>
                        )}
                        {isItemConfirmed && (
                          <span style={{ marginTop: '5px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: '700', color: '#10b981', background: 'rgba(16,185,129,0.1)', borderRadius: '5px', padding: '2px 8px', width: 'fit-content' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                            Confirmed for Delivery
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Handling Seller Details */}
            <div className="sidebar-info-block">
              <h3>🚚 Transit Handling Seller</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Array.from(new Map(activeOrder.items.map(item => {
                  const seller = item.seller || { name: item.brand || 'Emahu Seller', email: 'support@emahu.com', phone: '+91 99999 99999' };
                  return [seller.name + seller.phone, seller];
                })).values()).map((seller, sIdx) => (
                  <div key={sIdx} className="sidebar-address-block" style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '6px' }}>Handling Seller</span>
                    <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{seller.name}</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#475569' }}>
                      Email: <strong>{seller.email}</strong>
                    </p>
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', marginBottom: '8px' }}>
                      <span>✓ Delivery is handled by this seller</span>
                    </div>
                    {activeOrder.sellerConfirmed ? (
                      <div style={{ padding: '6px 10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.78rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="4">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>✓ Delivery Approved by Seller</span>
                      </div>
                    ) : activeOrder.sellerRejected ? (
                      <div style={{ padding: '6px 10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.78rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="4">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        <span>❌ Delivery Rejected by Seller</span>
                      </div>
                    ) : (
                      <div style={{ padding: '6px 10px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontSize: '0.78rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                        <span>Awaiting Seller Delivery Confirmation</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery destination Details */}
            {activeOrder.deliveryAddress && (
              <div className="sidebar-info-block">
                <h3>📍 Destination Route</h3>
                <div className="sidebar-address-block">
                  <strong>{activeOrder.deliveryAddress.fullName}</strong>
                  <p>{activeOrder.deliveryAddress.phone} • {activeOrder.deliveryAddress.email}</p>
                  <div className="address-divider" />
                  <p>{activeOrder.deliveryAddress.address}, {activeOrder.deliveryAddress.city}, {activeOrder.deliveryAddress.stateName} - {activeOrder.deliveryAddress.pincode}</p>
                </div>
              </div>
            )}

            {/* Action CTAs */}
            <div className="sidebar-action-ctas">
              <Link href="/buyer/orders" className="track-link-btn track-link-btn--solid">
                📂 View My Orders
              </Link>
              <Link href="/buyer/products" className="track-link-btn track-link-btn--outline">
                Start Buying More
              </Link>
            </div>

          </div>

        </div>
      ) : (
        /* Zero State when search yielded nothing */
        <div className="track-zero-state">
          <div className="zero-icon">🔍</div>
          <h3>Trace Active Orders</h3>
          <p>Please enter an Escrow Lock ID above or visit your active transactions directory to start live tracking.</p>
          <Link href="/buyer/orders" className="track-zero-btn">
            View My Locked Orders
          </Link>
        </div>
      )}
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <div className="track-page">
      <BuyerHeader />
      
      {/* Breadcrumbs */}
      <nav className="track-breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/buyer/products">Buyer</Link>
        <span>/</span>
        <span style={{ color: '#1a1a1a' }}>Order Tracking</span>
      </nav>

      {/* Main Container */}
      <main className="track-main-wrapper">
        <Suspense fallback={
          <div className="track-loading-state">
            <div className="spinner" />
            <p>Loading escrow tracking details...</p>
          </div>
        }>
          <TrackOrderContent />
        </Suspense>
      </main>
    </div>
  );
}
