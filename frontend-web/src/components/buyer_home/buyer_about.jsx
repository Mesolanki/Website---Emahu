'use client';

import { useState, useEffect } from 'react';
import './buyer_about.css';

const buyerModules = [
  {
    id: 'shield',
    title: '100% Quality Inspected',
    tagline: 'Hand-Audited Quality Assured',
    desc: 'Never receive a broken or counterfeit item again. Every single order is processed through our physical verification hub where certified experts verify structural integrity and seal status before dispatch.',
    badge: '100% Verified Drops',
  },
  {
    id: 'escrow',
    title: 'Encrypted Escrow Vault',
    tagline: 'Zero-Risk Secure Payments',
    desc: 'Your money is fully protected. When you buy, your payment is locked in a military-grade secure escrow vault. Funds are only routed to the seller after you confirm delivery and product satisfaction.',
    badge: 'Encrypted Checkout',
  },
  {
    id: 'logistics',
    title: '48-Hour Eco-Express',
    tagline: 'Carbon-Neutral Direct Shipping',
    desc: 'Fast delivery that protects the planet. Our smart route optimization matches local dispatch agents with electric vehicle couriers, ensuring your order arrives in under 48 hours with minimal carbon footprints.',
    badge: 'Green Dispatch',
  },
  {
    id: 'refund',
    title: 'One-Tap Return Wallet',
    tagline: 'Zero-Questions Instant Returns',
    desc: 'Did not fit or changed your mind? No worries! Tap one button on your dashboard to request a return. We authorize instant wallet credits the moment our pickup agent scans the barcode at your doorstep.',
    badge: 'Hassle-Free Refunds',
  }
];

