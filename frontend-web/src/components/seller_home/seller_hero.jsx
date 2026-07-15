'use client';

import { useState, useEffect } from 'react';
import './seller_hero.css';

export default function SellerHero() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className={`sh-hero ${isVisible ? 'sh-hero--visible' : ''}`} id="seller-hero">
      {/* Background Layers */}
      <div className="sh-hero__bg-container">
        {/* Sleek corporate grid lines */}
        <div className="sh-hero__bg-grid" />

        {/* Dynamic mesh gradients */}
        <div className="sh-hero__bg-glow sh-hero__bg-glow--top" />
        <div className="sh-hero__bg-glow sh-hero__bg-glow--center" />
        <div className="sh-hero__bg-glow sh-hero__bg-glow--right" />
      </div>

      {/* Main Responsive Grid Container */}
      <div className="sh-hero__container">
        <div className="sh-hero__grid">

          {/* ==========================================
             LEFT COLUMN: VALUE PROPOSITION & ACTIONS
             ========================================== */}
          <div className="sh-hero__left">
            {/* Active Trust Badge */}
            <div className="sh-hero__badge">
              <span className="sh-badge__dot" />
              Trusted by 10,000+ Active Vendors Across India
            </div>

            {/* Title with sleek text mask gradient */}
            <h1 className="sh-hero__headline">
              Sell &amp; Grow Your Business <br />
              <span className="sh-hero__headline-gradient">Reach Millions of Buyers Today</span>
            </h1>

            {/* Body Copy */}
            <p className="sh-hero__desc">
              Emahu provides the ultimate high-performance infrastructure for modern digital commerce. Experience 0% commission deductions, secure Emahu settlement cycles, and hyper-speed doorstep logistics in one unified platform.
            </p>

            {/* Action Buttons */}
            <div className="sh-hero__actions">
              <button
                onClick={() => {
                  const isRegistered = localStorage.getItem('emahu_seller_registered');
                  if (isRegistered === 'true') {
                    window.location.href = '/seller/dashboard';
                  } else {
                    window.location.href = '/seller/register';
                  }
                }}
                className="sh-btn sh-btn--primary"
              >
                Start Selling
              </button>

              <button
                onClick={() => window.location.href = '/contact'}
                className="sh-btn sh-btn--secondary"
              >
                Contact Us
              </button>
            </div>

            {/* Bullet value markers */}
            <div className="sh-hero__props">
              <div className="sh-prop-item">
                <span className="sh-prop-icon">🛡️</span>
                <span className="sh-prop-txt">Zero Commission</span>
              </div>
              <div className="sh-prop-item">
                <span className="sh-prop-icon">💼</span>
                <span className="sh-prop-txt">Direct Bank Settlement</span>
              </div>
              <div className="sh-prop-item">
                <span className="sh-prop-icon">🚚</span>
                <span className="sh-prop-txt">28,000+ Pin Codes</span>
              </div>
            </div>
          </div>

          {/* ==========================================
             RIGHT COLUMN: PREMIUM INTERACTIVE DASHBOARDS
             ========================================== */}
          <div className="sh-hero__right">
            <div className="sh-mockup-stack">

              {/* Card 1: Sales Analytics Widget */}
              <div className="sh-widget sh-widget--revenue">
                <div className="sh-widget__header">
                  <div className="sh-widget__title-block">
                    <span className="sh-widget__lbl">STORE METRICS</span>
                    <h4 className="sh-widget__title">Live Dashboard</h4>
                  </div>
                  <span className="sh-widget__trend">+14.2% Growth</span>
                </div>

                <div className="sh-widget__body">
                  <div className="sh-widget__metric">
                    <span className="sh-widget__amt">₹1,82,450.00</span>
                    <span className="sh-widget__sub">Total Revenue Generated</span>
                  </div>

                  {/* High-Fidelity Interactive SVG Line Graph */}
                  <div className="sh-widget__chart">
                    <svg viewBox="0 0 300 80" className="sh-chart-svg">
                      <defs>
                        <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Area Fill */}
                      <path d="M 0 60 Q 50 35 100 45 T 200 15 T 300 5 L 300 80 L 0 80 Z" fill="url(#chartGlow)" />
                      {/* Curve Stroke */}
                      <path d="M 0 60 Q 50 35 100 45 T 200 15 T 300 5" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" className="sh-chart-path" />
                      {/* Pulse Dot */}
                      <circle cx="200" cy="15" r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" className="sh-chart-dot" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Card 2: Payout Verification Alert */}
              <div className="sh-widget sh-widget--Emahu">
                <div className="sh-Emahu-badge">
                  <div className="sh-Emahu-badge__circle">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div className="sh-Emahu-badge__txt">
                    <span className="sh-Emahu-badge__title">FRIDAY SETTLEMENT LOCKED</span>
                    <span className="sh-Emahu-badge__sub">Direct Transfer to HDFC Bank Secure</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Transit Status HUD */}
              <div className="sh-widget sh-widget--delivery">
                <div className="sh-delivery-hud">
                  <span className="sh-delivery-hud__indicator" />
                  <div className="sh-delivery-hud__details">
                    <span className="sh-delivery-hud__awb">AWB #829104829</span>
                    <span className="sh-delivery-hud__status">BlueDart Premium • Out for Doorstep Pick-up</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
