'use client';

import { useState } from 'react';
import './buyer_extra_sections.css';

/* ───────────────────────────────────────
   1. DATA DEFINITIONS
   ─────────────────────────────────────── */
const stepsData = [
  {
    num: 'STEP 01',
    title: 'Curated Drops',
    desc: 'Browse through our bento collections of 100% verified premium electronics, minimalist apparel, and dining essentials.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    )
  },
  {
    num: 'STEP 02',
    title: 'Payment Lock',
    desc: 'Checkout securely. Your transaction amount is locked in a military-grade secure Emahu vault, protecting your payment.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    )
  },
  {
    num: 'STEP 03',
    title: 'Hub Inspection',
    desc: 'Our physical hub experts hand-audit the item’s packaging and seal integrity to issue a certified check report.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    )
  },
  {
    num: 'STEP 04',
    title: 'Green Dispatch',
    desc: 'We route the order through local carbon-neutral EV courier dispatch agents to arrive at your door in under 48 hours.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    )
  }
];

const reviewsData = [
  {
    stars: 5,
    quote: "Absolutely blown away by the quality inspection report! The sneakers arrived with a certified check tag and seal. EMAHU is the future of retail.",
    name: "Ananya S.",
    role: "Verified Buyer",
    tag: "Sneakers"
  },
  {
    stars: 5,
    quote: "The Emahu payment option gave me complete peace of mind. Knowing my money was locked securely until I approved the delivery is a game-changer!",
    name: "Vikram R.",
    role: "Verified Buyer",
    tag: "Electronics"
  },
  {
    stars: 5,
    quote: "Instant wallet return worked like absolute magic! The pickup agent scanned my return at 2 PM, and my wallet balance was credited by 2:05 PM. Outstanding!",
    name: "Priya M.",
    role: "Verified Buyer",
    tag: "Kitchenware"
  }
];

const faqsData = [
  {
    question: "How does the 100% Quality Inspection work?",
    answer: "Every order placed is physically routed from the merchant through our localized inspection hubs. Our certified quality experts inspect the item, verify its structural integrity, ensure it is original and genuine, and then pack it with a specialized certified seal tag before direct dispatch to you."
  },
  {
    question: "What is an Emahu Payment Vault?",
    answer: "EMAHU’s Emahu Vault is a secure digital vault where your checkout payments are held. The seller only receives payment when you receive your order in perfect condition and click 'Confirm Delivery' on your dashboard, completely eliminating purchase risks."
  },
  {
    question: "How do returns work and how fast is the refund?",
    answer: "Returns are incredibly easy. Just click 'Request Return' from your order history. The moment our dispatch courier agent scans the return label barcode at your doorstep, our system auto-authorizes and credits the refund instantly into your EMAHU wallet."
  },
  {
    question: "Is the 48-Hour delivery really carbon-neutral?",
    answer: "Yes, we are highly committed to sustainable logistics. Our smart delivery routers prioritize shipping routes through our localized EV (Electric Vehicle) dispatch fleets. We offset 100% of transport emissions on regional long-haul couriers to deliver within 48 hours eco-safely."
  }
];

/* ───────────────────────────────────────
   2. HOW WE WORK TIMELINE COMPONENT
   ─────────────────────────────────────── */
