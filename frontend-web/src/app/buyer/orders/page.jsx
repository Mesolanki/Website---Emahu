'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BuyerHeader from '@/components/buyer_home/buyer_header';
import './orders.css';

function parseOrderDate(ord) {
  if (!ord) return new Date(0);
  
  // 1. Try ord.createdAt (Mongoose ISO date string or Date object)
  if (ord.createdAt) {
    const d = new Date(ord.createdAt);
    if (!isNaN(d.getTime())) return d;
  }
  
  // 2. Try ord.date (custom date string)
  if (ord.date) {
    const d = new Date(ord.date);
    if (!isNaN(d.getTime())) return d;
    
    // Attempt custom format matching (DD/MM/YYYY or DD-MM-YYYY)
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
  
  return new Date(0);
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [disputedOrderId, setDisputedOrderId] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputedOrdersList, setDisputedOrdersList] = useState([]);
  const [releasedOrdersList, setReleasedOrdersList] = useState([]);

  const handleRetryOrder = (group) => {
    const storedCartStr = localStorage.getItem('emahu_cart') || '[]';
    let storedCart = [];
    try {
      storedCart = JSON.parse(storedCartStr);
    } catch (e) {
      storedCart = [];
    }

    // Add items from rejected sub-orders back to cart
    const subOrdersToRetry = group.rejectedSubOrders && group.rejectedSubOrders.length > 0 
      ? group.rejectedSubOrders 
      : group.ordersList;

    subOrdersToRetry.forEach((order) => {
      order.items.forEach((item) => {
        const itemPid = item.productId || item.id;
        const existingIdx = storedCart.findIndex((x) => (typeof x === 'object' ? x.id : x) === itemPid);
        if (existingIdx > -1) {
          if (typeof storedCart[existingIdx] === 'object') {
            storedCart[existingIdx].quantity += item.quantity || 1;
          } else {
            storedCart[existingIdx] = { id: itemPid, quantity: (item.quantity || 1) + 1, color: 'Default', size: 'Default' };
          }
        } else {
          storedCart.push({
            id: itemPid,
            quantity: item.quantity || 1,
            color: item.color || 'Default',
            size: item.size || 'Default'
          });
        }
      });
    });

    localStorage.setItem('emahu_cart', JSON.stringify(storedCart));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('cart_update'));
    }

    router.push('/buyer/cart');
  };

  // Load orders history from database or localStorage on mount
  useEffect(() => {
    const loadRealOrders = async () => {
      try {
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
        
        let storedOrders = '[]';
        try {
          const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/orders?userId=${buyerUserId}`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.success && data.orders) {
            storedOrders = JSON.stringify(data.orders);
            localStorage.setItem('emahu_orders', storedOrders);
          } else {
            storedOrders = localStorage.getItem('emahu_orders') || '[]';
          }
        } catch (apiErr) {
          console.warn('API error fetching buyer orders, falling back to localStorage:', apiErr);
          storedOrders = localStorage.getItem('emahu_orders') || '[]';
        }

        let parsedOrders = JSON.parse(storedOrders);

        if (parsedOrders.length === 0) {
          // Mock seed orders if none exist for a professional look (using current date so it is not filtered)
          const todayDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
          const seedOrders = [
            {
              orderId: 'EMH_772918',
              date: todayDate,
              createdAt: new Date().toISOString(),
              items: [
                {
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
              total: 31958, // Price + Tax + Shipping
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
          parsedOrders = seedOrders;
        }

        // 1. Filter out orders older than 1 month (30 days)
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
        
        const filtered = parsedOrders.filter(ord => {
          const orderDate = parseOrderDate(ord);
          return orderDate >= oneMonthAgo;
        });

        // 2. Sort orders so that the newest order is always first
        const sorted = filtered.sort((a, b) => {
          const dateA = parseOrderDate(a);
          const dateB = parseOrderDate(b);
          return dateB - dateA;
        });

        // 3. Group by billId (fallback to orderId if no billId is present)
        const groupedMap = new Map();
        sorted.forEach(ord => {
          const groupKey = ord.billId || ord.orderId;
          if (!groupedMap.has(groupKey)) {
            groupedMap.set(groupKey, {
              billId: groupKey,
              orderId: ord.orderId, // representative ID
              date: ord.date,
              createdAt: ord.createdAt,
              deliveryAddress: ord.deliveryAddress,
              shippingSpeed: ord.shippingSpeed,
              escrowMethod: ord.escrowMethod,
              status: ord.status,
              items: [],
              total: 0,
              ordersList: []
            });
          }
          const group = groupedMap.get(groupKey);
          // Attach each item's per-order status and rejection reason for individual tracking
          const itemsWithStatus = ord.items.map(item => ({
            ...item,
            _orderId: ord.orderId,
            _status: ord.status,
            _sellerRejected: ord.sellerRejected || false,
            _rejectionReason: ord.rejectionReason || null
          }));
          group.items.push(...itemsWithStatus);
          group.total += ord.total;
          group.ordersList.push(ord);
        });

        const groupedOrders = Array.from(groupedMap.values()).map(group => {
          const statuses = group.ordersList.map(o => o.status);
          const hasDisputed = statuses.some(s => s.includes('DISPUTED') || s === 'disputed' || s === '⚠️ VAULT DISPUTED / FROZEN');

          // Distinguish ALL rejected vs SOME rejected
          const isOrderRejected = (o) => o.sellerRejected || o.status.includes('REJECTED') || o.status.includes('Rejected') || o.status === '❌ Order Rejected by Seller';
          const allRejected = group.ordersList.every(o => isOrderRejected(o));
          const someRejected = !allRejected && group.ordersList.some(o => isOrderRejected(o));

          const allReleased = statuses.every(s => s.includes('RELEASED') || s.includes('Released') || s === '🔓 FUNDS RELEASED');
          // Only count confirmed for non-rejected sub-orders
          const hasConfirmed = group.ordersList.some(o => !isOrderRejected(o) && (o.sellerConfirmed || ['DELIVERY_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(o.status)));
          const allConfirmed = group.ordersList.every(o => isOrderRejected(o) || o.sellerConfirmed || ['DELIVERY_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(o.status));
          const isPending = group.ordersList.every(o => o.status === 'PENDING_APPROVAL');

          const rejectedSubOrders = group.ordersList.filter(o => isOrderRejected(o));

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

          return {
            ...group,
            status: overallStatus,
            canDisputeOrRelease: !allReleased && !hasDisputed && !allRejected && hasConfirmed,
            sellerConfirmed: hasConfirmed,
            sellerRejected: allRejected,
            someRejected,
            allRejected,
            rejectedSubOrders
          };
        });

        setOrders(groupedOrders);
      } catch (e) {
        console.error('Error loading real orders:', e);
      }
    };

    loadRealOrders();
    window.addEventListener('storage', loadRealOrders);

    const interval = setInterval(loadRealOrders, 3000);

    return () => {
      window.removeEventListener('storage', loadRealOrders);
      clearInterval(interval);
    };
  }, []);

  // Helper to sync order status update to database and full localStorage
  const syncOrderStatus = async (orderId, nextStatus) => {
    try {
      // 1. Sync to database
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: nextStatus })
      });
    } catch (err) {
      console.error('Failed to sync order status to DB:', err);
    }

    try {
      // 2. Sync to full list in localStorage
      const stored = localStorage.getItem('emahu_orders');
      if (stored) {
        const parsed = JSON.parse(stored);
        const updatedAll = parsed.map(ord => {
          if (ord.orderId === orderId) {
            return { ...ord, status: nextStatus };
          }
          return ord;
        });
        localStorage.setItem('emahu_orders', JSON.stringify(updatedAll));
      }
    } catch (localErr) {
      console.error('Failed to sync order status to localStorage:', localErr);
    }
  };

  // Action: Release funds from Escrow Vault directly to Merchant
  const handleReleaseFunds = async (billId, ordersList) => {
    const confirmation = window.confirm("Are you absolutely sure the package has arrived safely and is in perfect condition? Releasing the escrow locks will transfer funds directly to the merchant. This action CANNOT be reversed!");
    if (!confirmation) return;

    setReleasedOrdersList(prev => [...prev, billId]);
    
    // Update local React state status
    const updated = orders.map(ord => {
      if (ord.billId === billId) {
        return { ...ord, status: '🔓 FUNDS RELEASED', canDisputeOrRelease: false };
      }
      return ord;
    });
    setOrders(updated);
    
    for (const o of ordersList) {
      await syncOrderStatus(o.orderId, '🔓 FUNDS RELEASED');
    }
  };

  // Action: Raise Quality Dispute / Reject Delivery
  const handleRaiseDispute = async (e) => {
    e.preventDefault();
    if (!disputeReason) return;
    
    setDisputedOrdersList(prev => [...prev, disputedOrderId]);
    
    // Update local React state status
    const updated = orders.map(ord => {
      if (ord.billId === disputedOrderId) {
        return { ...ord, status: '⚠️ VAULT DISPUTED / FROZEN', canDisputeOrRelease: false };
      }
      return ord;
    });
    setOrders(updated);
    
    const targetBillId = disputedOrderId;
    const group = orders.find(g => g.billId === targetBillId);
    setDisputedOrderId(null);
    setDisputeReason('');

    if (group && group.ordersList) {
      for (const o of group.ordersList) {
        await syncOrderStatus(o.orderId, '⚠️ VAULT DISPUTED / FROZEN');
      }
    }
  };

  return (
    <div className="orders-page">
      <BuyerHeader />

      {/* Breadcrumb */}
      <nav className="orders-breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/buyer/products">Buyer</Link>
        <span>/</span>
        <span style={{ color: '#1a1a1a' }}>My Locked Orders</span>
      </nav>

      {/* Container */}
      <main className="orders-container">
        <div className="orders-header-row">
          <div>
            <h1 className="orders-title">Escrow Vault Transactions</h1>
            <p className="orders-subtitle">
              Monitor and control your active escrow transactions. Capital is safely frozen inside military-grade vault holdings and will only be released to the merchant once you physically inspect and approve delivery status.
            </p>
          </div>
          <div className="orders-vault-stats-card">
            <div className="vault-stat-item">
              <span className="vault-stat-dot" style={{ backgroundColor: '#4169e1' }} />
              <div>
                <strong>Active Locks</strong>
                <span>{orders.filter(o => !o.status.includes('RELEASED') && !o.status.includes('DISPUTED')).length} Orders</span>
              </div>
            </div>
            <div className="vault-stat-item">
              <span className="vault-stat-dot" style={{ backgroundColor: '#10b981' }} />
              <div>
                <strong>Released</strong>
                <span>{orders.filter(o => o.status.includes('RELEASED')).length} Orders</span>
              </div>
            </div>
          </div>
        </div>

        {orders.length === 0 ? (
          /* Empty state */
          <div className="orders-empty-card">
            <div className="orders-empty-icon-wrap">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h2>No Transaction History Found</h2>
            <p>{"You haven't initiated any locked escrow orders yet. Fill your shopping cart with certified products and check out to start."}</p>
            <Link href="/buyer/products" className="orders-explore-btn">
              Start Shopping
            </Link>
          </div>
        ) : (
          /* Orders list */
          <div className="orders-list">
            {orders.map(ord => {
              const isDisputed = disputedOrdersList.includes(ord.billId) || ord.status.includes('DISPUTED') || ord.ordersList.some(o => o.sellerRejected);
              const isReleased = releasedOrdersList.includes(ord.billId) || ord.status.includes('RELEASED');
              const isLocked = !isDisputed && !isReleased;
              
              return (
                <div key={ord.billId} className={`order-card ${isDisputed ? 'order-card--disputed' : ''} ${isReleased ? 'order-card--released' : ''} ${isLocked ? 'order-card--locked' : ''}`}>
                  
                  {/* Card Header summary */}
                  <div className="order-card-header">
                    <div>
                      <span className="order-card-label">ESCROW LOCK BILL ID</span>
                      <Link href={`/buyer/track?id=${ord.billId}`} className="order-card-val" style={{ color: '#4169e1', textDecoration: 'underline' }}>
                        {ord.billId}
                      </Link>
                    </div>
                    <div>
                      <span className="order-card-label">DATE INITIATED</span>
                      <strong className="order-card-val">{ord.date}</strong>
                    </div>
                    <div>
                      <span className="order-card-label">VAULT CAPITAL</span>
                      <strong className="order-card-val" style={{ color: '#0f172a' }}>₹{ord.total.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="order-card-label">LOCK STATE</span>
                      <span className={`order-status-badge ${isDisputed ? 'badge-disputed' : ''} ${isReleased ? 'badge-released' : ''} ${isLocked ? 'badge-locked' : ''}`}>
                        {ord.status}
                      </span>
                    </div>
                  </div>

                  {/* List of ordered products inside */}
                  <div className="order-card-body">
                    <div className="order-card-items">
                      {ord.items.map((item, idx) => {
                        const isItemRejected = item._sellerRejected || (item._status && (item._status.includes('REJECTED') || item._status === '❌ Order Rejected by Seller'));
                        const isItemPending = !item._status || item._status === 'PENDING_APPROVAL';
                        const isItemConfirmed = !isItemRejected && item._status && ['APPROVED','DELIVERY_ASSIGNED','LABEL_GENERATED','READY_FOR_PICKUP','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','COMPLETED','✓ Delivery Confirmed by Seller','🔓 FUNDS RELEASED'].some(s => item._status.includes(s));
                        return (
                        <div key={idx} className="order-item-row" style={isItemRejected ? { opacity: 0.75, background: 'rgba(239,68,68,0.04)', borderRadius: '10px', padding: '2px 6px' } : {}}>
                          <img src={item.img} alt={item.name} className="order-item-img" style={isItemRejected ? { filter: 'grayscale(0.5)' } : {}} />
                          <div className="order-item-details">
                            <span className="order-item-brand">{item.brand}</span>
                            <h4 className="order-item-name">{item.name}</h4>
                            <span className="order-item-qty">Qty: <strong>{item.quantity}</strong></span>
                            {/* Per-item delivery status badge */}
                            {isItemRejected && (
                              <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.73rem', fontWeight: '700', color: '#ef4444', background: 'rgba(239,68,68,0.1)', borderRadius: '6px', padding: '3px 8px', width: 'fit-content' }}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                  Item Not Deliverable
                                </span>
                                {item._rejectionReason && (
                                  <span style={{ fontSize: '0.71rem', color: '#94a3b8', paddingLeft: '4px' }}>Reason: {item._rejectionReason}</span>
                                )}
                              </div>
                            )}
                            {isItemPending && !isItemRejected && (
                              <span style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.73rem', fontWeight: '700', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', borderRadius: '6px', padding: '3px 8px', width: 'fit-content' }}>
                                ⏳ Awaiting Seller Approval
                              </span>
                            )}
                            {isItemConfirmed && (
                              <span style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.73rem', fontWeight: '700', color: '#10b981', background: 'rgba(16,185,129,0.1)', borderRadius: '6px', padding: '3px 8px', width: 'fit-content' }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                Confirmed for Delivery
                              </span>
                            )}
                          </div>
                          <div className="order-item-price">
                            ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                          </div>
                        </div>
                        );
                      })}
                    </div>

                    {/* Delivery details if exist */}
                    {ord.deliveryAddress && (() => {
                      const totalDistance = ord.ordersList.reduce((sum, o) => sum + (o.distanceKm || 0), 0);
                      const totalDeliveryCharge = ord.ordersList.reduce((sum, o) => sum + (o.deliveryCharge || 0), 0);
                      return (
                        <div className="order-card-delivery">
                          <h4 className="delivery-card-title">🔐 Destination & Transit Guarantee</h4>
                          <div className="delivery-info-grid">
                            <div>
                              <span>Recipient</span>
                              <strong>{ord.deliveryAddress.fullName} ({ord.deliveryAddress.phone})</strong>
                            </div>
                            <div>
                              <span>Shipping Route</span>
                              <strong style={{ textTransform: 'capitalize' }}>Emahu EV Priority {ord.shippingSpeed || 'Express'} Speed</strong>
                            </div>
                            {totalDistance > 0 && (
                              <div>
                                <span>Calculated Distance</span>
                                <strong>{totalDistance.toFixed(2)} KM</strong>
                              </div>
                            )}
                            {totalDeliveryCharge > 0 && (
                              <div>
                                <span>Delivery Fee Paid</span>
                                <strong style={{ color: '#16a34a' }}>₹{totalDeliveryCharge}</strong>
                              </div>
                            )}
                            <div className="grid-full-width">
                              <span>Secured Address</span>
                              <strong>{ord.deliveryAddress.address}, {ord.deliveryAddress.city}, {ord.deliveryAddress.stateName} - {ord.deliveryAddress.pincode}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                        <div className="delivery-info-grid" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
                          <div className="grid-full-width">
                            <span>Handling Merchant(s)</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                              {Array.from(new Map(ord.items.map(item => {
                                const seller = item.seller || { name: item.brand || 'Emahu Seller', email: 'support@emahu.com', phone: '+91 99999 99999' };
                                return [seller.name + seller.phone, seller];
                              })).values()).map((seller, sIdx) => (
                                <div key={sIdx} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', alignItems: 'center', fontSize: '0.85rem' }}>
                                  <span style={{ color: '#0f172a', fontWeight: '600' }}>🚚 Your delivery is handled by this seller: {seller.name}</span>
                                  <span style={{ color: '#475569' }}>(Email: {seller.email})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                      </div>
                  </div>

                  {/* Escrow assurance operations */}
                  <div className="order-card-footer">
                    <div className="order-vault-info">
                      {isReleased ? (
                        <>
                          <svg className="footer-icon-released" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          </svg>
                          <span>Vault released successfully. Merchant has received the checkout funds. Transaction closed in full.</span>
                        </>
                      ) : (disputedOrdersList.includes(ord.billId) || ord.status.includes('DISPUTED')) ? (
                        <>
                          <svg className="footer-icon-disputed" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                          <span style={{ color: '#ef4444', fontWeight: '600' }}>Transaction disputed! Vault locked indefinitely. Funds will not be sent to seller until inspection dispute resolves.</span>
                        </>
                      ) : ord.allRejected ? (
                        <div style={{
                          width: '100%',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1.5px solid #ef4444',
                          borderRadius: '10px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          margin: '8px 0'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: '#ef4444',
                              color: '#fff',
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }}>✕</span>
                            <span style={{ color: '#991b1b', fontWeight: '800', fontSize: '0.9rem' }}>Order Rejected by Seller</span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#7f1d1d' }}>
                            All items in this order group were rejected. The escrow funds will be automatically returned to your wallet.
                          </div>
                          {ord.rejectedSubOrders?.[0]?.rejectionReason && (
                            <div style={{ fontSize: '0.75rem', color: '#7f1d1d', background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)' }}>
                              <strong>Reason:</strong> {ord.rejectedSubOrders[0].rejectionReason}
                            </div>
                          )}
                          <button
                            onClick={() => handleRetryOrder(ord)}
                            style={{
                              alignSelf: 'flex-start',
                              background: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 16px',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'background 0.2s'
                            }}
                          >
                            🔄 Retry Order
                          </button>
                        </div>
                      ) : ord.someRejected ? (
                        <div style={{
                          width: '100%',
                          background: 'rgba(245, 158, 11, 0.08)',
                          border: '1.5px solid #f59e0b',
                          borderRadius: '10px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          margin: '8px 0'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: '#f59e0b',
                              color: '#fff',
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }}>!</span>
                            <span style={{ color: '#78350f', fontWeight: '800', fontSize: '0.9rem' }}>Partial Rejection by Seller</span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#78350f' }}>
                            {ord.rejectedSubOrders?.length || 0} item group(s) are not deliverable. Funds for these rejected items will be refunded to your wallet. Other items are still in transit.
                          </div>
                          <button
                            onClick={() => handleRetryOrder(ord)}
                            style={{
                              alignSelf: 'flex-start',
                              background: '#f59e0b',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 16px',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'background 0.2s'
                            }}
                          >
                            🔄 Retry Rejected Items
                          </button>
                        </div>
                      ) : ord.ordersList.some(o => o.sellerConfirmed) ? (
                        <div style={{
                          width: '100%',
                          background: 'rgba(16, 185, 129, 0.08)',
                          border: '1.5px solid #10b981',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          margin: '8px 0'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: '#10b981',
                              color: '#fff',
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }}>✓</span>
                            <span style={{ color: '#065f46', fontWeight: '800', fontSize: '0.9rem' }}>Delivery Confirmed by Seller</span>
                          </div>
                          <span style={{ fontSize: '0.78rem', color: '#047857' }}>
                            Escrow Protected: Your money is safe in the vault. The seller cannot withdraw balance until you authorize release.
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', margin: '8px 0', border: '1px solid #cbd5e1', borderRadius: '10px', background: '#f8fafc' }}>
                          <svg className="footer-icon-locked" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4169e1" strokeWidth="2.5">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          <span style={{ fontSize: '0.8rem', color: '#475569' }}>Escrow Protected: Money remains inside safety vault. Seller cannot withdraw balance.</span>
                        </div>
                      )}
                    </div>

                    <div className="order-actions">
                      <Link href={`/buyer/track?id=${ord.billId}`} className="orders-btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', fontSize: '0.8rem', fontWeight: '750', textDecoration: 'none', border: '1.5px solid #cbd5e1', color: '#475569', borderRadius: '6px' }}>
                        🚛 Track Transit
                      </Link>
                      {!isReleased && !isDisputed && !ord.allRejected && ord.sellerConfirmed && (
                        <>
                          <button className="orders-btn-outline-danger" onClick={() => setDisputedOrderId(ord.billId)}>
                            ⚠️ Raise Dispute / Reject
                          </button>
                          <button className="orders-btn-success" onClick={() => handleReleaseFunds(ord.billId, ord.ordersList)}>
                            🔓 Release Vault to Merchant
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ─── RAISE QUALITY DISPUTE MODAL OVERLAY ─── */}
      {disputedOrderId && (
        <div className="orders-modal-overlay">
          <div className="orders-modal">
            <div className="dispute-modal-content">
              <div className="dispute-modal-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h2>Raise Quality Dispute / Reject Delivery</h2>
              <p>Locked order funds will be frozen inside the secure Escrow vault. Emahu arbitrates dispute verification, and the merchant will not receive payment until the product has been retrieved, evaluated, or replaced.</p>
              
              <form onSubmit={handleRaiseDispute}>
                <div className="dispute-form-group">
                  <label>Select Dispute Reason</label>
                  <select 
                    value={disputeReason} 
                    onChange={(e) => setDisputeReason(e.target.value)} 
                    required
                  >
                    <option value="">-- Select reason for quality rejection --</option>
                    <option value="fake">Authenticity Issue (Counterfeit item suspected)</option>
                    <option value="broken">Physical damage / Cracked screen / Tear in fabric</option>
                    <option value="missing">Incomplete parts / Missing items inside package</option>
                    <option value="wrong">Wrong product size or color shipped by merchant</option>
                  </select>
                </div>

                <div className="orders-modal-actions">
                  <button type="button" className="orders-btn-outline" onClick={() => setDisputedOrderId(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="orders-btn-danger">
                    Freeze Vault Funds Indefinitely
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
