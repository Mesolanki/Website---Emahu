'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import './delivery.css'; // Premium logistics landing page styles
import { registerUser } from '@/utils/auth';

/**
 * Enterprise Logistics & Delivery Partner Landing Page ("Main Page")
 * A high-end single landing page featuring:
 * 1. Premium Header (Navigation, Logo, Active CTA)
 * 2. Visual Hero Grid (Pitch, Taglines, Scroll CTA)
 * 3. Partner Benefits (Value Propositions)
 * 4. Interactive Earnings Calculator (Live drag sliders)
 * 5. Onboarding Registration Form (Searchable Hub dropdown)
 * 6. FAQ Accordions (Interactive drop list)
 * 7. Beautiful Footer
 */
export default function DeliveryLandingPage() {
  const formSectionRef = useRef(null);

  // --- Registration States ---
  const [deliveryName, setDeliveryName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [operatingLocation, setOperatingLocation] = useState('');
  const [perItemCharge, setPerItemCharge] = useState('80');
  const [deliveryScope, setDeliveryScope] = useState('local');
  const [dispatchNotes, setDispatchNotes] = useState('');

  const [errors, setErrors] = useState({});
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);


  // --- FAQ Accordion States ---
  const [activeFaq, setActiveFaq] = useState(null);

  // --- Searchable Hub List ---
  const AVAILABLE_HUBS = [
    { city: 'Mumbai', region: 'Maharashtra, IN' },
    { city: 'Delhi NCR', region: 'National Capital Region, IN' },
    { city: 'Bangalore', region: 'Karnataka, IN' },
    { city: 'London', region: 'Greater London, UK' },
    { city: 'New York', region: 'NY State, USA' },
    { city: 'Dubai', region: 'Jebel Ali, UAE' },
    { city: 'Nairobi', region: 'East Africa, KE' },
    { city: 'Addis Ababa', region: 'Shewa, ET' }
  ];

  const filteredHubs = AVAILABLE_HUBS.filter(hub => 
    hub.city.toLowerCase().includes(operatingLocation.toLowerCase()) ||
    hub.region.toLowerCase().includes(operatingLocation.toLowerCase())
  );

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const scrollToForm = () => {
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Form Validation
  const validateForm = () => {
    const newErrors = {};
    if (!deliveryName.trim()) {
      newErrors.deliveryName = 'Delivery Service or Driver Name is required';
    } else if (deliveryName.trim().length < 3) {
      newErrors.deliveryName = 'Name must be at least 3 characters';
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*\.\w{2,3}$/;
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    const phoneRegex = /^[+]?[0-9\s\-()]{7,15}$/;
    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required for dispatch alerts';
    } else if (!phoneRegex.test(phoneNumber.trim())) {
      newErrors.phoneNumber = 'Enter a valid mobile number (7-15 digits)';
    }

    if (!operatingLocation.trim()) {
      newErrors.operatingLocation = 'Operating Location Hub is required';
    }

    if (!perItemCharge.trim()) {
      newErrors.perItemCharge = 'Rate per kilometer is required';
    } else {
      const chargeVal = parseFloat(perItemCharge);
      if (isNaN(chargeVal) || chargeVal <= 0) {
        newErrors.perItemCharge = 'Enter a valid rate greater than 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    let city = '';
    let state = '';
    if (operatingLocation.includes(',')) {
      const parts = operatingLocation.split(',');
      city = parts[0].trim();
      state = parts[1].trim();
    } else {
      city = operatingLocation.trim();
      state = operatingLocation.trim();
    }

    try {
      await registerUser({
        name: deliveryName,
        email: email.trim(),
        password: password,
        role: 'delivery',
        phone: phoneNumber.trim(),
        address: operatingLocation,
        city: city,
        state: state,
        perItemCharge: parseFloat(perItemCharge),
        deliveryScope: deliveryScope,
        operatingLocation: operatingLocation,
        dispatchNotes: dispatchNotes
      });
      setLoading(false);
      setSubmitted(true);
    } catch (err) {
      setLoading(false);
      setErrors({ apiError: err.message || 'Registration failed' });
    }
  };

  return (
    <div className="lp-wrapper">
      {/* Visual Background Glow Overlays */}
      <div className="lp-glow lp-glow--1" />
      <div className="lp-glow lp-glow--2" />

      {/* ================= 1. PREMIUM HEADER ================= */}
      <header className="lp-header">
        <div className="lp-header-container">
          <Link href="/" className="lp-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="10" fill="#319795" />
              <path d="M8 12h16M8 16h12M8 20h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <span className="lp-logo-text">EMAHU</span>
          </Link>
          <nav className="lp-nav">
            <a href="#benefits" className="lp-nav-link">Benefits</a>
            <a href="#onboard" className="lp-nav-link">Register Profile</a>
            <a href="#faq" className="lp-nav-link">FAQs</a>
          </nav>

          <button onClick={scrollToForm} className="lp-header-cta">
            Join as Partner
          </button>
        </div>
      </header>

      {/* ================= 2. HERO SECTION ================= */}
      <section className="lp-hero">
        <div className="lp-section-container lp-hero-grid">
          
          <div className="lp-hero-text">
            <div className="lp-badge">LOGISTICS & DISPATCH PARTNERSHIP</div>
            <h1 className="lp-hero-title">
              Scale Your Fleet. <br />
              <span>Deliver with EMAHU.</span>
            </h1>
            <p className="lp-hero-subtitle">
              Onboard as an independent dispatch agency or individual logistics carrier. Set your own per-kilometer rates, access optimal grid routes, and earn steady revenue.
            </p>
            <div className="lp-hero-actions">
              <button onClick={scrollToForm} className="lp-btn lp-btn--primary">
                Register Your Profile
              </button>
            </div>
          </div>

          {/* Hero Visual Card / Grid Block */}
          <div className="lp-hero-visual">
            <div className="visual-card">
              <div className="visual-badge">Logistics Grid</div>
              <div className="visual-icon-box">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#319795" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
              </div>
              <h3>Smart Hub Routing</h3>
              <p>{"Optimize your carrier mileage with EMAHU's automated hub dispatch routes."}</p>
              <div className="visual-stats">
                <div className="stat-item">
                  <span className="stat-num">8+</span>
                  <span className="stat-label">Global Hubs</span>
                </div>
                <div className="stat-item">
                  <span className="stat-num">100%</span>
                  <span className="stat-label">Transparent Payouts</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ================= 3. BENEFITS SECTION ================= */}
      <section id="benefits" className="lp-benefits">
        <div className="lp-section-container">
          
          <div className="section-header">
            <h2 className="section-title">Why Partner with EMAHU?</h2>
            <p className="section-subtitle">We empower logistics carriers with custom pricing tools, route optimization, and robust dispatch frameworks.</p>
          </div>

          <div className="benefits-grid">
            
            <div className="benefit-card">
              <div className="benefit-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <h4>Flexible Schedules</h4>
              <p>Work whenever you want. You select your routes, delivery frequency, and operating timing windows.</p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
              </div>
              <h4>Direct Payouts</h4>
              <p>Enjoy stable weekly settlements directly to your bank account or company wallet with 0% extra processing fees.</p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              </div>
              <h4>Custom Per-KM Rates</h4>
              <p>Set your own rate per kilometer. We match you with bulk merchant deliveries that align with your pricing.</p>
            </div>

          </div>

        </div>
      </section>


      {/* ================= 5. REGISTRATION FORM SECTION ================= */}
      <section id="onboard" ref={formSectionRef} className="lp-form-section">
        <div className="lp-section-container">
          
          <div className="section-header">
            <h2 className="section-title">Logistics Partner Registration</h2>
            <p className="section-subtitle">Set up your profile, choose your dispatch hub, and apply for onboarding in minutes.</p>
          </div>

          <div className="form-card-wrapper">
            {!submitted ? (
              <form className="lp-form" onSubmit={handleSubmit} noValidate>
                {errors.apiError && (
                  <div style={{ padding: '12px 16px', backgroundColor: 'rgba(220, 38, 38, 0.15)', border: '1px solid #dc2626', borderRadius: '8px', color: '#f87171', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>
                    ⚠️ {errors.apiError}
                  </div>
                )}
                <div className="form-grid">
                  
                  {/* Driver/Agency Name */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="deliveryName">Delivery Service / Driver Name</label>
                    <input 
                      type="text" 
                      id="deliveryName"
                      className={`form-input ${errors.deliveryName ? 'form-input--error' : ''}`}
                      placeholder="e.g. Mumbai Express or John Logistics"
                      value={deliveryName}
                      onChange={(e) => {
                        setDeliveryName(e.target.value);
                        if (errors.deliveryName) setErrors({ ...errors, deliveryName: '' });
                      }}
                      disabled={loading}
                    />
                    {errors.deliveryName && <span className="form-error">{errors.deliveryName}</span>}
                  </div>

                  {/* Phone Number */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="phoneNumber">Dispatch Mobile Number</label>
                    <input 
                      type="tel" 
                      id="phoneNumber"
                      className={`form-input ${errors.phoneNumber ? 'form-input--error' : ''}`}
                      placeholder="e.g. +91 98765 43210"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: '' });
                      }}
                      disabled={loading}
                    />
                    {errors.phoneNumber && <span className="form-error">{errors.phoneNumber}</span>}
                  </div>

                  {/* Email */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="email">Email Address</label>
                    <input 
                      type="email" 
                      id="email"
                      className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                      placeholder="e.g. partner@emahu.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors({ ...errors, email: '' });
                      }}
                      disabled={loading}
                    />
                    {errors.email && <span className="form-error">{errors.email}</span>}
                  </div>

                  {/* Password */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="password">Password</label>
                    <input 
                      type="password" 
                      id="password"
                      className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors({ ...errors, password: '' });
                      }}
                      disabled={loading}
                    />
                    {errors.password && <span className="form-error">{errors.password}</span>}
                  </div>

                  {/* Searchable Hub Location Dropdown */}
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label" htmlFor="operatingLocation">Operating Location / City Hub</label>
                    <input 
                      type="text" 
                      id="operatingLocation"
                      className={`form-input ${errors.operatingLocation ? 'form-input--error' : ''}`}
                      placeholder="Search hub (e.g. Mumbai, Bangalore...)"
                      value={operatingLocation}
                      onChange={(e) => {
                        setOperatingLocation(e.target.value);
                        if (errors.operatingLocation) setErrors({ ...errors, operatingLocation: '' });
                      }}
                      onFocus={() => setShowDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                      disabled={loading}
                      autoComplete="off"
                    />

                    {showDropdown && (
                      <div className="lp-dropdown">
                        <div className="lp-dropdown-title">Available EMAHU Logistics Hubs</div>
                        {filteredHubs.length > 0 ? (
                          filteredHubs.map((hub, idx) => (
                            <div 
                              key={idx} 
                              className="lp-dropdown-item"
                              onMouseDown={() => {
                                setOperatingLocation(`${hub.city}, ${hub.region}`);
                                setShowDropdown(false);
                                if (errors.operatingLocation) setErrors({ ...errors, operatingLocation: '' });
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#319795" strokeWidth="2.5" style={{ marginRight: '8px', flexShrink: 0 }}>
                                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                              </svg>
                              <div>
                                <strong style={{ color: '#0f172a' }}>{hub.city}</strong>
                                <span style={{ color: '#64748b', fontSize: '0.8rem' }}> - {hub.region}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="lp-dropdown-item lp-dropdown-item--custom" style={{ cursor: 'default' }}>
                            <span>Use custom: &quot;{operatingLocation}&quot;</span>
                          </div>
                        )}
                      </div>
                    )}
                    {errors.operatingLocation && <span className="form-error">{errors.operatingLocation}</span>}
                  </div>

                  {/* Delivery Scope */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="deliveryScope">Delivery Scope</label>
                    <select 
                      id="deliveryScope"
                      className="form-input"
                      style={{ height: '46px', cursor: 'pointer', appearance: 'auto', backgroundColor: '#1e1e24', color: '#fff' }}
                      value={deliveryScope}
                      onChange={(e) => setDeliveryScope(e.target.value)}
                      disabled={loading}
                    >
                      <option value="local">Same City (Local)</option>
                      <option value="interstate">State to State (Interstate)</option>
                    </select>
                  </div>

                  {/* Rate Per KM */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="perItemCharge">Custom Rate Per KM (₹ / km)</label>
                    <div className="form-input-group">
                      <span className="form-input-prefix">₹</span>
                      <input 
                        type="number" 
                        step="1"
                        min="1"
                        id="perItemCharge"
                        className={`form-input form-input--has-prefix ${errors.perItemCharge ? 'form-input--error' : ''}`}
                        placeholder="80"
                        value={perItemCharge}
                        onChange={(e) => {
                          setPerItemCharge(e.target.value);
                          if (errors.perItemCharge) setErrors({ ...errors, perItemCharge: '' });
                        }}
                        disabled={loading}
                      />
                    </div>
                    {errors.perItemCharge && <span className="form-error">{errors.perItemCharge}</span>}
                  </div>

                  {/* Custom Dispatch Notes */}
                  <div className="form-group form-group--full">
                    <label className="form-label" htmlFor="dispatchNotes">Dispatch remarks & Route Notes</label>
                    <textarea 
                      id="dispatchNotes"
                      className="form-textarea"
                      placeholder="e.g. Standard 10% volume discount, heavy payload trucks available..."
                      value={dispatchNotes}
                      onChange={(e) => setDispatchNotes(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                </div>

                <button type="submit" className={`form-btn ${loading ? 'form-btn--loading' : ''}`} disabled={loading}>
                  {loading ? (
                    <>
                      <div className="form-spinner" />
                      <span>Registering Fleet Profile...</span>
                    </>
                  ) : (
                    <span>Register Dispatch Profile &nbsp; ➔</span>
                  )}
                </button>
              </form>
            ) : (
              /* ================= SUCCESS PROFILE INVOICE CARD ================= */
              <div className="lp-success-card">
                <div className="success-badge" style={{ backgroundColor: 'orange' }}>⏳</div>
                <h2 className="success-title">Onboarding Registration Submitted!</h2>
                <p className="success-subtitle" style={{ color: '#cbd5e1' }}>
                  Your profile has been created successfully and is **pending administrative approval**. 
                  Once our central team approves your application, you will be active on the logistics grid.
                </p>

                <div className="success-ticket">
                  <div className="ticket-header">
                    <span>Partner Registration Details</span>
                    <span className="ticket-status" style={{ backgroundColor: '#b45309', color: '#fef3c7' }}>PENDING REVIEW</span>
                  </div>
                  <div className="ticket-body">
                    <div className="ticket-row">
                      <span className="ticket-label">Fleet/Driver Name</span>
                      <span className="ticket-val">{deliveryName}</span>
                    </div>
                    <div className="ticket-row">
                      <span className="ticket-label">Email Address</span>
                      <span className="ticket-val">{email}</span>
                    </div>
                    <div className="ticket-row">
                      <span className="ticket-label">Contact Phone</span>
                      <span className="ticket-val">{phoneNumber}</span>
                    </div>
                    <div className="ticket-row">
                      <span className="ticket-label">Operating Hub</span>
                      <span className="ticket-val ticket-val--teal">{operatingLocation}</span>
                    </div>
                    <div className="ticket-row">
                      <span className="ticket-label">Scope</span>
                      <span className="ticket-val" style={{ textTransform: 'capitalize' }}>{deliveryScope}</span>
                    </div>
                    <div className="ticket-row">
                      <span className="ticket-label">Custom rate per KM</span>
                      <span className="ticket-val ticket-val--teal">₹{parseFloat(perItemCharge).toFixed(2)} / km</span>
                    </div>
                    {dispatchNotes.trim() && (
                      <div className="ticket-row ticket-row--vertical">
                        <span className="ticket-label">Special Remarks</span>
                        <div className="ticket-remarks">{dispatchNotes}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ================= 6. FAQs SECTION ================= */}
      <section id="faq" className="lp-faq">
        <div className="lp-section-container">
          
          <div className="section-header">
            <h2 className="section-title">Frequently Asked Questions</h2>
            <p className="section-subtitle">Here are the answers to the most common questions from our delivery and dispatch partners.</p>
          </div>

          <div className="faq-list">
            
            <div className={`faq-item ${activeFaq === 0 ? 'faq-item--active' : ''}`} onClick={() => toggleFaq(0)}>
              <div className="faq-question">
                <span>How do weekly payouts work?</span>
                <span className="faq-toggle-icon"></span>
              </div>
              <div className="faq-answer">
                Payouts are calculated every Sunday at midnight and directly transferred to your registered bank account or digital ledger wallet by Wednesday morning. No hidden transaction fees apply.
              </div>
            </div>

            <div className={`faq-item ${activeFaq === 1 ? 'faq-item--active' : ''}`} onClick={() => toggleFaq(1)}>
              <div className="faq-question">
                <span>Can I operate in multiple locations?</span>
                <span className="faq-toggle-icon"></span>
              </div>
              <div className="faq-answer">
                Yes! You can register multiple fleet profiles or configure broader dispatch territories under a single dispatch agency profile by contacting our operational support team.
              </div>
            </div>

            <div className={`faq-item ${activeFaq === 2 ? 'faq-item--active' : ''}`} onClick={() => toggleFaq(2)}>
              <div className="faq-question">
                <span>How is the custom rate per kilometer verified?</span>
                <span className="faq-toggle-icon"></span>
              </div>
              <div className="faq-answer">
                Your rate is presented directly to merchant sellers in your operating territory. Sellers choose partners based on rates and delivery dispatch history ratings, ensuring fair competition.
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ================= 7. BEAUTIFUL FOOTER ================= */}
      <footer className="lp-footer">
        <div className="lp-section-container">
          <div className="footer-top">
            <div className="footer-brand">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" style={{ marginRight: '8px' }}>
                <rect width="32" height="32" rx="10" fill="#319795" />
                <path d="M8 12h16M8 16h12M8 20h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              <span>EMAHU LOGISTICS</span>
            </div>
            <div className="footer-links">
              <Link href="/">Back to Selector</Link>
              <a href="#benefits">Benefits</a>
              <a href="#faq">FAQs</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 EMAHU Inc. All logistics and partner rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