export function BuyerHowWeWork() {
  return (
    <section className="bx-section bx-section--light-slate" id="how-it-works">
      <div className="bx-container">

        {/* Section Header */}
        <div className="bx-header">
          <span className="bx-header__badge">The Emahu Pipeline</span>
          <h2 className="bx-header__title">How We Guarantee Perfection</h2>
          <p className="bx-header__desc">
            From the moment you checkout to the doorstep delivery, every single order passes through a strict transparent cycle.
          </p>
        </div>

        {/* Timeline Steps */}
        <div className="bx-steps">
          {stepsData.map((step, idx) => (
            <div key={idx} className="bx-step-card">
              <span className="bx-step-card__num">{step.num}</span>
              <div className="bx-step-card__icon-wrap">
                {step.icon}
              </div>
              <h3 className="bx-step-card__title">{step.title}</h3>
              <p className="bx-step-card__desc">{step.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

/* ───────────────────────────────────────
   3. VERIFIED CUSTOMER REVIEWS (BENTO)
   ─────────────────────────────────────── */
export function BuyerReviews() {
  return (
    <section className="bx-section" id="customer-reviews">
      <div className="bx-container">

        {/* Section Header */}
        <div className="bx-header">
          <span className="bx-header__badge">Customer Stories</span>
          <h2 className="bx-header__title">Loved by Thousands of Buyers</h2>
          <p className="bx-header__desc">
            Discover why smart buyers choose EMAHU for premium electronics, secure Emahus, and lightning-fast logistics.
          </p>
        </div>

        {/* Bento Reviews Grid */}
        <div className="bx-bento-grid">
          {reviewsData.map((rev, idx) => (
            <div key={idx} className="bx-review-card">
              <div>
                {/* Stars Indicator */}
                <div className="bx-review-card__stars">
                  {[...Array(rev.stars)].map((_, i) => (
                    <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                <p className="bx-review-card__quote">&quot;{rev.quote}&quot;</p>
              </div>

              {/* Card Footer Info */}
              <div className="bx-review-card__footer">
                <div className="bx-review-card__author">
                  <span className="bx-review-card__name">{rev.name}</span>
                  <span className="bx-review-card__role">{rev.role}</span>
                </div>
                <span className="bx-review-card__tag">{rev.tag}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

/* ───────────────────────────────────────
   4. TRUST FAQS ACCORDION COMPONENT
   ─────────────────────────────────────── */
export function BuyerFaqs() {
  const [openIdx, setOpenIdx] = useState(null);

  const toggleFaq = (idx) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section className="bx-section bx-section--light-slate" id="buyer-faqs">
      <div className="bx-container">

        {/* Section Header */}
        <div className="bx-header">
          <span className="bx-header__badge">Got Questions?</span>
          <h2 className="bx-header__title">Assurance & Trust Center</h2>
          <p className="bx-header__desc">
            Everything you need to know about our physical hub inspections, safe payment vaulting, and express refunds.
          </p>
        </div>

        {/* Accordion List */}
        <div className="bx-faq-container">
          {faqsData.map((faq, idx) => {
            const isActive = openIdx === idx;
            return (
              <div key={idx} className={`bx-faq-item ${isActive ? 'bx-faq-item--active' : ''}`}>
                <button
                  className="bx-faq-header"
                  onClick={() => toggleFaq(idx)}
                  aria-expanded={isActive}
                >
                  <span className="bx-faq-title">{faq.question}</span>
                  <div className="bx-faq-toggle">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                <div
                  className="bx-faq-body"
                  style={{ maxHeight: isActive ? '200px' : '0px' }}
                >
                  <div className="bx-faq-content">
                    {faq.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

export function BuyerStartBuying() {
  return (
    <section className="bx-cta-section" id="start-buying-now">
      <div className="bx-cta-glow bx-cta-glow--1" />
      <div className="bx-cta-glow bx-cta-glow--2" />
      <div className="bx-cta-container">
        <h2 className="bx-cta-title">Ready to Start Buying Premium Drops?</h2>
        <p className="bx-cta-desc">
          Shop verified tech, minimalist apparel, and sustainable kitchenware with full buyer protection and secure Emahu vaults.
        </p>
        <div className="bx-cta-actions">
          <a href="#categories" className="bx-cta-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="bx-cta-btn__icon" style={{ marginRight: '8px' }}>
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span>Start Buying Products</span>
          </a>
        </div>
        <div className="bx-cta-badges">
          <div className="bx-cta-badge-item">
            <span className="bx-cta-badge-dot" />
            <span>100% Inspected Goods</span>
          </div>
          <div className="bx-cta-badge-item">
            <span className="bx-cta-badge-dot" />
            <span>Protected Emahu Checkout</span>
          </div>
          <div className="bx-cta-badge-item">
            <span className="bx-cta-badge-dot" />
            <span>48-Hour Eco-Express</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BuyerEmahuAssurance() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { label: 'Payment Emahu Locked', status: '🔒 SECURED', desc: 'Transaction amount is locked in a military-grade secure vault. The merchant cannot touch it.' },
    { label: 'Physical Quality Check Passed', status: '🛡️ CERTIFIED', desc: 'Expert inspection hub physically verifies packaging, authenticity, structural integrity, and seals the package.' },
    { label: 'Dispatch and Carbon-Neutral Transit', status: '🚚 IN TRANSIT', desc: 'Order dispatched via localized zero-carbon EV fleet, delivering straight to your door in under 48 hours.' },
    { label: 'Vault Released to Seller', status: '🔓 RELEASED', desc: 'You confirm delivery, verify product excellence, and release the funds to the merchant.' }
  ];

  return (
    <section className="bx-section bx-Emahu-section" id="Emahu-assurance">
      <div className="bx-container">

        {/* Section Header */}
        <div className="bx-header">
          <span className="bx-header__badge" style={{ backgroundColor: 'rgba(65, 105, 225, 0.1)', color: '#4169e1' }}>Emahu Guarantee</span>
          <h2 className="bx-header__title">Complete Authentic Emahu Safety</h2>
          <p className="bx-header__desc">
            Your money stays completely safe in our secure vault system. The merchant is paid only when you receive and confirm your order in perfect condition.
          </p>
        </div>

        {/* 2-Column Bento grid */}
        <div className="bx-Emahu-grid">

          {/* Left Column: Emahu Interactive Visual Simulator */}
          <div className="bx-Emahu-visual">
            <div className="bx-Emahu-badge">
              <span className="bx-cta-badge-dot" style={{ backgroundColor: '#12b7b2' }} />
              <span>Emahu Simulator</span>
            </div>

            <div className="bx-Emahu-shield">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>

            <div className="bx-Emahu-amount">
              <div className="bx-Emahu-amount__num">
                {activeStep === 3 ? '₹0.00' : '₹14,500.00'}
              </div>
              <div className="bx-Emahu-amount__label">
                {activeStep === 3 ? 'VAULT RELEASED TO MERCHANT' : 'LOCKED IN Emahu VAULT'}
              </div>
            </div>

            {/* Interactive Pipeline Steps */}
            <div className="bx-Emahu-pipeline">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className={`bx-Emahu-step ${activeStep === idx ? 'bx-Emahu-step--active' : ''}`}
                  onClick={() => setActiveStep(idx)}
                >
                  <div className="bx-Emahu-step__icon">
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="bx-Emahu-step__label">{step.label}</div>
                    {activeStep === idx && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px', lineHeight: '1.4' }}>
                        {step.desc}
                      </div>
                    )}
                  </div>
                  <span className="bx-Emahu-step__status">{step.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Three Big Pillars of Trust */}
          <div className="bx-Emahu-pillars">

            <div className="bx-Emahu-pillar">
              <div className="bx-Emahu-pillar__icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div>
                <h3 className="bx-Emahu-pillar__title">Buyer Emahu Vault</h3>
                <p className="bx-Emahu-pillar__desc">
                  {"Every order checkouts into a secure bank-grade Emahu. The seller cannot withdraw the transaction amount until you inspect the delivery at your door and click 'Verify Delivery'."}
                </p>
              </div>
            </div>

            <div className="bx-Emahu-pillar">
              <div className="bx-Emahu-pillar__icon-wrap" style={{ color: '#12b7b2' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div>
                <h3 className="bx-Emahu-pillar__title">Expert Certified Verification</h3>
                <p className="bx-Emahu-pillar__desc">
                  We route products from physical stores straight through our authorized hubs. Certified inspectors inspect packaging, authenticity, structural parts, and issue a digital check report seal.
                </p>
              </div>
            </div>

            <div className="bx-Emahu-pillar">
              <div className="bx-Emahu-pillar__icon-wrap" style={{ color: '#ff6b6b' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 12 15 3 6" />
                  <polyline points="23 9 12 20 3 11" />
                </svg>
              </div>
              <div>
                <h3 className="bx-Emahu-pillar__title">Zero-Wait Doorstep Refund</h3>
                <p className="bx-Emahu-pillar__desc">
                  Returns are verified in seconds. Once our EV courier courier scans the pickup barcode at your home, the Emahu system immediately credits your wallet balance without any merchant delays.
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}


