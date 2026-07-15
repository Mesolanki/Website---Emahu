'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import './seller_header.css';

/**
 * Announcement bar alerts for the seller hub.
 */
const announcements = [
  '🎉 Zero Commission for your first 3 months — Limited time offer!',
  '🚀 500+ Cities covered with free doorstep pickup',
  '⚡ Get paid within 48 hours of delivery — guaranteed',
  '📦 List unlimited products for FREE — No setup charges',
];

/**
 * Navigation items structure with mega dropdown links and icons.
 */
const navItems = [
  {
    label: 'How It Works',
    href: '#how-it-works',
    dropdown: [
      { icon: '📝', title: 'Register & List', desc: 'Create your seller account in minutes', href: '#register' },
      { icon: '📦', title: 'Pack & Handover', desc: 'We pick up from your doorstep', href: '#handover' },
      { icon: '💰', title: 'Get Paid', desc: 'Receive payment in 48 hours', href: '#payout' },
    ],
  },
  {
    label: 'Pricing & Fees',
    href: '#pricing',
    dropdown: [
      { icon: '🆓', title: 'Zero Commission', desc: '0% commission, always', href: '#zero-commission' },
      { icon: '💳', title: 'Shipping Charges', desc: 'Transparent flat-rate shipping', href: '#shipping-rates' },
      { icon: '📊', title: 'Compare Plans', desc: 'Find the right plan for you', href: '#compare-plans' },
    ],
  },
  { label: 'Support', href: '#support', dropdown: null },
];

/**
 * SellerHeader Component
 * A high-end, responsive, glassmorphic header with scroll-progress, Mega dropdowns,
 * custom search animations, accessibility attributes, and flawless mobile adaptation.
 */
