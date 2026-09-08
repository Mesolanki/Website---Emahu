'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './buyer_header.css';
import { logoutUser, clearAuthSession } from '@/utils/auth';
import { motion, AnimatePresence } from 'framer-motion';
import BuyerLocationModal from './BuyerLocationModal';
import { detectLocationWithGPS } from '@/utils/location';


export default function BuyerHeader() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);

  const profileDropdownRef = useRef(null);
  const lastScrollY = useRef(0);

  const [selectedCity, setSelectedCity] = useState('Ahmedabad');
  const [buyerLocation, setBuyerLocation] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const [cartCount, setCartCount] = useState(0);
  const [wishCount, setWishCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // Sync count states on mount & storage changes
  useEffect(() => {
    const loadNotifs = () => {
      try {
        const stored = localStorage.getItem('emahu_notifications');
        if (stored) {
          const parsed = JSON.parse(stored);
          setNotifications(parsed.filter(n => n.role === 'buyer'));
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadNotifs();
    window.addEventListener('storage', loadNotifs);
    return () => window.removeEventListener('storage', loadNotifs);
  }, []);

  const handleMarkNotifsRead = () => {
    try {
      const stored = localStorage.getItem('emahu_notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        const updated = parsed.map(n => n.role === 'buyer' ? { ...n, read: true } : n);
        localStorage.setItem('emahu_notifications', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const updateCounts = () => {
      try {
        const storedCart = localStorage.getItem('emahu_cart');
        if (storedCart) {
          const parsed = JSON.parse(storedCart);
          setCartCount(parsed.length);
        } else {
          setCartCount(0);
        }

        const storedWish = localStorage.getItem('emahu_wishlist');
        if (storedWish) {
          const parsed = JSON.parse(storedWish);
          setWishCount(parsed.length);
        } else {
          setWishCount(0);
        }
      } catch (e) {
        console.error(e);
      }
    };

    updateCounts();
    window.addEventListener('storage', updateCounts);
    return () => window.removeEventListener('storage', updateCounts);
  }, []);

  // Monitor scroll — scrolled state + hide/show navbar
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const diff = currentScrollY - lastScrollY.current;

          setScrolled(currentScrollY > 20);

          // Hide when scrolling down > 80px from top, show when scrolling up
          if (currentScrollY > 80) {
            if (diff > 4) {
              setHeaderVisible(false);
            } else if (diff < -4) {
              setHeaderVisible(true);
            }
          } else {
            setHeaderVisible(true);
          }

          lastScrollY.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check login state from localStorage
  useEffect(() => {
    const checkLogin = () => {
      const loggedIn = localStorage.getItem('emahu_buyer_logged_in') === 'true' ||
        localStorage.getItem('emahu_buyer_registered') === 'true';
      setIsLoggedIn(loggedIn);

      const userData = localStorage.getItem('emahu_buyer_user');
      if (userData) {
        try {
          setUserProfile(JSON.parse(userData));
        } catch (e) {
          setUserProfile({ name: 'Buyer User' });
        }
      }
    };
    checkLogin();
    window.addEventListener('storage', checkLogin);
    return () => window.removeEventListener('storage', checkLogin);
  }, []);

  // Sync Buyer Location from localStorage and custom events
  useEffect(() => {
    const syncLocation = () => {
      try {
        const storedLoc = localStorage.getItem('emahu_buyer_location');
        if (storedLoc) {
          const parsed = JSON.parse(storedLoc);
          if (parsed && parsed.address) {
            setBuyerLocation(parsed);
            if (parsed.city) setSelectedCity(parsed.city);
            return;
          }
        }

        const storedCity = localStorage.getItem('emahu_buyer_city');
        if (storedCity) {
          setSelectedCity(storedCity);
        }
      } catch (e) {
        console.error('Location sync error:', e);
      }
    };

    syncLocation();

    // Automatically trigger browser's native location permission prompt on entry
    if (typeof window !== 'undefined' && navigator.geolocation) {
      detectLocationWithGPS()
        .then((loc) => {
          if (loc) {
            setBuyerLocation(loc);
            if (loc.city) setSelectedCity(loc.city);
          }
        })
        .catch((err) => {
          console.log('GPS prompt dismissed or denied in header:', err?.message || err);
        });
    }


    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };

    const handleCustomLocChange = (e) => {
      if (e.detail) {
        setBuyerLocation(e.detail);
        if (e.detail.city) setSelectedCity(e.detail.city);
      }
    };

    window.addEventListener('storage', syncLocation);
    window.addEventListener('emahu_location_changed', handleCustomLocChange);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('storage', syncLocation);
      window.removeEventListener('emahu_location_changed', handleCustomLocChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Failed to log out from server:', err);
    }
    clearAuthSession('buyer');
    setIsLoggedIn(false);
    setUserProfile(null);
    setCartCount(0);
    setWishCount(0);
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
    router.push('/');
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      {/* Animated header — fade in on load, hide/show on scroll */}
      <motion.header
        className={`bh-header ${scrolled ? 'bh-header--scrolled' : ''}`}
        initial={{ y: -80, opacity: 0 }}
        animate={{
          y: headerVisible ? 0 : -80,
          opacity: headerVisible ? 1 : 0,
        }}
        transition={{
          duration: 0.4,
          ease: [0.16, 1, 0.3, 1],
        }}
        // Override initial animation after first mount
        style={{ willChange: 'transform, opacity' }}
      >
        <div className="bh-header__container">

          {/* Left Side: Logo & Location Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Link href="/buyer/products" className="bh-logo" onClick={closeMobileMenu}>
              <div className="bh-logo__icon-wrap">
                <svg className="bh-logo__svg" width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="10" fill="#4169e1" />
                  <path d="M8 12h16M8 16h12M8 20h14" stroke="white" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
              <span className="bh-logo__text">EMAHU</span>
            </Link>

            {/* Location Selector Pill */}
            <motion.button
              type="button"
              className="bh-loc-pill bh-action-icon--desktop"
              onClick={() => setIsLocationModalOpen(true)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(65, 105, 225, 0.08)',
                border: '1px solid rgba(65, 105, 225, 0.22)',
                borderRadius: '20px',
                padding: '5px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#1e293b',
                cursor: 'pointer',
                maxWidth: '220px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transition: 'all 0.15s ease'
              }}
              title="Click to search and change location"
            >
              <span style={{ color: '#4169e1', fontSize: '0.9rem' }}>📍</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                {buyerLocation?.displayArea || buyerLocation?.area || (buyerLocation?.address ? buyerLocation.address.split(',')[0] : '') || (selectedCity && selectedCity !== 'Ahmedabad' ? selectedCity : '') || 'Enable Location'}
              </span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
            </motion.button>


          </div>




          {/* Right Side: Action Icons (desktop) */}
          <div className="bh-header__right">

            {/* Wishlist Icon */}
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.93 }} transition={{ duration: 0.18 }}>
              <Link href="/buyer/wishlist" className="bh-action-icon bh-action-icon--desktop" aria-label="Wishlist" style={{ position: 'relative' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {wishCount > 0 && (
                  <span className="bh-action-icon__badge">
                    {wishCount}
                  </span>
                )}
              </Link>
            </motion.div>

            {/* Cart Icon */}
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.93 }} transition={{ duration: 0.18 }}>
              <Link href="/buyer/cart" className="bh-action-icon bh-action-icon--cart" aria-label="Cart" style={{ position: 'relative' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                {cartCount > 0 && (
                  <span className="bh-action-icon__badge bh-action-icon__badge--cart">
                    {cartCount}
                  </span>
                )}
              </Link>
            </motion.div>

            {/* Notification Icon */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} ref={notifRef} className="bh-action-icon--desktop">
              <motion.button
                className="bh-action-icon"
                onClick={() => { setIsNotifOpen(!isNotifOpen); handleMarkNotifsRead(); }}
                aria-label="Notifications"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.93 }}
                transition={{ duration: 0.18 }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', position: 'relative' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {notifications.some(n => !n.read) && (
                  <span className="bh-action-icon__badge" style={{ backgroundColor: '#ef4444' }}>
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </motion.button>
              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div
                    className="bh-notif-dropdown"
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="bh-notif-dropdown__header">
                      <strong>Notifications</strong>
                      <button
                        onClick={() => {
                          try {
                            const stored = localStorage.getItem('emahu_notifications') || '[]';
                            const parsed = JSON.parse(stored);
                            const updated = parsed.filter(n => n.role !== 'buyer');
                            localStorage.setItem('emahu_notifications', JSON.stringify(updated));
                            window.dispatchEvent(new Event('storage'));
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        className="bh-notif-dropdown__clear"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="bh-notif-dropdown__body">
                      {notifications.length === 0 ? (
                        <div className="bh-notif-dropdown__empty">No notifications yet</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className="bh-notif-dropdown__item" style={{ backgroundColor: n.read ? 'transparent' : '#f8fafc' }}>
                            <div className="bh-notif-dropdown__item-row">
                              <span className="bh-notif-dropdown__item-title">{n.title}</span>
                              <span className="bh-notif-dropdown__item-date">{n.date}</span>
                            </div>
                            <p className="bh-notif-dropdown__item-msg">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Login Action or Profile dropdown */}
            <div className="bh-profile bh-action-icon--desktop" ref={profileDropdownRef}>
              {isLoggedIn ? (
                <>
                  <motion.button
                    className="bh-profile__btn"
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="bh-profile__avatar">
                      {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="bh-profile__name">{userProfile?.name?.split(' ')[0] || 'User'}</span>
                  </motion.button>

                  <AnimatePresence>
                    {profileDropdownOpen && (
                      <motion.div
                        className="bh-profile__dropdown"
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div className="bh-profile__dropdown-header">
                          <strong>{userProfile?.name || 'Buyer User'}</strong>
                          <span>{userProfile?.email}</span>
                        </div>
                        <div className="bh-profile__dropdown-divider" />
                        <Link href="/buyer/orders" className="bh-profile__dropdown-item" onClick={() => setProfileDropdownOpen(false)}>
                          📦 My Orders
                        </Link>
                        <Link href="/buyer/wishlist" className="bh-profile__dropdown-item" onClick={() => setProfileDropdownOpen(false)}>
                          ❤️ My Wishlist
                        </Link>
                        <Link href="/buyer/settings" className="bh-profile__dropdown-item" onClick={() => setProfileDropdownOpen(false)}>
                          ⚙️ Profile Settings
                        </Link>
                        <div className="bh-profile__dropdown-divider" />
                        <button onClick={handleSignOut} className="bh-profile__dropdown-item bh-profile__dropdown-item--logout">
                          🚪 Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} transition={{ duration: 0.18 }}>
                  <Link href="/buyer/login" className="bh-login-btn">
                    Login
                  </Link>
                </motion.div>
              )}
            </div>

            {/* Hamburger Button — Mobile Only */}
            <motion.button
              className={`bh-hamburger ${mobileMenuOpen ? 'bh-hamburger--open' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
              id="bh-hamburger-btn"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.15 }}
            >
              <span className="bh-hamburger__line" />
              <span className="bh-hamburger__line" />
              <span className="bh-hamburger__line" />
            </motion.button>

          </div>

        </div>
      </motion.header>

      {/* ── Mobile Drawer Overlay ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="bh-backdrop"
            onClick={closeMobileMenu}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        )}
      </AnimatePresence>

      {/* ── Mobile Slide-Out Drawer ── */}
      <div className={`bh-mobile-drawer ${mobileMenuOpen ? 'bh-mobile-drawer--open' : ''}`} id="bh-mobile-drawer" aria-hidden={!mobileMenuOpen}>
        <div className="bh-mobile-drawer__header">
          <Link href="/buyer/products" className="bh-logo" onClick={closeMobileMenu}>
            <div className="bh-logo__icon-wrap">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="10" fill="#4169e1" />
                <path d="M8 12h16M8 16h12M8 20h14" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <span className="bh-logo__text">EMAHU</span>
          </Link>
          <button className="bh-mobile-drawer__close" onClick={closeMobileMenu} aria-label="Close menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User info strip if logged in */}
        {isLoggedIn && userProfile && (
          <div className="bh-mobile-drawer__user">
            <div className="bh-profile__avatar bh-profile__avatar--lg">
              {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div className="bh-mobile-drawer__user-name">{userProfile?.name || 'User'}</div>
              <div className="bh-mobile-drawer__user-email">{userProfile?.email || ''}</div>
            </div>
          </div>
        )}



        {/* Quick action badges */}
        <div className="bh-mobile-drawer__quick-actions">
          <Link href="/buyer/wishlist" className="bh-mobile-drawer__quick-btn" onClick={closeMobileMenu}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span>Wishlist</span>
            {wishCount > 0 && <span className="bh-mobile-drawer__badge">{wishCount}</span>}
          </Link>
          <Link href="/buyer/cart" className="bh-mobile-drawer__quick-btn" onClick={closeMobileMenu}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span>Cart</span>
            {cartCount > 0 && <span className="bh-mobile-drawer__badge bh-mobile-drawer__badge--cart">{cartCount}</span>}
          </Link>
        </div>

        {/* Location selector in Mobile Drawer */}
        <div style={{ padding: '0 20px 12px' }}>
          <button
            type="button"
            onClick={() => {
              closeMobileMenu();
              setIsLocationModalOpen(true);
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '10px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              color: '#1e293b',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <span>📍</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {buyerLocation?.address ? buyerLocation.address.split(',')[0] : (selectedCity || 'Ahmedabad')}
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#4169e1', fontWeight: 700 }}>Change</span>
          </button>
        </div>

        {/* Nav Links */}
        <nav className="bh-mobile-drawer__nav">
          <Link href="/buyer/products" className="bh-mobile-drawer__link" onClick={closeMobileMenu}>
            <span>🛍️</span> Browse Products
          </Link>
          <Link href="/buyer/orders" className="bh-mobile-drawer__link" onClick={closeMobileMenu}>
            <span>📦</span> My Orders
          </Link>
          <Link href="/buyer/wishlist" className="bh-mobile-drawer__link" onClick={closeMobileMenu}>
            <span>❤️</span> My Wishlist
          </Link>
          <Link href="/buyer/settings" className="bh-mobile-drawer__link" onClick={closeMobileMenu}>
            <span>⚙️</span> Profile Settings
          </Link>
          {isLoggedIn && (
            <button onClick={handleSignOut} className="bh-mobile-drawer__link bh-mobile-drawer__link--logout" style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}>
              <span>🚪</span> Logout
            </button>
          )}
        </nav>

        {/* Auth buttons at bottom */}
        <div className="bh-mobile-drawer__footer">
          {isLoggedIn ? (
            <button onClick={handleSignOut} className="bh-mobile-drawer__signout">
              🚪 Sign Out
            </button>
          ) : (
            <Link href="/buyer/login" className="bh-login-btn bh-login-btn--full" onClick={closeMobileMenu}>
              Login to Your Account
            </Link>
          )}
        </div>
      </div>

      {/* Buyer Location Search & Selection Modal */}
      <BuyerLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onLocationSelect={(loc) => {
          setBuyerLocation(loc);
          if (loc.city) setSelectedCity(loc.city);
        }}
      />
    </>
  );
}
