'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import BuyerHeader from '@/components/buyer_home/buyer_header';
import './cart.css';

const ALL_PRODUCTS = [];

export default function CartPage() {
  const [cartItems, setCartItems] = useState([]);
  const [checkoutStep, setCheckoutStep] = useState('idle'); // idle | securing | success
  const [removingId, setRemovingId] = useState(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [transactionCode, setTransactionCode] = useState('');
  
  // Load Cart items on mount
  useEffect(() => {
    const loadCartAndProducts = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products`);
        const data = await res.json();
        let formattedList = [];
        if (data.success) {
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
              verified: true,
              isNew: true,
              isHot: false,
              onSale: p.comparePrice ? (p.price < p.comparePrice) : false,
              seller: p.seller
            };
          });
        }

        const storedCart = localStorage.getItem('emahu_cart');
        if (storedCart) {
          const parsed = JSON.parse(storedCart);
          // parsed: [{ id, quantity, color, size }]
          const matched = [];
          let hasStale = false;
          
          parsed.forEach(cItem => {
            const cItemId = typeof cItem === 'object' ? cItem.id : cItem;
            const prod = formattedList.find(p => p.id.toString() === cItemId.toString());
            if (prod) {
              matched.push({
                ...prod,
                quantity: cItem.quantity || 1,
                selectedColor: cItem.color || 'Premium Black',
                selectedSize: cItem.size || 'Regular'
              });
            } else {
              hasStale = true;
            }
          });
          
          setCartItems(matched);
          
          if (hasStale) {
            const saveList = matched.map(p => ({
              id: p.id,
              quantity: p.quantity,
              color: p.selectedColor,
              size: p.selectedSize
            }));
            localStorage.setItem('emahu_cart', JSON.stringify(saveList));
            window.dispatchEvent(new Event('storage'));
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadCartAndProducts();
  }, []);

  // Save changes to localStorage helper
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

  // Adjust item quantity
  const handleQuantityChange = (id, delta) => {
    const nextList = cartItems.map(p => {
      if (p.id === id) {
        const newQty = Math.max(1, p.quantity + delta);
        return { ...p, quantity: newQty };
      }
      return p;
    });
    setCartItems(nextList);
    saveCartToStorage(nextList);
  };

  // Remove single item from Cart with premium delay
  const handleRemove = (id) => {
    setRemovingId(id);
    setTimeout(() => {
      const nextList = cartItems.filter(p => p.id !== id);
      setCartItems(nextList);
      saveCartToStorage(nextList);
      setRemovingId(null);
    }, 380);
  };

  // Clear entire Cart with pro-level animations
  const handleClearCart = () => {
    setIsClearingAll(true);
    setTimeout(() => {
      setCartItems([]);
      localStorage.setItem('emahu_cart', JSON.stringify([]));
      window.dispatchEvent(new Event('storage'));
      setIsClearingAll(false);
    }, 380);
  };

  // Recalculate totals
  const subtotal = cartItems.reduce((acc, p) => acc + (p.price * p.quantity), 0);
  const shippingFee = subtotal === 0 ? 0 : 99;
  const taxAmount = Math.round(subtotal * 0.18); // 18% CGST/SGST
  const grandTotal = subtotal + shippingFee + taxAmount;

  // Checkout sequence triggered
  const handleSecureCheckout = () => {
    if (cartItems.length === 0) return;
    
    // Step 1: Secure vault locking animation
    setCheckoutStep('securing');
    
    setTimeout(() => {
      // Step 2: Completed Escrow Locked Success
      const placedCodes = [];
      
      // Save order in orders history in localStorage
      try {
        const storedOrdersStr = localStorage.getItem('emahu_orders') || '[]';
        const storedOrders = JSON.parse(storedOrdersStr);
        
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
        cartItems.forEach((item) => {
          const generatedCode = `EMH_${Math.floor(100000 + Math.random() * 900000)}`;
          placedCodes.push(generatedCode);
          
          const subtotal = item.price * item.quantity;
          const shippingFee = subtotal === 0 ? 0 : 99;
          const taxAmount = Math.round(subtotal * 0.18);
          const grandTotalItem = subtotal + shippingFee + taxAmount;
          
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
            billId: billId,
            sellerId: sellerId,
            sellerEmail: sellerEmail,
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
            status: 'PENDING_APPROVAL',
            timeline: [
              { status: 'PENDING_APPROVAL', label: 'Payment Completed', desc: '⏳ Waiting for Seller Approval', date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }
            ],
            deliveryAddress: {
              fullName: 'Guest Customer',
              phone: '+91 99999 99999',
              email: 'guest@emahu.com',
              address: 'Emahu Hub Office',
              city: 'Delhi',
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

      // Step 3: Clear Cart
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
                    <img src={p.img} alt={p.name} className="cart-item-row__img" />
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
                    {p.verified && (
                      <span className="cart-item-row__verified">
                        🛡️ 100% EMAHU Hub Verified
                      </span>
                    )}
                  </div>

                  {/* Quantity controls */}
                  <div className="cart-item-row__qty">
                    <span className="cart-qty-label">QTY</span>
                    <div className="cart-qty-controls">
                      <button onClick={() => handleQuantityChange(p.id, -1)} aria-label="Decrease Qty">
                        −
                      </button>
                      <span>{p.quantity}</span>
                      <button onClick={() => handleQuantityChange(p.id, 1)} aria-label="Increase Qty">
                        +
                      </button>
                    </div>
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
              
              <div className="cart-summary-rows">
                <div className="cart-summary-row">
                  <span>Subtotal ({cartItems.reduce((acc, p) => acc + p.quantity, 0)} items)</span>
                  <strong>₹{subtotal.toLocaleString('en-IN')}</strong>
                </div>

                <div className="cart-summary-row">
                  <span>Certified Inspection & Transit Shipping</span>
                  <strong>
                    {shippingFee === 0 ? (
                      <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: '800' }}>🚚 FREE SHIPPING</span>
                    ) : (
                      `₹${shippingFee}`
                    )}
                  </strong>
                </div>

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
