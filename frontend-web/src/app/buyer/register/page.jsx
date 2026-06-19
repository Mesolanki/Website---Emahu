'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './buyer-register.css';
import { registerUser, saveAuthSession, googleLoginUser } from '@/utils/auth';
import { useGoogleAuth } from '@/utils/useGoogleAuth';

/**
 * Retail Buyer Registration Component
 * A premium multi-step buyer onboarding wizard with instant validation,
 * automated address settings, and beautiful progress indications.
 */
export default function BuyerRegister() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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

  const { triggerGoogleSignIn, isGoogleEnabled } = useGoogleAuth(onGoogleSuccess, onGoogleError);

  const handleGoogleSignIn = () => triggerGoogleSignIn();




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
      setStep(2);
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
              <path d="M8 12h16M8 16h12M8 20h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
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

                    <div className="br-field">
                      <label className="br-label" htmlFor="email">Email Address</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        className={`br-input ${errors.email ? 'br-input--error' : ''}`}
                        placeholder="rahul@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                      />
                      {errors.email && <span className="br-error">{errors.email}</span>}
                    </div>

                    <div className="br-field">
                      <label className="br-label" htmlFor="phone">Phone Number</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        className={`br-input ${errors.phone ? 'br-input--error' : ''}`}
                        placeholder="9876543210"
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                      {errors.phone && <span className="br-error">{errors.phone}</span>}
                    </div>

                    <div className="br-field">
                      <label className="br-label" htmlFor="password">Password</label>
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

                  <div className="br-form-actions">
                    <button type="button" className="br-btn br-btn--next" onClick={handleNext}>
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

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          disabled={loading}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            width: '100%',
                            height: '44px',
                            backgroundColor: '#fff',
                            border: '1px solid #dadce0',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            color: '#3c4043',
                            transition: 'background-color 0.2s, box-shadow 0.2s',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                        >
                          <svg width="18" height="18" viewBox="0 0 18 18">
                            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                            <path d="M9 18c2.43 0 4.47-.806 5.96-2.18l-2.908-2.258c-.806.54-1.837.86-3.052.86-2.352 0-4.341-1.587-5.05-3.72H1.026v2.332C2.51 15.98 5.534 18 9 18z" fill="#34A853"/>
                            <path d="M3.95 10.702c-.18-.54-.282-1.117-.282-1.702s.102-1.162.282-1.702V4.966H1.026C.371 6.273 0 7.761 0 9s.371 2.727 1.026 4.034l2.924-2.332z" fill="#FBBC05"/>
                            <path d="M9 3.58c1.32 0 2.5.454 3.435 1.348l2.58-2.58C13.464.896 11.428 0 9 0 5.534 0 2.51 2.02 1.026 4.966L3.95 7.298C4.659 5.165 6.648 3.58 9 3.58z" fill="#EA4335"/>
                          </svg>
                          <span>Continue with Google</span>
                        </button>
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
                      <label className="br-label" htmlFor="address">Street Address</label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        className={`br-input ${errors.address ? 'br-input--error' : ''}`}
                        placeholder="House No, Apartment, Street name"
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
    </div>
  );
}
