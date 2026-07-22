'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './buyer-register.css';
import { registerUser, saveAuthSession, googleLoginUser, fetchWithRetry } from '@/utils/auth';
import { useGoogleAuth } from '@/utils/useGoogleAuth';
import { detectLocationWithGPS } from '@/utils/location';
import { wakeupServer } from '@/utils/serverWakeup';

/**
 * Retail Buyer Registration Component
 * A premium multi-step buyer onboarding wizard with instant validation,
 * automated address settings, and beautiful progress indications.
 */
export default function BuyerRegister() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [gpsDetectLoading, setGpsDetectLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [hasOpenedTerms, setHasOpenedTerms] = useState(false);

  useEffect(() => {
    // Pre-warm backend and database on landing to avoid cold start latency
    wakeupServer();
  }, []);

  // Form State Values
  const [formData, setFormData] = useState({
    // Step 1: Account Setup
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    // Step 2: Shipping details
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const [errors, setErrors] = useState({});

  // OTP Verification States
  const [emailOtp, setEmailOtp] = useState('');
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [mockOtpCode, setMockOtpCode] = useState('');
  const [isMockOtpActive, setIsMockOtpActive] = useState(false);

  // If already logged in, redirect directly to the buyer account marketplace home
  useEffect(() => {
    if (localStorage.getItem('emahu_buyer_logged_in') === 'true') {
      router.replace('/buyer/products');
    }
  }, [router]);

  // Read query params for Google Auth prefill
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const emailParam = urlParams.get('email');
      const nameParam = urlParams.get('name');
      if (emailParam) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData((prev) => ({
          ...prev,
          email: emailParam,
          fullName: nameParam || emailParam.split('@')[0],
          password: `GoogleAuthPass_${Math.random().toString(36).substring(2, 10)}`
        }));
        setErrors({ general: 'Google account connected. Please complete the registration details below.' });
      }
    }
  }, []);

  const onGoogleSuccess = useCallback(async ({ email, name, idToken }) => {
    setLoading(true);
    setErrors({});
    try {
      const data = await googleLoginUser({ email, name, role: 'buyer', idToken });
      if (data.exists === false) {
        setLoading(false);
        setFormData((prev) => ({
          ...prev,
          email: data.email || '',
          fullName: data.name || '',
          password: `GoogleAuthPass_${Math.random().toString(36).substring(2, 10)}`
        }));
        setErrors({ general: 'Google account connected! Please enter your phone number and address to register.' });
        return;
      }
      if (data.user && data.user.role !== 'buyer' && data.user.role !== 'admin') {
        throw new Error('Access denied. Please log in using the correct portal.');
      }
      saveAuthSession(data, 'buyer');
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        router.replace('/buyer/products');
      }, 1000);
    } catch (err) {
      setLoading(false);
      setErrors({ general: err.message || 'Google Sign-In failed' });
    }
  }, [router]);

  const onGoogleError = useCallback((msg) => {
    setErrors({ general: msg });
  }, []);

  const { triggerGoogleSignIn, isGoogleEnabled, renderGoogleButton } = useGoogleAuth(onGoogleSuccess, onGoogleError);

  const handleGoogleSignIn = () => triggerGoogleSignIn();

  useEffect(() => {
    if (isGoogleEnabled) {
      renderGoogleButton('google-signin-btn');
    }
  }, [isGoogleEnabled, renderGoogleButton]);




  const handleSendEmailOtp = async () => {
    if (!formData.phone.trim()) {
      setErrors((prev) => ({ ...prev, phone: 'Phone number is required to send verification code' }));
      return;
    }
    if (!/^\d{10}$/.test(formData.phone.trim())) {
      setErrors((prev) => ({ ...prev, phone: 'Enter a valid 10-digit mobile number' }));
      return;
    }
    setOtpLoading(true);
    setErrors((prev) => ({ ...prev, email: '', phone: '', general: '' }));
    setDevOtp('');
    try {
      let cleanPhone = formData.phone.trim();
      if (cleanPhone.startsWith('+91')) {
        cleanPhone = cleanPhone.slice(3);
      } else if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
        cleanPhone = cleanPhone.slice(2);
      }

      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetchWithRetry(`${apiBase}/api/auth/send-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, role: 'buyer' })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP code.');
      }

      setIsEmailOtpSent(true);
      if (data.devOtp) {
        setMockOtpCode(data.devOtp);
        setIsMockOtpActive(true);
        setErrors((prev) => ({ ...prev, phone: '⚠️ Twilio credentials not configured in backend. Falling back to simulated verification code.' }));
      } else {
        setIsMockOtpActive(false);
        setMockOtpCode('');
        setErrors((prev) => ({ ...prev, general: '' }));
      }
    } catch (err) {
      console.error('Send OTP Error:', err);

      // Fallback
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setMockOtpCode(code);
      setIsMockOtpActive(true);
      setIsEmailOtpSent(true);
      setErrors((prev) => ({ ...prev, phone: err.message || 'Failed to send verification code. Please try again.' }));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp.trim()) {
      setErrors((prev) => ({ ...prev, otp: 'Please enter the verification code' }));
      return;
    }
    setOtpLoading(true);
    setErrors((prev) => ({ ...prev, otp: '', general: '' }));
    try {
      let cleanPhone = formData.phone.trim();
      if (cleanPhone.startsWith('+91')) {
        cleanPhone = cleanPhone.slice(3);
      } else if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
        cleanPhone = cleanPhone.slice(2);
      }

      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetchWithRetry(`${apiBase}/api/auth/verify-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          otp: emailOtp.trim(),
          email: formData.email
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify OTP.');
      }

      setIsEmailVerified(true);
      setIsEmailOtpSent(false);
      setStep(2);
      setErrors((prev) => ({ ...prev, general: '' }));
    } catch (err) {
      console.error('Verify OTP Error:', err);
      setErrors((prev) => ({ ...prev, otp: err.message || 'Invalid or expired verification code.' }));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleGPSDetectRegister = async () => {
    setGpsDetectLoading(true);
    setErrors((prev) => ({ ...prev, general: '' }));
    try {
      const res = await detectLocationWithGPS();
      setFormData((prev) => ({
        ...prev,
        address: res.streetAddress || res.fullAddress || prev.address,
        city: res.city || prev.city,
        state: res.state || prev.state,
        zipCode: res.pincode || prev.zipCode,
      }));
      setErrors((prev) => ({ ...prev, address: '', city: '', state: '', zipCode: '' }));
    } catch (err) {
      console.error('Registration GPS detect error:', err);
      setErrors((prev) => ({
        ...prev,
        general: 'Unable to detect GPS location. Please allow browser location access or enter your address manually.',
      }));
    } finally {
      setGpsDetectLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name] || errors.general) {
      setErrors((prev) => ({ ...prev, [name]: '', general: '' }));
    }
  };

  // Step 1 Validation
  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Enter a valid 10-digit mobile number';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.address.trim()) {
      newErrors.address = 'Street address is required';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!formData.state.trim()) {
      newErrors.state = 'State/Region is required';
    }
    if (!formData.zipCode.trim()) {
      newErrors.zipCode = 'Zip/Postal code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      const isGoogleReg = formData.password && formData.password.startsWith('GoogleAuthPass_');
      if (isGoogleReg) {
        setStep(2);
      } else {
        handleSendEmailOtp();
      }
    }
  };

  const handlePrev = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateStep2()) {
      setLoading(true);
      setErrors({});

      try {
        const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} - ${formData.zipCode}`;

        // Call the secure backend registration API
        const data = await registerUser({
          name: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: 'buyer',
          phone: formData.phone,
          address: fullAddress,
        });

        // Save session credentials
        saveAuthSession(data, 'buyer');
        setLoading(false);
        setSuccess(true);

        setTimeout(() => {
          router.replace('/buyer/products');
        }, 1500);
      } catch (err) {
        setLoading(false);
        setErrors({ general: err.message || 'Registration failed. Please try again.' });
      }
    }
  };

  return (
    <div className="br-wrapper">
      {/* Sparkles / Ambient design items */}
      <div className="br-blob br-blob--1" />
      <div className="br-blob br-blob--2" />

      <div className="br-container">

        {/* Step Indicator Panel (Left Sidebar) */}
        <div className="br-progress-panel">
          <Link href="/" className="br-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="10" fill="#4169e1" />
              <path d="M8 12h16M8 16h12M8 20h14" stroke="white" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span className="br-logo__text">EMAHU</span>
          </Link>

          <div className="br-steps-list">

            {/* Step 1 indicator */}
            <div className={`br-step-item ${step === 1 ? 'br-step-item--active' : ''} ${step > 1 ? 'br-step-item--completed' : ''}`}>
              <div className="br-step-item__number">
                {step > 1 ? (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5l3.5 3.5 6.5-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : '1'}
              </div>
              <div className="br-step-item__text">
                <span className="br-step-item__title">Personal Account</span>
                <span className="br-step-item__subtitle">Your basic account credentials</span>
              </div>
            </div>

            {/* Step 2 indicator */}
            <div className={`br-step-item ${step === 2 ? 'br-step-item--active' : ''} ${success ? 'br-step-item--completed' : ''}`}>
              <div className="br-step-item__number">
                {success ? (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5l3.5 3.5 6.5-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : '2'}
              </div>
              <div className="br-step-item__text">
                <span className="br-step-item__title">Delivery Address</span>
                <span className="br-step-item__subtitle">Standard shipping details</span>
              </div>
            </div>

          </div>

          <div className="br-progress-footer">
            <span className="br-progress-footer__label">Buyer Portal Setup</span>
            <div className="br-progress-bar-bg">
              <div className="br-progress-bar-fill" style={{ width: `${(step / 2) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Right side form card */}
        <div className="br-form-panel">

          {!success ? (
            <>
              {errors.general && (
                <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fca5a5', fontSize: '0.85rem', marginBottom: '16px' }}>
                  {errors.general}
                </div>
              )}
              {step === 1 && (
                <div className="br-step-content">
                  <div>
                    <h1 className="br-title">Create Buyer Account</h1>
                    <p className="br-subtitle">Sign up as a personal shopper to find premium items.</p>
                  </div>

                  <div className="br-form-grid">
                    <div className="br-field br-field--full">
                      <label className="br-label" htmlFor="fullName">Full Name</label>
                      <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        className={`br-input ${errors.fullName ? 'br-input--error' : ''}`}
                        placeholder="e.g. Rahul Sharma"
                        value={formData.fullName}
                        onChange={handleInputChange}
                      />
                      {errors.fullName && <span className="br-error">{errors.fullName}</span>}
                    </div>

                    {formData.password && formData.password.startsWith('GoogleAuthPass_') ? (
                      <div className="br-field br-field--full">
                        <label className="br-label">Connected Google Email</label>
                        <input
                          type="text"
                          className="br-input"
                          value={formData.email}
                          disabled
                        />
                      </div>
                    ) : (
                      <div className="br-field br-field--full">
                        <label className="br-label" htmlFor="email">Email Address</label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          className={`br-input ${errors.email ? 'br-input--error' : ''}`}
                          placeholder="e.g. name@example.com"
                          value={formData.email}
                          onChange={handleInputChange}
                        />
                        {errors.email && <span className="br-error">{errors.email}</span>}
                      </div>
                    )}

                    <div className="br-field br-field--full">
                      <label className="br-label" htmlFor="phone">Phone Number</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        className={`br-input ${errors.phone ? 'br-input--error' : ''}`}
                        placeholder="9876543210"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      />
                      {errors.phone && <span className="br-error">{errors.phone}</span>}
                    </div>

                    <div className="br-field">
                      <label className="br-label" htmlFor="password">Create a Password</label>
                      <input
                        type="password"
                        id="password"
                        name="password"
                        className={`br-input ${errors.password ? 'br-input--error' : ''}`}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleInputChange}
                      />
                      {errors.password && <span className="br-error">{errors.password}</span>}
                    </div>

                    <div className="br-field">
                      <label className="br-label" htmlFor="confirmPassword">Confirm Password</label>
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        className={`br-input ${errors.confirmPassword ? 'br-input--error' : ''}`}
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                      />
                      {errors.confirmPassword && <span className="br-error">{errors.confirmPassword}</span>}
                    </div>
                  </div>

                  {/* Terms & Conditions Checkbox */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '20px 0 12px 0', padding: '0 4px' }}>
                    <input
                      id="agree-portal-terms"
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      disabled={!hasOpenedTerms}
                      style={{ width: '16px', height: '16px', marginTop: '2px', cursor: hasOpenedTerms ? 'pointer' : 'not-allowed' }}
                    />
                    <label htmlFor="agree-portal-terms" style={{ fontSize: '0.78rem', color: '#475569', lineHeight: '1.4', cursor: hasOpenedTerms ? 'pointer' : 'not-allowed', userSelect: 'none' }}>
                      <span style={{ color: hasOpenedTerms ? '#475569' : '#94a3b8' }}>
                        I agree to the <a href="#" onClick={(e) => { e.preventDefault(); setHasOpenedTerms(true); alert("EMAHU Buyer Agreement & Liability Disclaimer:\n\n1. CONNECTOR DISCLAIMER: EMAHU is a technology provider linking independent stores and logistics carriers. We are not a seller, merchant, or shipping agent, and assume no liability for item quality, description mismatches, or shipping delays.\n2. EmahuAGREEMENT: Funds for your order are held in an Emahuholding account and only released to the merchant upon delivery verification. You are responsible for ensuring package integrity before releasing the Delivery OTP code to the rider.\n3. LIMITATION OF LIABILITY: You agree to indemnify and hold harmless EMAHU, its operators, and developers from any claims, medical issues from products, or financial losses. All purchases are at your own risk.\n4. REFUNDS & DISPUTES: Refunds are only eligible before OTP entry or under active dispute resolution before fund release. Once the OTP is shared, the transaction is finalized."); }} style={{ color: '#4169e1', textDecoration: 'underline', fontWeight: 'bold' }}>Terms & Partner Conditions</a> of EMAHU Marketplace.
                      </span>
                      {!hasOpenedTerms && (
                        <span style={{ color: '#e53e3e', display: 'block', fontSize: '0.72rem', marginTop: '4px', fontWeight: '600' }}>
                          ⚠️ Please click and read the Terms link first to unlock this checkbox.
                        </span>
                      )}
                    </label>
                  </div>

                  <div className="br-form-actions">
                    <button
                      type="button"
                      className="br-btn br-btn--next"
                      onClick={handleNext}
                      disabled={!agreeTerms}
                      style={!agreeTerms ? { opacity: 0.5, cursor: 'not-allowed', background: '#94a3b8' } : {}}
                    >
                      <span>Continue</span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>

                  {isGoogleEnabled && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', gap: '10px' }}>
                        <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(0,0,0,0.08)' }} />
                        <span style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or</span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(0,0,0,0.08)' }} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
                        <div id="google-signin-btn" style={{ width: '100%', minHeight: '44px' }} />
                      </div>
                    </>
                  )}

                  <div style={{ textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '20px', marginTop: '24px', fontSize: '0.85rem' }}>
                    <span style={{ color: '#718096' }}>Already registered? </span>
                    <Link href="/buyer/login" className="br-btn-sub text-buyer" style={{ fontWeight: '600' }}>
                      Sign In
                    </Link>
                  </div>
                </div>
              )}

              {step === 2 && (
                <form className="br-step-content" onSubmit={handleSubmit}>
                  <div>
                    <h1 className="br-title">Where should we deliver?</h1>
                    <p className="br-subtitle">Please set up your primary delivery address for smooth checkout.</p>
                  </div>

                  <div className="br-form-grid">
                    <div className="br-field br-field--full">
                      <label className="br-label" htmlFor="address">Street Address, Building, Floor</label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        className={`br-input ${errors.address ? 'br-input--error' : ''}`}
                        placeholder="House No, Building, Floor, Street name"
                        value={formData.address}
                        onChange={handleInputChange}
                      />
                      {errors.address && <span className="br-error">{errors.address}</span>}
                    </div>

                    <div className="br-field">
                      <label className="br-label" htmlFor="city">City</label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        className={`br-input ${errors.city ? 'br-input--error' : ''}`}
                        placeholder="e.g. New Delhi"
                        value={formData.city}
                        onChange={handleInputChange}
                      />
                      {errors.city && <span className="br-error">{errors.city}</span>}
                    </div>

                    <div className="br-field">
                      <label className="br-label" htmlFor="state">State / UT</label>
                      <input
                        type="text"
                        id="state"
                        name="state"
                        className={`br-input ${errors.state ? 'br-input--error' : ''}`}
                        placeholder="e.g. Delhi"
                        value={formData.state}
                        onChange={handleInputChange}
                      />
                      {errors.state && <span className="br-error">{errors.state}</span>}
                    </div>

                    <div className="br-field br-field--full">
                      <label className="br-label" htmlFor="zipCode">Zip / Postal Code</label>
                      <input
                        type="text"
                        id="zipCode"
                        name="zipCode"
                        className={`br-input ${errors.zipCode ? 'br-input--error' : ''}`}
                        placeholder="e.g. 110001"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                      />
                      {errors.zipCode && <span className="br-error">{errors.zipCode}</span>}
                    </div>
                  </div>

                  <div className="br-form-actions">
                    <button type="button" className="br-btn br-btn--secondary" onClick={handlePrev} disabled={loading}>
                      Back
                    </button>
                    <button type="submit" className={`br-btn br-btn--next ${loading ? 'br-btn--loading' : ''}`} disabled={loading}>
                      {loading ? (
                        <>
                          <span className="br-btn__spinner" />
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <>
                          <span>Register & Shopping Start</span>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="br-success-view">
              <div className="br-success-icon">✓</div>
              <h3>Registration Successful!</h3>
              <p className="br-subtitle" style={{ fontSize: '0.85rem' }}>Welcome to EMAHU family, <strong>{formData.fullName}</strong>!</p>
              <p className="br-subtitle" style={{ fontSize: '0.85rem', marginTop: '4px' }}>Redirecting you to the shopping marketplace home...</p>
            </div>
          )}

        </div>

      </div>

      {isEmailOtpSent && !isEmailVerified && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '420px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'rgba(65, 105, 225, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4169e1" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
              {otpLoading ? 'Sending Verification Code...' : 'Confirm Your Mobile Number'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: '1.5', marginBottom: '24px' }}>
              {otpLoading
                ? 'We are generating and sending a secure verification code...'
                : <>We sent a 6-digit verification code to <strong style={{ color: '#0f172a' }}>{formData.phone}</strong>. Please enter it below.</>
              }
            </p>

            {mockOtpCode && (
              <div style={{
                background: 'rgba(65, 105, 225, 0.08)',
                border: '1px solid rgba(65, 105, 225, 0.15)',
                color: '#4169e1',
                padding: '12px',
                borderRadius: '8px',
                textAlign: 'center',
                marginTop: '8px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '0.75rem', marginBottom: '5px', opacity: 0.85 }}>🔑 simulated code (check console too):</div>
                <div
                  style={{ letterSpacing: '6px', fontSize: '1.4rem', fontWeight: '800', color: '#4169e1', background: 'rgba(0,0,0,0.04)', padding: '5px 12px', borderRadius: '6px', display: 'inline-block', cursor: 'pointer', userSelect: 'all' }}
                  onClick={() => setEmailOtp(mockOtpCode)}
                  title="Click to auto-fill"
                >
                  {mockOtpCode}
                </div>
                <div style={{ fontSize: '0.7rem', opacity: 0.65, marginTop: '4px' }}>👆 Click to auto-fill</div>
              </div>
            )}

            {errors.otp && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                marginBottom: '16px',
                textAlign: 'left'
              }}>
                {errors.otp}
              </div>
            )}



            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                maxLength="6"
                placeholder="Enter 6-digit code"
                value={emailOtp}
                onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  textAlign: 'center',
                  letterSpacing: '4px',
                  outline: 'none'
                }}
                disabled={otpLoading}
              />
              <button
                type="button"
                className="br-btn br-btn--next"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleVerifyEmailOtp}
                disabled={otpLoading}
              >
                {otpLoading ? 'Verifying...' : 'Verify & Continue'}
              </button>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  marginTop: '8px'
                }}
                onClick={() => setIsEmailOtpSent(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
