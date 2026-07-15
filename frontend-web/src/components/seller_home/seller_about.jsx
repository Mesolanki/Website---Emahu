'use client';

import { useState, useEffect } from 'react';
import './seller_about.css';

const aboutModules = [
  {
    id: 'shield',
    title: 'Zero-Commission Shield',
    tagline: 'Keep 100% of What You Earn',
    desc: 'Traditional platforms devour up to 25% of your hard-earned revenue. Emahu’s protective model deflects transaction deductions, redirecting every single rupee straight back into your cash flow.',
    badge: 'Maximize Profit',
  },
  {
    id: 'Emahu',
    title: 'Secure Emahu Router',
    tagline: 'Admin-verified Weekly Transfers',
    desc: 'Never worry about missing or delayed payouts. Our automated Emahu vault monitors buyer payments and routes them through a strict, multi-layer admin verification cycle for direct Friday settlement.',
    badge: '100% Protected',
  },
  {
    id: 'catalog',
    title: 'AI Catalog Automator',
    tagline: 'Smart Product Listings in Seconds',
    desc: 'Upload a basic product image, and our embedded AI engine auto-enhances the visuals, extracts precise specifications, generates SEO-optimized descriptions, and publishes your listing instantly.',
    badge: 'Hyper-Fast Listing',
  },
  {
    id: 'logistics',
    title: 'Smart Logistics Grid',
    tagline: 'Automated Doorstep Courier Routing',
    desc: 'Unlock access to 28,000+ pin codes. Our intelligent courier selector analyzes real-time courier performance to assign the fastest, lowest-cost shipment carrier for every individual order.',
    badge: 'Seamless Shipping',
  }
];

