'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './selector.css';

/**
 * Selector Page Component
 * A premium, light-themed business role selector page for EMAHU.
 * Features 3 glassmorphic, interactive role cards (Professional Buyer, Merchant Seller, Delivery Partner)
 * with soft ambient background glows, smooth SVG animations, key feature checklists, and direct routing.
 */
export default function RoleSelector() {
  const router = useRouter();
  const [activeCard, setActiveCard] = useState(null);

  // Smart session auto-redirect with back-button safety
  useEffect(() => {
    const navigationEntries = typeof window !== 'undefined' && window.performance && window.performance.getEntriesByType && window.performance.getEntriesByType('navigation');
    const isBackForward = navigationEntries && navigationEntries.length > 0 && navigationEntries[0].type === 'back_forward';

    if (isBackForward) {
      // Bypasses redirect if the user navigated back to this page
      return;
    }

    if (localStorage.getItem('emahu_buyer_logged_in') === 'true') {
      router.replace('/buyer/products');
    } else if (localStorage.getItem('emahu_seller_logged_in') === 'true') {
      router.replace('/seller/dashboard');
    }
  }, [router]);

  return (
    <div className="sel-wrapper">
      {/* Background Soft Pastel Ambient Glowing Blobs clipped container */}
      <div className="sel-bg-container">
        <div className="sel-blob sel-blob--buyer" />
        <div className="sel-blob sel-blob--seller" />
        <div className="sel-blob sel-blob--delivery" />
      </div>

      <div className="sel-container">
        
        {/* Brand Header */}
        <header className="sel-header animate-fade-in">
          <Link href="/" className="sel-logo">
            <div className="sel-logo__icon">
              <svg width="40" height="40" viewBox="0 0 32 32" fill="none" aria-label="EMAHU Logo">
                <rect width="32" height="32" rx="10" fill="url(#selLogoGrad)" />
                <path d="M8 12h16M8 16h12M8 20h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
                <defs>
                  <linearGradient id="selLogoGrad" x1="0" y1="0" x2="32" y2="32">
                    <stop stopColor="#5a7ef5" />
                    <stop offset="1" stopColor="#2b4594" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="sel-logo__glow" />
            </div>
            <span className="sel-logo__text">EMAHU</span>
          </Link>
          
          <h1 className="sel-title">Choose Your Experience</h1>
          <p className="sel-subtitle">
            Welcome to EMAHU. Please select how you want to interact with our platform to access your customized portal.
          </p>
        </header>

        {/* 3-Option Role Cards Grid */}
        <div className="sel-grid">
          
          {/* Option 1: Retail Buyer */}
          <div 
            className={`sel-card sel-card--buyer ${activeCard === 'buyer' ? 'sel-card--focused' : ''}`}
            onMouseEnter={() => setActiveCard('buyer')}
            onMouseLeave={() => setActiveCard(null)}
          >
            <div className="sel-card__glow-border" />
            
            <div className="sel-card__badge">Personal Buyer</div>
            
            <div className="sel-card__icon-container">
              <svg className="sel-card__svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
                {/* Outer dashed ring */}
                <circle cx="32" cy="32" r="28" stroke="url(#buyerSvgGrad)" strokeWidth="1.5" strokeDasharray="4 4" className="sel-svg-rotate" />
                {/* Main briefcase/shopping bag */}
                <path d="M20 22h24v26H20z" stroke="url(#buyerSvgGrad)" strokeWidth="2" strokeLinejoin="round" />
                <path d="M26 22v-6a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v6" stroke="url(#buyerSvgGrad)" strokeWidth="2" />
                <path d="M20 30h24M28 30v4m8-4v4" stroke="url(#buyerSvgGrad)" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="32" cy="40" r="3" fill="#4169e1" />
                <defs>
                  <linearGradient id="buyerSvgGrad" x1="0" y1="0" x2="64" y2="64">
                    <stop stopColor="#63b3ed" />
                    <stop offset="1" stopColor="#4169e1" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="sel-card__icon-shadow" />
            </div>

            <h2 className="sel-card__title">Retail Buyer</h2>
            <p className="sel-card__desc">
              Explore premium products, track your personal orders, and enjoy fast home delivery with exclusive retail deals and verified checkouts.
            </p>


            {/* Actions */}
            <div className="sel-card__actions">
              <Link href="/buyer/register" className="sel-btn sel-btn--buyer">
                <span>Enter Buyer Hub</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>
              <Link href="/buyer/login" className="sel-btn-sub text-buyer">
                Already registered? Sign In
              </Link>
            </div>
          </div>

          {/* Option 2: Merchant Seller (Featured Center Card) */}
          <div 
            className={`sel-card sel-card--seller sel-card--featured ${activeCard === 'seller' ? 'sel-card--focused' : ''}`}
            onMouseEnter={() => setActiveCard('seller')}
            onMouseLeave={() => setActiveCard(null)}
          >
            <div className="sel-card__glow-border" />
            
            <div className="sel-card__badge sel-card__badge--featured">Most Popular</div>
            
            <div className="sel-card__icon-container">
              <svg className="sel-card__svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
                {/* Outer ring */}
                <circle cx="32" cy="32" r="28" stroke="url(#sellerSvgGrad)" strokeWidth="1.5" className="sel-svg-pulse" />
                {/* Store outline */}
                <path d="M16 28h32l2-8H14l2 8z" fill="url(#sellerSvgGrad)" opacity="0.15" />
                <path d="M16 28h32l2-8H14l2 8z" stroke="url(#sellerSvgGrad)" strokeWidth="2" strokeLinejoin="round" />
                <path d="M18 28v20a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V28" stroke="url(#sellerSvgGrad)" strokeWidth="2" strokeLinejoin="round" />
                {/* Shop window accents */}
                <path d="M26 38h12v12H26V38zM22 20v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4" stroke="url(#sellerSvgGrad)" strokeWidth="1.5" strokeLinecap="round" />
                <defs>
                  <linearGradient id="sellerSvgGrad" x1="0" y1="0" x2="64" y2="64">
                    <stop stopColor="#fbd38d" />
                    <stop offset="1" stopColor="#ed8936" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="sel-card__icon-shadow" />
            </div>

            <h2 className="sel-card__title">Merchant Seller</h2>
            <p className="sel-card__desc">
              Onboard as a registered vendor to showcase your products, track real-time analytics, and scale your brand ecommerce business.
            </p>


            {/* Actions */}
            <div className="sel-card__actions">
              <Link href="/seller" className="sel-btn sel-btn--seller">
                <span>Enter Seller Hub</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>
              <Link href="/seller/login" className="sel-btn-sub text-seller">
                Already have a store? Login
              </Link>
            </div>
          </div>

          {/* Option 3: Delivery Partner */}
          <div 
            className={`sel-card sel-card--delivery ${activeCard === 'delivery' ? 'sel-card--focused' : ''}`}
            onMouseEnter={() => setActiveCard('delivery')}
            onMouseLeave={() => setActiveCard(null)}
          >
            <div className="sel-card__glow-border" />
            
            <div className="sel-card__badge">Logistics Partner</div>
            
            <div className="sel-card__icon-container">
              <svg className="sel-card__svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
                {/* Outer dashed route track */}
                <circle cx="32" cy="32" r="28" stroke="url(#deliverySvgGrad)" strokeWidth="1.5" strokeDasharray="6 3" className="sel-svg-rotate" />
                {/* Logistics truck outline */}
                <path d="M14 26h24v18H14V26z" stroke="url(#deliverySvgGrad)" strokeWidth="2" strokeLinejoin="round" />
                <path d="M38 30h8l5 5v7H38v-12z" stroke="url(#deliverySvgGrad)" strokeWidth="2" strokeLinejoin="round" />
                <circle cx="21" cy="47" r="4.5" stroke="url(#deliverySvgGrad)" strokeWidth="2" />
                <circle cx="39" cy="47" r="4.5" stroke="url(#deliverySvgGrad)" strokeWidth="2" />
                {/* Cargo indicators */}
                <path d="M18 20h14v6H18v-6z" fill="url(#deliverySvgGrad)" opacity="0.15" />
                <path d="M18 22h14" stroke="url(#deliverySvgGrad)" strokeWidth="1.5" />
                <defs>
                  <linearGradient id="deliverySvgGrad" x1="0" y1="0" x2="64" y2="64">
                    <stop stopColor="#4fd1c5" />
                    <stop offset="1" stopColor="#319795" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="sel-card__icon-shadow" />
            </div>

            <h2 className="sel-card__title">Delivery Partner</h2>
            <p className="sel-card__desc">
              Onboard as a local delivery agent or logistics enterprise, optimize dispatch routes, handle cargo shipping, and earn high payout commissions.
            </p>


            {/* Actions */}
            <div className="sel-card__actions">
              <Link href="/delivery" className="sel-btn sel-btn--delivery">
                <span>Access Logistics Hub</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>
            </div>
          </div>

        </div>

        {/* Footer */}
        <footer className="sel-footer animate-fade-in-delayed">
          <p>© 2026 EMAHU Inc. All professional rights reserved.</p>
          <div className="sel-footer__links">
            <Link href="#help">Get Portal Support</Link>
            <span className="sel-footer__dot" />
            <Link href="#terms">Terms & Partner Conditions</Link>
          </div>
        </footer>

      </div>
    </div>
  );
}
