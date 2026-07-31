'use client';

import { useState, useEffect } from 'react';
import './seller_hero.css';

export default function SellerHero() {
  const [isVisible, setIsVisible] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setContactSubmitted(true);
  };

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

            {/* Mandatory Return Logistics Notice Warning Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.08) 100%)',
              border: '1.5px solid #ef4444',
              borderRadius: '12px',
              padding: '14px 18px',
              margin: '18px 0 22px 0',
              boxShadow: '0 4px 16px rgba(239, 68, 68, 0.12)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontWeight: '800', fontSize: '0.82rem', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span style={{ fontSize: '1.15rem' }}>⚠️</span>
                <span>MANDATORY SELLER LOGISTICS POLICY NOTICE</span>
              </div>
              <p style={{ color: '#991b1b', fontSize: '0.8rem', lineHeight: '1.55', margin: 0, fontWeight: '600' }}>
                <strong>Return Logistics Notice:</strong> If a buyer declines or fails to accept a perfect, undamaged order matching the exact listed product specifications, the entire logistics cost, return transit coordination, and absolute platform responsibility lie solely on the Seller.
              </p>
            </div>

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
                onClick={() => {
                  setIsContactModalOpen(true);
                  setContactSubmitted(false);
                }}
                className="sh-btn sh-btn--secondary"
              >
                Contact Us
              </button>
            </div>

            {/* Direct Seller Support Contact Info */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '14px',
              margin: '14px 0 0 0',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '0.85rem'
            }}>
              <span style={{ color: '#94a3b8', fontWeight: '500' }}>Seller Support:</span>
              <a href="mailto:emahu23072026@gmail.com" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                ✉️ emahu23072026@gmail.com
              </a>
              <span style={{ color: '#475569' }}>•</span>
              <a href="tel:9081330134" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                📞 +91 9081330134
              </a>
            </div>

            {/* Seller Portal — Seller Type Cards */}
            <div className="sh-hero__seller-portal">
              <p className="sh-portal__label">Seller Portal · Open to All</p>
              <div className="sh-portal__cards">

                {/* Card 1: Home & Individual Sellers */}
                <div className="sh-portal-card sh-portal-card--home">
                  <div className="sh-portal-card__icon-wrap">
                    <span className="sh-portal-card__icon">🏠</span>
                  </div>
                  <div className="sh-portal-card__body">
                    <span className="sh-portal-card__title">Home &amp; Individual Sellers</span>
                    <span className="sh-portal-card__sub">Sell from home — no GST required</span>
                  </div>
                  <span className="sh-portal-card__arrow">→</span>
                </div>

                {/* Card 2: Retail Shops & Local Stores */}
                <div className="sh-portal-card sh-portal-card--retail">
                  <div className="sh-portal-card__icon-wrap">
                    <span className="sh-portal-card__icon">🏪</span>
                  </div>
                  <div className="sh-portal-card__body">
                    <span className="sh-portal-card__title">Retail Shops &amp; Local Stores</span>
                    <span className="sh-portal-card__sub">Expand your local store nationwide</span>
                  </div>
                  <span className="sh-portal-card__arrow">→</span>
                </div>

                {/* Card 3: Corporate Brands & Enterprises */}
                <div className="sh-portal-card sh-portal-card--corporate">
                  <div className="sh-portal-card__icon-wrap">
                    <span className="sh-portal-card__icon">🏢</span>
                  </div>
                  <div className="sh-portal-card__body">
                    <span className="sh-portal-card__title">Corporate Brands &amp; Enterprises</span>
                    <span className="sh-portal-card__sub">Bulk listings, priority support &amp; SLA</span>
                  </div>
                  <span className="sh-portal-card__arrow">→</span>
                </div>

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

      {/* ── INTERACTIVE CONTACT DETAILS MODAL ── */}
      {isContactModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setIsContactModalOpen(false)}
        >
          <div
            style={{
              background: '#0f172a',
              color: '#ffffff',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              maxHeight: '90vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '24px 28px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.03)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#f8fafc' }}>
                  📞 EMAHU Contact Details
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Official Support Helpline & Email
                </p>
              </div>
              <button
                onClick={() => setIsContactModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '6px 12px',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div style={{ padding: '24px 28px', overflowY: 'auto', flexGrow: 1 }}>
              
              {/* Direct Contact Cards Box */}
              <div style={{
                display: 'grid',
                gap: '12px',
                marginBottom: '24px'
              }}>
                {/* Email Box */}
                <a
                  href="mailto:emahu23072026@gmail.com"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 18px',
                    borderRadius: '14px',
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    textDecoration: 'none',
                    color: '#ffffff'
                  }}
                >
                  <div style={{ fontSize: '1.5rem' }}>✉️</div>
                  <div style={{ flexGrow: 1 }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>Email Support</span>
                    <strong style={{ fontSize: '0.95rem', color: '#38bdf8' }}>emahu23072026@gmail.com</strong>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: '700' }}>Email Us →</span>
                </a>

                {/* Phone Box */}
                <a
                  href="tel:9081330134"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 18px',
                    borderRadius: '14px',
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    textDecoration: 'none',
                    color: '#ffffff'
                  }}
                >
                  <div style={{ fontSize: '1.5rem' }}>📞</div>
                  <div style={{ flexGrow: 1 }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>Helpline Number</span>
                    <strong style={{ fontSize: '0.95rem', color: '#818cf8' }}>+91 9081330134</strong>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#818cf8', fontWeight: '700' }}>Call Now →</span>
                </a>

                {/* WhatsApp Box */}
                <a
                  href="https://wa.me/919081330134"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 18px',
                    borderRadius: '14px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    textDecoration: 'none',
                    color: '#ffffff'
                  }}
                >
                  <div style={{ fontSize: '1.5rem' }}>💬</div>
                  <div style={{ flexGrow: 1 }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>WhatsApp Chat</span>
                    <strong style={{ fontSize: '0.95rem', color: '#34d399' }}>9081330134</strong>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: '700' }}>WhatsApp →</span>
                </a>
              </div>

              {/* Inquiry Form */}
              {contactSubmitted ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>✅</div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#34d399', margin: '0 0 6px 0' }}>Message Sent!</h4>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    Thank you, <strong>{formData.name}</strong>. We will get back to you at <strong>emahu23072026@gmail.com</strong> or call <strong>+91 9081330134</strong>.
                  </p>
                  <button
                    onClick={() => setIsContactModalOpen(false)}
                    style={{
                      marginTop: '16px',
                      padding: '10px 24px',
                      background: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1' }}>Send Inquiry Directly:</div>
                  <input
                    type="text"
                    required
                    placeholder="Your Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ height: '42px', padding: '0 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#fff', fontSize: '0.875rem' }}
                  />
                  <input
                    type="email"
                    required
                    placeholder="Your Email Address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ height: '42px', padding: '0 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#fff', fontSize: '0.875rem' }}
                  />
                  <input
                    type="tel"
                    placeholder="Your Phone Number (e.g. 9081330134)"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ height: '42px', padding: '0 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#fff', fontSize: '0.875rem' }}
                  />
                  <textarea
                    required
                    rows="3"
                    placeholder="How can we help you?"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#fff', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                  <button
                    type="submit"
                    style={{
                      height: '44px',
                      background: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: '700',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(56, 189, 248, 0.25)',
                      marginTop: '4px'
                    }}
                  >
                    Submit Inquiry
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