export default function SellerHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const dropdownTimeout = useRef(null);
  const searchRef = useRef(null);

  // Monitor scroll for glassmorphism and progress bar updates
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      setScrolled(scrollY > 20);
      setScrollProgress(docH > 0 ? (scrollY / docH) * 100 : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Announcement ticker with clean fade state transition
  useEffect(() => {
    const interval = setInterval(() => {
      setAnnouncementVisible(false);
      setTimeout(() => {
        setAnnouncementIndex((prevIndex) => (prevIndex + 1) % announcements.length);
        setAnnouncementVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Close search and active dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Safe dropdown mouse hover enter
  const handleDropdownEnter = (label) => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    setActiveDropdown(label);
  };

  // Safe dropdown mouse hover leave with short delay
  const handleDropdownLeave = () => {
    dropdownTimeout.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  // Toggle dropdown on click/tap (excellent for accessibility & touch screens)
  const handleDropdownToggle = (e, item) => {
    if (item.dropdown) {
      e.preventDefault();
      setActiveDropdown(activeDropdown === item.label ? null : item.label);
    }
  };

  return (
    <>
      {/* ── Announcement Bar ── */}
      <div className="sh-announce" id="seller-announce-bar" role="status" aria-live="polite">
        <div className="sh-announce__inner">
          <span className="sh-announce__dot" aria-hidden="true" />
          <p className={`sh-announce__text ${announcementVisible ? 'sh-announce__text--visible' : ''}`}>
            {announcements[announcementIndex]}
          </p>
          <Link href="/seller/register" className="sh-announce__cta">
            Claim Now →
          </Link>
        </div>
      </div>

      {/* ── Main Sticky Header ── */}
      <header 
        className={`sh-header ${scrolled ? 'sh-header--scrolled' : ''} ${menuOpen ? 'sh-header--menu-open' : ''}`} 
        id="seller-main-header"
      >
        {/* Top Scroll Indicator */}
        <div 
          className="sh-progress" 
          style={{ width: `${scrollProgress}%` }} 
          role="progressbar" 
          aria-valuenow={scrollProgress} 
          aria-valuemin="0" 
          aria-valuemax="100" 
        />

        <div className="sh-header__container">
          
          {/* Logo Brand Block */}
          <Link href="/" className="sh-logo" id="sh-logo-link">
            <div className="sh-logo__icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="EMAHU Logo">
                <rect width="32" height="32" rx="10" fill="#4169e1" />
                <path d="M8 12h16M8 16h12M8 20h14" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <div className="sh-logo__icon-glow" />
            </div>
            <div className="sh-logo__text">
              <span className="sh-logo__brand">EMAHU</span>
              <span className="sh-logo__tag">Seller Hub</span>
            </div>
          </Link>

          {/* ── Centered Desktop Navigation ── */}
          <nav className="sh-nav" aria-label="Desktop primary navigation">
            {navItems.map((item) => (
              <div
                key={item.label}
                className={`sh-nav__item ${activeDropdown === item.label ? 'sh-nav__item--active' : ''}`}
                onMouseEnter={() => item.dropdown && handleDropdownEnter(item.label)}
                onMouseLeave={handleDropdownLeave}
              >
                <Link
                  href={item.href}
                  className="sh-nav__link"
                  id={`sh-nav-${item.label.replace(/\s+/g, '-').toLowerCase()}`}
                  aria-expanded={activeDropdown === item.label}
                  aria-haspopup={item.dropdown ? 'true' : 'false'}
                  onClick={(e) => handleDropdownToggle(e, item)}
                >
                  {item.label}
                  {item.dropdown && (
                    <svg className="sh-nav__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </Link>

                {/* Staggered Mega Dropdown Menu */}
                {item.dropdown && (
                  <div className={`sh-dropdown ${activeDropdown === item.label ? 'sh-dropdown--open' : ''}`}>
                    <div className="sh-dropdown__arrow" />
                    <div className="sh-dropdown__inner" role="menu">
                      {item.dropdown.map((d, i) => (
                        <Link 
                          key={i} 
                          href={d.href} 
                          className="sh-dropdown__item" 
                          style={{ '--di': i }}
                          role="menuitem"
                        >
                          <span className="sh-dropdown__item-icon" aria-hidden="true">{d.icon}</span>
                          <span className="sh-dropdown__item-body">
                            <span className="sh-dropdown__item-title">{d.title}</span>
                            <span className="sh-dropdown__item-desc">{d.desc}</span>
                          </span>
                          <svg className="sh-dropdown__item-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                            <path d="M3 7h8M8 4l3 3-3 3" stroke="#4169e1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* ── Action Buttons & Interaction Widgets ── */}
          <div className="sh-actions">
            
            {/* Sliding Search Bar Component */}
            <div className={`sh-search ${searchOpen ? 'sh-search--open' : ''}`} ref={searchRef}>
              <button
                className="sh-search__toggle"
                onClick={() => setSearchOpen(!searchOpen)}
                aria-label="Toggle search input"
                id="sh-search-toggle"
                aria-expanded={searchOpen}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.8" />
                  <path d="m13 13 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
              <div className="sh-search__bar">
                <input
                  type="text"
                  placeholder="Search resources..."
                  className="sh-search__input"
                  id="sh-header-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus={searchOpen}
                />
              </div>
            </div>

            {/* Notification Bell Widget */}
            <button className="sh-bell" aria-label="Notifications hub" id="sh-notifications">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2a6 6 0 0 1 6 6c0 3 1 4 2 5H2c1-1 2-2 2-5a6 6 0 0 1 6-6z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M8.5 17a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <span className="sh-bell__badge">3</span>
            </button>

            {/* Visual Divider */}
            <div className="sh-divider" aria-hidden="true" />


            {/* Primary High-Impact CTA: Start Selling */}
            <Link href="/seller/register" className="sh-btn sh-btn--primary" id="sh-register-btn" style={{ textDecoration: 'none' }}>
              <span className="sh-btn__shimmer" />
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 2v12M2 8h12" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>Start Selling</span>
            </Link>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              className={`sh-hamburger ${menuOpen ? 'sh-hamburger--open' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle mobile site menu"
              aria-expanded={menuOpen}
              id="sh-hamburger"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      {/* ── Glassmorphic Mobile Nav Menu Overlay ── */}
      <div className={`sh-mobile ${menuOpen ? 'sh-mobile--open' : ''}`} id="sh-mobile-menu" aria-hidden={!menuOpen}>
        <div className="sh-mobile__inner">
          
          {/* Mobile Search bar */}
          <div className="sh-mobile__search">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6" stroke="#888" strokeWidth="1.8" />
              <path d="m13 13 3 3" stroke="#888" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input 
              type="text" 
              placeholder="Search seller guides..." 
              className="sh-mobile__search-input" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Staggered Slide-In Links */}
          <nav className="sh-mobile__nav" aria-label="Mobile navigation">
            {navItems.map((item, i) => (
              <Link
                key={item.label}
                href={item.href}
                className="sh-mobile__link"
                style={{ '--mi': i }}
                onClick={() => setMenuOpen(false)}
              >
                <span>{item.label}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 4l4 4-4 4" stroke="#aaa" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ))}
          </nav>

          {/* Mobile Social Proof & Metrics Stats */}
          <div className="sh-mobile__stats">
            <div className="sh-mobile__stat">
              <strong>2M+</strong>
              <span>Active Sellers</span>
            </div>
            <div className="sh-mobile__stat">
              <strong>0%</strong>
              <span>Commission</span>
            </div>
            <div className="sh-mobile__stat">
              <strong>48h</strong>
              <span>Payout Time</span>
            </div>
          </div>

          {/* Mobile High-Level CTAs */}
          <div className="sh-mobile__ctas">
            <Link href="/seller/register" className="sh-btn sh-btn--primary sh-btn--full" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
              <span className="sh-btn__shimmer" />
              <span>Start Selling Free →</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Interactive Mobile Backdrop blur overlay */}
      {menuOpen && <div className="sh-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
    </>
  );
}