export default function BuyerAbout() {
  const [activeTab, setActiveTab] = useState('shield');
  const [animateState, setAnimateState] = useState(true);

  const handleTabChange = (tabId) => {
    setAnimateState(false);
    setActiveTab(tabId);
  };

  useEffect(() => {
    if (!animateState) {
      const timeout = setTimeout(() => setAnimateState(true), 50);
      return () => clearTimeout(timeout);
    }
  }, [animateState]);

  const activeModule = buyerModules.find((m) => m.id === activeTab);

  const renderTabIcon = (id, isActive) => {
    const strokeColor = isActive ? 'currentColor' : '#64748b';
    
    if (id === 'shield') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    }
    if (id === 'escrow') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    }
    if (id === 'logistics') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      );
    }
    if (id === 'refund') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
        </svg>
      );
    }
    return null;
  };

  return (
    <section className="ba-section" id="about-buyer">
      {/* Dynamic Background */}
      <div className="ba-bg">
        <div className="ba-bg__glow ba-bg__glow--left" />
        <div className="ba-bg__glow ba-bg__glow--right" />
      </div>

      <div className="ba-container">
        
        {/* Section Header */}
        <div className="ba-header">
          <span className="ba-header__badge">Emahu Assurance</span>
          <h2 className="ba-header__title">Shop with Absolute Pro-Level Security</h2>
          <p className="ba-header__desc">
            Explore the retail-centric protection network designed to deliver authentic goods, secure your checkout payments, and process instant refunds.
          </p>
        </div>

        {/* Dashboard Panels */}
        <div className="ba-dashboard">
          
          {/* Left Panel: Tabs Control */}
          <div className="ba-controls">
            <div className="ba-controls__list">
              {buyerModules.map((module) => {
                const isActive = activeTab === module.id;
                return (
                  <button
                    key={module.id}
                    type="button"
                    className={`ba-tab-btn ${isActive ? 'ba-tab-btn--active' : ''}`}
                    onClick={() => handleTabChange(module.id)}
                  >
                    <div className="ba-tab-btn__indicator" />
                    <span className="ba-tab-btn__icon">
                      {renderTabIcon(module.id, isActive)}
                    </span>
                    <div className="ba-tab-btn__txt">
                      <span className="ba-tab-btn__title">{module.title}</span>
                      <span className="ba-tab-btn__sub">{module.tagline}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Interactive Canvas */}
          <div className="ba-canvas-wrapper">
            <div className="ba-canvas">
              {/* Radial Base Plate */}
              <div className="ba-canvas__plate" />

              <div className={`ba-visual-container ${animateState ? 'ba-visual-container--active' : ''}`}>
                
                {/* 🛡️ TAB 1: 100% Quality Inspected */}
                {activeTab === 'shield' && (
                  <div className="ba-vis">
                    <div className="ba-console">
                      <div className="ba-console__header">
                        <div className="ba-console__indicator">
                          <span className="ba-console__dot" />
                          <span className="ba-console__status">VERIFICATION HUB PASS</span>
                        </div>
                        <span className="ba-console__badge-pill">99.8% Index</span>
                      </div>
                      
                      <div className="ba-console__body">
                        <div className="ba-console__metric">
                          <span className="ba-console__metric-lbl">BATCH INSPECTION STATUS</span>
                          <span className="ba-console__metric-val">APPROVED FOR DISPATCH</span>
                          <span className="ba-console__metric-sub">Certified Genuine Brand Hologram Intact</span>
                        </div>

                        <div className="ba-console__report">
                          <div className="ba-report__row">
                            <span className="ba-report__name">Structural Check</span>
                            <span className="ba-report__status ba-status--pass">✓ PASS</span>
                          </div>
                          <div className="ba-report__row">
                            <span className="ba-report__name">Counterfeit Seal Scan</span>
                            <span className="ba-report__status ba-status--pass">✓ PASS</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 💳 TAB 2: Encrypted Escrow Vault */}
                {activeTab === 'escrow' && (
                  <div className="ba-vis">
                    <div className="ba-pipeline">
                      <div className="ba-pipeline__header">
                        <span className="ba-pipeline__title">ESCROW PROTECTION ROUTER</span>
                        <span className="ba-pipeline__badge">VAULT LOCKED</span>
                      </div>

                      <div className="ba-pipeline__flow">
                        <div className="ba-flow__step ba-flow__step--active">
                          <div className="ba-step__circle">1</div>
                          <span className="ba-step__lbl">Paid</span>
                        </div>
                        
                        <div className="ba-flow__line ba-flow__line--active" />

                        <div className="ba-flow__step ba-flow__step--success">
                          <div className="ba-step__circle">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          </div>
                          <span className="ba-step__lbl">Vault</span>
                        </div>

                        <div className="ba-flow__line ba-flow__line--pulsing" />

                        <div className="ba-flow__step">
                          <div className="ba-step__circle">3</div>
                          <span className="ba-step__lbl">Release</span>
                        </div>
                      </div>

                      <div className="ba-ledger">
                        <div className="ba-ledger__row">
                          <span className="ba-ledger__lbl">Transaction Vault ID</span>
                          <span className="ba-ledger__val">TXN-49294</span>
                        </div>
                        <div className="ba-ledger__footer">
                          <span className="ba-ledger__status-dot" />
                          <span className="ba-ledger__status-txt">Protected by Emahu Escrow Guarantee</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🚚 TAB 3: Eco-Express Courier Router */}
                {activeTab === 'logistics' && (
                  <div className="ba-vis">
                    <div className="ba-logistics">
                      <div className="ba-logistics__header">
                        <span className="ba-logistics__title">ECO-ROUTING ENGINE</span>
                        <div className="ba-logistics__hud">
                          <span className="ba-hud__pulse" />
                          <span>Carbon Saved: 4.8kg</span>
                        </div>
                      </div>

                      <div className="ba-carrier-grid">
                        <div className="ba-carrier-card ba-carrier-card--active">
                          <div className="ba-carrier__details">
                            <span className="ba-carrier__name">EV Delivery Fleet</span>
                            <span className="ba-carrier__perf">On route • 99.2% speed rating</span>
                          </div>
                          <span className="ba-carrier__badge">Auto-assigned</span>
                        </div>
                      </div>

                      <div className="ba-awb-card">
                        <span className="ba-awb__lbl">Estimated Delivery</span>
                        <span className="ba-awb__val">Within 24 Hours • Out for Dispatch</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ↩️ TAB 4: Return Wallet Console */}
                {activeTab === 'refund' && (
                  <div className="ba-vis">
                    <div className="ba-return">
                      <div className="ba-return__header">
                        <span className="ba-return__title">ONE-TAP REFUND CONTROLLER</span>
                        <span className="ba-return__badge">REFUND INSTANT</span>
                      </div>

                      <div className="ba-return__card">
                        <div className="ba-return__details">
                          <span className="ba-return__name">Eco Dining Set</span>
                          <span className="ba-return__id">Order #84284 • Return Verified</span>
                        </div>
                        <span className="ba-return__action">Returned</span>
                      </div>

                      <div className="ba-wallet">
                        <div className="ba-wallet__lbl">
                          <span className="ba-wallet__title">Emahu Wallet Top-up</span>
                          <span className="ba-wallet__sub">Instant approval credit complete</span>
                        </div>
                        <span className="ba-wallet__balance">₹4,250.00</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Text Information Panel */}
              <div className="ba-info">
                <span className="ba-info__badge">{activeModule.badge}</span>
                <h3 className="ba-info__title">{activeModule.tagline}</h3>
                <p className="ba-info__desc">{activeModule.desc}</p>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
