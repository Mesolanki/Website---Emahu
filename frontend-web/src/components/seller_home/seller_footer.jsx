'use client';

import Link from 'next/link';
import './seller_footer.css';

/**
 * SellerFooter Component
 * A premium, luxury-themed footer with responsive link columns, newsletter forms,
 * copyright markings, and clean BEM markup.
 */
export default function SellerFooter() {
  return (
    <footer className="sf-footer" role="contentinfo">
      
      {/* Dynamic Background glows */}
      <div className="sff-glow" />

      <div className="sff-container">
        
        {/* Top Segment: Brand & Newsletter */}
        <div className="sff-top">
          
          <div className="sff-brand">
            <Link href="/" className="sff-logo">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="10" fill="url(#sffLogoGrad)" />
                <path d="M8 12h16M8 16h12M8 20h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
                <defs>
                  <linearGradient id="sffLogoGrad" x1="0" y1="0" x2="32" y2="32">
                    <stop stopColor="#5a7ef5" />
                    <stop offset="1" stopColor="#2b4594" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="sff-logo__text">
                <span className="sff-logo__brand">EMAHU</span>
                <span className="sff-logo__tag">Seller Hub</span>
              </div>
            </Link>
            <p className="sff-brand__desc">
              {"India's most transparent, commission-friendly digital marketplace. Empowers local vendors to list products globally and secure guaranteed weekly Friday payouts."}
            </p>
          </div>

          <div className="sff-newsletter">
            <h4 className="sff-title">Subscribe to Seller Insights</h4>
            <p className="sff-newsletter__desc">Receive weekly marketing strategies, platform feature announcements, and merchant tips directly in your inbox.</p>
            <form className="sff-newsletter__form" onSubmit={(e) => { e.preventDefault(); alert('Subscribed!'); }}>
              <input
                type="email"
                placeholder="Merchant email address"
                className="sff-newsletter__input"
                required
              />
              <button type="submit" className="sff-newsletter__btn">
                Subscribe
              </button>
            </form>
          </div>

        </div>

        {/* Middle Segment: Onboarding Quick Links */}
        <div className="sff-mid">
          
          <div className="sff-column">
            <h5 className="sff-col-title">Operational Features</h5>
            <ul className="sff-col-list">
              <li><Link href="#how-it-works">Product Control</Link></li>
              <li><Link href="#how-it-works">Real-Time Inventory</Link></li>
              <li><Link href="#how-it-works">Order Management</Link></li>
              <li><Link href="#how-it-works">Self Shipping Settings</Link></li>
            </ul>
          </div>

          <div className="sff-column">
            <h5 className="sff-col-title">Merchant Support</h5>
            <ul className="sff-col-list">
              <li><Link href="#support">Frequently Asked FAQs</Link></li>
              <li><Link href="#pricing">Commission Rates</Link></li>
              <li><Link href="#register">4-Step Onboarding</Link></li>
              <li><Link href="/seller/login">Account Sign In</Link></li>
            </ul>
          </div>

          <div className="sff-column">
            <h5 className="sff-col-title">Admin Policies</h5>
            <ul className="sff-col-list">
              <li><Link href="#pricing">Weekly Payout Terms</Link></li>
              <li><Link href="#register">KYC Compliance guidelines</Link></li>
              <li><Link href="#how-it-works">Category Commission Fee Rates</Link></li>
              <li><Link href="/">Main Marketplace Page</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom Segment: Copyright & Social proofs */}
        <div className="sff-bottom">
          <p className="sff-copyright">
            © {new Date().getFullYear()} Emahu Technologies Pvt. Ltd. All rights reserved. 
            <span className="sff-copyright__terms">
              <Link href="/">Privacy Policy</Link> · <Link href="/">Terms of Service</Link>
            </span>
          </p>
          
          {/* Mock Social Media icons */}
          <div className="sff-socials">
            <Link href="/" aria-label="LinkedIn Profile">💼</Link>
            <Link href="/" aria-label="Twitter Profile">🐦</Link>
            <Link href="/" aria-label="YouTube Channel">📺</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