export default function SellerAbout() {
  const [activeTab, setActiveTab] = useState('shield');
  const [animateState, setAnimateState] = useState(true);

  // Trigger temporary animation state on tab change to reset CSS keyframes
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

  const activeModule = aboutModules.find((m) => m.id === activeTab);

  // Render highly-professional inline SVGs for tab buttons
  const renderTabIcon = (id, isActive) => {
    const strokeColor = isActive ? 'currentColor' : '#64748b';

    if (id === 'shield') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    }
    if (id === 'Emahu') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" height="14" width="20" y="7" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    }
    if (id === 'catalog') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.3-6.3l-.7.7M6.7 17.3l-.7.7m12.6 0l-.7-.7M6.7 6.7l-.7-.7N12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
          <path d="M5 3L4 4.5 2.5 5 4 5.5 5 7l.5-1.5L7 5l-1.5-.5L5 3z" />
        </svg>
      );
    }
    if (id === 'logistics') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    }
    return null;
  };

  return (
    <section className="sa-section" id="about">
      {/* Visual Grid Background */}
      <div className="sa-bg">
        <div className="sa-bg__glow sa-bg__glow--left" />
        <div className="sa-bg__glow sa-bg__glow--right" />
      </div>

      <div className="sa-container">
        {/* Section Header */}
        <div className="sa-header">
          <span className="sa-header__badge">Emahu Engine</span>
          <h2 className="sa-header__title">Built for Modern E-commerce Pioneers</h2>
          <p className="sa-header__desc">
            Explore the high-performance infrastructure designed to maximize your profit margins, safeguard your bank deposits, and automate your delivery pipeline.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="sa-dashboard">
          {/* Left Panel: Tabs Control */}
          <div className="sa-controls">
            <div className="sa-controls__list">
              {aboutModules.map((module) => {
                const isActive = activeTab === module.id;
                return (
                  <button
                    key={module.id}
                    type="button"
                    className={`sa-tab-btn sa-tab-btn--${module.id} ${isActive ? 'sa-tab-btn--active' : ''}`}
                    onClick={() => handleTabChange(module.id)}
                  >
                    <div className="sa-tab-btn__indicator" />
                    <span className="sa-tab-btn__icon">
                      {renderTabIcon(module.id, isActive)}
                    </span>
                    <div className="sa-tab-btn__txt">
                      <span className="sa-tab-btn__title">{module.title}</span>
                      <span className="sa-tab-btn__sub">{module.tagline}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Animated Visual Canvas */}
          <div className="sa-canvas-wrapper">
            <div className={`sa-canvas sa-canvas--${activeTab}`}>
              {/* Background Glass Plate */}
              <div className="sa-canvas__plate" />

              {/* Dynamic Animation Display based on Tab */}
              <div className={`sa-visual-container ${animateState ? 'sa-visual-container--active' : ''}`}>

                {/* 🛡️ TAB 1: ZERO-COMMISSION SHIELD DASHBOARD */}
                {activeTab === 'shield' && (
                  <div className="sa-vis sa-vis--shield">
                    {/* Glowing Security Console Grid */}
                    <div className="sa-console">
                      <div className="sa-console__header">
                        <div className="sa-console__indicator">
                          <span className="sa-console__dot" />
                          <span className="sa-console__status">SECURITY MODULE ACTIVE</span>
                        </div>
                        <div className="sa-console__savings-pill">Saved 100%</div>
                      </div>

                      <div className="sa-console__body">
                        {/* Saved Metric Block */}
                        <div className="sa-console__metric">
                          <span className="sa-console__metric-lbl">TOTAL SAVED COMMISSION</span>
                          <span className="sa-console__metric-val">₹0.00 DEDUCTED</span>
                          <span className="sa-console__metric-sub">Commission Shield is Active on All Sales</span>
                        </div>

                        {/* Audit Table */}
                        <div className="sa-console__table">
                          <div className="sa-table__row">
                            <span className="sa-table__col-id">#4829</span>
                            <span className="sa-table__col-amt">₹14,999</span>
                            <span className="sa-table__col-status sa-status--success">Shield Blocked (Saved ₹2,250)</span>
                          </div>
                          <div className="sa-table__row">
                            <span className="sa-table__col-id">#4828</span>
                            <span className="sa-table__col-amt">₹8,499</span>
                            <span className="sa-table__col-status sa-status--success">Shield Blocked (Saved ₹1,275)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Vector Glowing Defensive Shield */}
                    <div className="sa-shield-vector">
                      <svg width="100" height="120" viewBox="0 0 100 120" fill="none">
                        <defs>
                          <linearGradient id="shieldGlow" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#1d4ed8" />
                          </linearGradient>
                        </defs>
                        <path d="M50 10 L88 25 V60 C88 82 72 98 50 108 C28 98 12 82 12 60 V25 Z" fill="url(#shieldGlow)" opacity="0.15" stroke="#3b82f6" strokeWidth="2" />
                        <path d="M50 18 L80 30 V56 C80 75 67 89 50 98 C33 89 20 75 20 56 V30 Z" fill="url(#shieldGlow)" opacity="0.3" stroke="#2563eb" strokeWidth="1.5" />
                        <path d="M35 55 L45 65 L68 38" stroke="#3b82f6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* 💼 TAB 2: SECURE Emahu ROUTER */}
                {activeTab === 'Emahu' && (
                  <div className="sa-vis sa-vis--Emahu">
                    <div className="sa-Emahu-terminal">
                      <div className="sa-terminal__header">
                        <span className="sa-terminal__title">Emahu ROUTING PIPELINE</span>
                        <span className="sa-terminal__badge">AUTO-VERIFICATION ON</span>
                      </div>

                      <div className="sa-terminal__flow">
                        {/* Steps */}
                        <div className="sa-flow__step sa-flow__step--active">
                          <div className="sa-step__circle">1</div>
                          <span className="sa-step__lbl">Buyer Deposit</span>
                        </div>

                        <div className="sa-flow__line sa-flow__line--active" />

                        <div className="sa-flow__step sa-flow__step--active">
                          <div className="sa-step__circle">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          </div>
                          <span className="sa-step__lbl">Emahu Locked</span>
                        </div>

                        <div className="sa-flow__line sa-flow__line--pulsing" />

                        <div className="sa-flow__step sa-flow__step--pending">
                          <div className="sa-step__circle">3</div>
                          <span className="sa-step__lbl">Friday Transfer</span>
                        </div>
                      </div>

                      {/* Settlement Ledger Card */}
                      <div className="sa-ledger">
                        <div className="sa-ledger__row">
                          <span className="sa-ledger__lbl">Settlement Pending</span>
                          <span className="sa-ledger__val">₹42,850.00</span>
                        </div>
                        <div className="sa-ledger__footer">
                          <span className="sa-ledger__status-dot" />
                          <span className="sa-ledger__status-txt">Emahu Secured • Direct Deposit HDFC Bank</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ⚡ TAB 3: AI CATALOG AUTOMATOR */}
                {activeTab === 'catalog' && (
                  <div className="sa-vis sa-vis--catalog">
                    <div className="sa-ai-studio">
                      {/* Left Side: Upload Input */}
                      <div className="sa-studio__input">
                        <span className="sa-input__badge">INPUT PHOTO</span>
                        <div className="sa-input__photo">
                          <span className="sa-input__icon">👟</span>
                          <div className="sa-input__scan-line" />
                        </div>
                      </div>

                      {/* Transition Sparkle Arrow */}
                      <div className="sa-studio__divider">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sa-divider__spark">
                          <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.3-6.3l-.7.7M6.7 17.3l-.7.7m12.6 0l-.7-.7M6.7 6.7l-.7-.7" />
                        </svg>
                      </div>

                      {/* Right Side: Enhanced Output */}
                      <div className="sa-studio__output">
                        <div className="sa-output__header">
                          <span className="sa-output__badge">AI GENERATED</span>
                          <span className="sa-output__score">99.4% SEO</span>
                        </div>
                        <span className="sa-output__title">AirFlow Pro Sneakers (Onyx Black)</span>
                        <p className="sa-output__desc">High-performance running shoes designed for ultimate comfort and ventilation...</p>
                        <div className="sa-output__tags">
                          <span>#Performance</span>
                          <span>#Sneakers</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🚚 TAB 4: SMART LOGISTICS GRID */}
                {activeTab === 'logistics' && (
                  <div className="sa-vis sa-vis--logistics">
                    <div className="sa-logistics-panel">
                      <div className="sa-logistics-panel__header">
                        <span className="sa-logistics-panel__title">COURIER ROUTING CONSOLE</span>
                        <span className="sa-logistics-panel__hud">
                          <span className="sa-hud__pulse" />
                          Live Tracking
                        </span>
                      </div>

                      {/* Routing Metrics */}
                      <div className="sa-logistics-panel__carriers">
                        <div className="sa-carrier-card sa-carrier-card--active">
                          <div className="sa-carrier__details">
                            <span className="sa-carrier__name">BlueDart Premium</span>
                            <span className="sa-carrier__perf">98.4% On-Time • Auto-Assigned</span>
                          </div>
                          <span className="sa-carrier__price">₹62/kg</span>
                        </div>

                        <div className="sa-carrier-card sa-carrier-card--inactive">
                          <div className="sa-carrier__details">
                            <span className="sa-carrier__name">Delhivery Express</span>
                            <span className="sa-carrier__perf">94.2% On-Time • Standby</span>
                          </div>
                          <span className="sa-carrier__price">₹68/kg</span>
                        </div>
                      </div>

                      {/* AWB Tracker */}
                      <div className="sa-awb-card">
                        <span className="sa-awb__lbl">Active Delivery</span>
                        <span className="sa-awb__val">AWB #829482910 • In Hub (Out for Delivery)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Text Info Block under visual plate */}
              <div className="sa-info">
                <span className="sa-info__badge">{activeModule.badge}</span>
                <h3 className="sa-info__title">{activeModule.tagline}</h3>
                <p className="sa-info__desc">{activeModule.desc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
