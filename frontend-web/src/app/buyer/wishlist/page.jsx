'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import BuyerHeader from '@/components/buyer_home/buyer_header';
import { logAnalyticsEvent } from '@/utils/analytics';
import './wishlist.css';

import API_BASE from '@/utils/config';
import { STATIC_PRODUCTS } from '@/utils/mockProducts';

function Stars({ rating }) {
  return (
    <div className="wl-stars">
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} className={`wl-star ${s <= Math.round(rating) ? '' : 'wl-star--empty'}`} viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function WishlistPage() {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [cartAdded, setCartAdded] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);

  // Load wishlist from localStorage and backend
  const loadWishlistData = useCallback(async () => {
    try {
      let formattedList = [];
      try {
        const res = await fetch(`${API_BASE}/api/products`);
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
              verified: true,
              isNew: true,
              isHot: false,
              onSale: p.comparePrice ? (p.price < p.comparePrice) : false
            };
          });
        }
      } catch (fetchErr) {
        console.warn('Backend offline, loading wishlist from local storage fallback:', fetchErr);
      }

      // Combine database products with static mock products
      const allProducts = [...formattedList, ...STATIC_PRODUCTS];
      const seen = new Set();
      const uniqueProducts = allProducts.filter(p => {
        const pid = p.id.toString();
        if (seen.has(pid)) return false;
        seen.add(pid);
        return true;
      });

      setAvailableProducts(uniqueProducts);

      const storedWish = localStorage.getItem('emahu_wishlist');
      if (storedWish) {
        const ids = JSON.parse(storedWish).map(id => id.toString());
        // Map ids to matching product objects
        const matched = uniqueProducts.filter(p => ids.includes(p.id.toString()));
        setWishlistItems(matched);

        if (matched.length < ids.length) {
          localStorage.setItem('emahu_wishlist', JSON.stringify(matched.map(p => p.id)));
          window.dispatchEvent(new Event('storage'));
        }
      }

      const storedCart = localStorage.getItem('emahu_cart');
      if (storedCart) {
        const parsed = JSON.parse(storedCart);
        setCartAdded(parsed.map(x => typeof x === 'object' ? x.id : x));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadWishlistData();
  }, [loadWishlistData]);

  // Remove single item from wishlist
  const removeFromWishlist = (id) => {
    const nextList = wishlistItems.filter(p => p.id !== id);
    setWishlistItems(nextList);
    try {
      localStorage.setItem('emahu_wishlist', JSON.stringify(nextList.map(p => p.id)));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(e);
    }
  };

  // Suggestions for wishlist when there is exactly 1 item in wishlist
  const wishlistSuggestions = useMemo(() => {
    if (wishlistItems.length !== 1 || !availableProducts.length) return [];
    const wishItem = wishlistItems[0];
    const wishItemId = wishItem.id.toString();

    const cleanAvailable = availableProducts.filter(p => p.id.toString() !== wishItemId);
    const sameCat = cleanAvailable.filter(p => p.category === wishItem.category);
    const otherCat = cleanAvailable.filter(p => p.category !== wishItem.category);

    const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

    const combined = [...shuffle(sameCat), ...shuffle(otherCat)];
    return combined.slice(0, 3);
  }, [wishlistItems, availableProducts]);

  const handleAddSuggestionToWishlist = (suggestedProduct) => {
    try {
      const storedWish = localStorage.getItem('emahu_wishlist') || '[]';
      const parsed = JSON.parse(storedWish);
      const sId = suggestedProduct.id || suggestedProduct._id;

      if (!parsed.includes(sId)) {
        parsed.push(sId);
        localStorage.setItem('emahu_wishlist', JSON.stringify(parsed));
        window.dispatchEvent(new Event('storage'));
        loadWishlistData();
      }
    } catch (err) {
      console.error('Failed to add suggestion to wishlist:', err);
    }
  };

  // Clear entire wishlist
  const clearAllWishlist = () => {
    setWishlistItems([]);
    try {
      localStorage.setItem('emahu_wishlist', JSON.stringify([]));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(e);
    }
  };

  // Add to cart directly from Wishlist
  const handleAddToCart = (e, p) => {
    e.preventDefault();
    if (cartAdded.includes(p.id)) return;

    setCartAdded(prev => [...prev, p.id]);

    try {
      const storedCartStr = localStorage.getItem('emahu_cart') || '[]';
      const storedCart = JSON.parse(storedCartStr);
      if (!storedCart.some(x => (typeof x === 'object' ? x.id : x) === p.id)) {
        storedCart.push({ id: p.id, quantity: 1, color: 'Default', size: 'Default' });
        localStorage.setItem('emahu_cart', JSON.stringify(storedCart));
        window.dispatchEvent(new Event('storage'));

        // Log analytics event
        logAnalyticsEvent({
          type: 'add_to_cart',
          productId: p.id,
          sellerId: p.seller?._id || p.seller?.id || p.seller
        });
      }
    } catch (err) {
      console.error(err);
    }

    setTimeout(() => {
      setCartAdded(prev => prev.filter(x => x !== p.id));
    }, 2000);
  };

  // Move all wishlist items to cart
  const moveAllToCart = () => {
    if (wishlistItems.length === 0) return;

    try {
      const storedCartStr = localStorage.getItem('emahu_cart') || '[]';
      const storedCart = JSON.parse(storedCartStr);

      wishlistItems.forEach(p => {
        if (!storedCart.some(x => (typeof x === 'object' ? x.id : x) === p.id)) {
          storedCart.push({ id: p.id, quantity: 1, color: 'Default', size: 'Default' });

          // Log analytics event
          logAnalyticsEvent({
            type: 'add_to_cart',
            productId: p.id,
            sellerId: p.seller?._id || p.seller?.id || p.seller
          });
        }
      });

      localStorage.setItem('emahu_cart', JSON.stringify(storedCart));
      setWishlistItems([]);
      localStorage.setItem('emahu_wishlist', JSON.stringify([]));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="wl-page">
      <BuyerHeader />

      {/* Breadcrumb */}
      <nav className="wl-breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/buyer/products">Buyer</Link>
        <span>/</span>
        <span style={{ color: '#1a1a1a' }}>My Wishlist</span>
      </nav>

      {/* Main Body */}
      <main className="wl-container">

        {/* Header Summary */}
        <div className="wl-header">
          <div>
            <h1 className="wl-title">Your Saved Drops</h1>
            <p className="wl-subtitle">
              {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved for quick-lock authenticity check checkout.
            </p>
          </div>

          {wishlistItems.length > 0 && (
            <div className="wl-header-actions">
              <button className="wl-btn-outline" onClick={clearAllWishlist}>
                Clear Wishlist
              </button>
              <button className="wl-btn-solid" onClick={moveAllToCart}>
                Move All to Cart
              </button>
            </div>
          )}
        </div>

        {/* Wishlist Grid or Empty state */}
        {wishlistItems.length === 0 ? (
          <div className="wl-empty-card">
            <div className="wl-empty-icon-wrap">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h2>Your wishlist is completely empty</h2>
            <p>Save premium laptops, verified sneakers, or dining essentials while exploring the collections.</p>
            <Link href="/buyer/products" className="wl-explore-btn">
              Explore Premium Catalog
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div className="wl-grid">
              {wishlistItems.map(p => (
                <div key={p.id} className="wl-card">

                  {/* Image Wrap */}
                  <div className="wl-card__img-wrap">
                    <img src={p.img} alt={p.name} className="wl-card__img" loading="lazy" />

                    {/* Category Chip */}
                    <span className="wl-card__cat-chip">{p.category}</span>

                    {/* Stock Tag */}
                    <span className="wl-card__stock-tag">IN STOCK</span>

                    {/* Remove Button */}
                    <button
                      className="wl-card__remove"
                      onClick={() => removeFromWishlist(p.id)}
                      aria-label="Remove item"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  {/* Body Details */}
                  <div className="wl-card__body">
                    <span className="wl-card__brand">{p.brand}</span>
                    <h3 className="wl-card__name">
                      <Link href={`/buyer/products/${p.id}`}>{p.name}</Link>
                    </h3>

                    <div className="wl-card__rating-row">
                      <Stars rating={p.rating} />
                      <span>({p.reviews})</span>
                    </div>

                    <div className="wl-card__price-row">
                      <strong className="wl-card__price">₹{p.price.toLocaleString('en-IN')}</strong>
                      {p.onSale && (
                        <>
                          <span className="wl-card__original">₹{p.original.toLocaleString('en-IN')}</span>
                          <span className="wl-card__discount">-{p.discount}% OFF</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action CTA Footer */}
                  <div className="wl-card__footer">
                    <button
                      className={`wl-card__add-btn ${cartAdded.includes(p.id) ? 'wl-card__add-btn--added' : ''}`}
                      onClick={(e) => handleAddToCart(e, p)}
                    >
                      {cartAdded.includes(p.id) ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>✓ Added to Cart!</span>
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <path d="M16 10a4 4 0 0 1-8 0" />
                          </svg>
                          <span>Add to Cart</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              ))}
            </div>

            {/* Cross-selling suggestions for wishlist page (shows only when 1 item is saved) */}
            {wishlistSuggestions.length > 0 && (
              <div style={{ marginTop: '16px', background: '#fafafa', border: '1px dashed #cbd5e1', borderRadius: '16px', padding: '24px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.84rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🔥 Complete Your Wishlist
                </h4>
                <p style={{ margin: '0 0 18px 0', fontSize: '0.78rem', color: '#64748b', lineHeight: '1.4' }}>
                  Add these highly matching verified items to your wishlist drops!
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                  {wishlistSuggestions.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', marginBottom: '12px' }}>
                          <img src={s.image || s.img} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '750' }}>{s.brand}</p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', fontWeight: '700', color: '#0f172a', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', height: '38px', lineHeight: '1.2' }}>{s.name}</p>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '850', color: '#4169e1' }}>₹{s.price.toLocaleString('en-IN')}</span>
                        <button
                          type="button"
                          onClick={() => handleAddSuggestionToWishlist(s)}
                          style={{
                            background: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '0.74rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          + Add to Wishlist
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
