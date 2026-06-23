'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './buyer_header.css';
import { logoutUser, clearAuthSession } from '@/utils/auth';

export default function BuyerHeader() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const profileDropdownRef = useRef(null);
  
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

  // Monitor scroll for subtle shadow under header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
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

  // Click outside listener to close profile dropdown & notif
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
    router.push('/');
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <header className={`bh-header ${scrolled ? 'bh-header--scrolled' : ''}`}>
        <div className="bh-header__container">
          
          {/* Left Side: Logo */}
          <Link href="/buyer/products" className="bh-logo" onClick={closeMobileMenu}>
            <div className="bh-logo__icon-wrap">
              <svg className="bh-logo__svg" width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="2.8" />
                <path d="M9 14l3.5 3.5 6.5-6.5" stroke="#12b7b2" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="bh-logo__text">EMAHU</span>
          </Link>

          {/* Right Side: Action Icons (desktop) */}
          <div className="bh-header__right">
            
            {/* Wishlist Icon */}
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

            {/* Cart Icon */}
            <Link href="/buyer/cart" className="bh-action-icon bh-action-icon--desktop" aria-label="Cart" style={{ position: 'relative' }}>
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

            {/* Notification Icon */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} ref={notifRef} className="bh-action-icon--desktop">
              <button 
                className="bh-action-icon" 
                onClick={() => { setIsNotifOpen(!isNotifOpen); handleMarkNotifsRead(); }}
                aria-label="Notifications" 
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
              </button>
              {isNotifOpen && (
                <div className="bh-notif-dropdown">
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
                </div>
              )}
            </div>

            {/* Login Action or Profile dropdown */}
            <div className="bh-profile bh-action-icon--desktop" ref={profileDropdownRef}>
              {isLoggedIn ? (
                <>
                  <button 
                    className="bh-profile__btn" 
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  >
                    <div className="bh-profile__avatar">
                      {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="bh-profile__name">{userProfile?.name?.split(' ')[0] || 'User'}</span>
                  </button>

                  {profileDropdownOpen && (
                    <div className="bh-profile__dropdown">
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
                    </div>
                  )}
                </>
              ) : (
                <Link href="/buyer/login" className="bh-login-btn">
                  Login
                </Link>
              )}
            </div>

            {/* Hamburger Button — Mobile Only */}
            <button
              className={`bh-hamburger ${mobileMenuOpen ? 'bh-hamburger--open' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
              id="bh-hamburger-btn"
            >
              <span className="bh-hamburger__line" />
              <span className="bh-hamburger__line" />
              <span className="bh-hamburger__line" />
            </button>

          </div>

        </div>
      </header>

      {/* ── Mobile Drawer Overlay ── */}
      {mobileMenuOpen && (
        <div className="bh-backdrop" onClick={closeMobileMenu} aria-hidden="true" />
      )}

      {/* ── Mobile Slide-Out Drawer ── */}
      <div className={`bh-mobile-drawer ${mobileMenuOpen ? 'bh-mobile-drawer--open' : ''}`} id="bh-mobile-drawer" aria-hidden={!mobileMenuOpen}>
        <div className="bh-mobile-drawer__header">
          <Link href="/buyer/products" className="bh-logo" onClick={closeMobileMenu}>
            <div className="bh-logo__icon-wrap">
              <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="2.8" />
                <path d="M9 14l3.5 3.5 6.5-6.5" stroke="#12b7b2" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
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
    </>
  );
}
