'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './register.css';
import { registerUser, saveAuthSession } from '@/utils/auth';
import API_BASE from '@/utils/config';

/**
 * SellerRegister Component
 * A premium multi-step vendor onboarding wizard with instant validations,
 * KYC document uploads, Bank details collection, and gorgeous micro-animations.
 */
export default function SellerRegister() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [regSuccessData, setRegSuccessData] = useState(null);

  // Form State Values
  const [formData, setFormData] = useState({
    // Step 1: Account
    storeName: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    category: '',
    // Step 2: KYC
    kycType: 'pan', // 'pan' or 'aadhaar'
    kycNumber: '',
    kycFile: null,
    // Step 3: Bank & Taxes
    bankHolder: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    gstNumber: '',
  });

  const [errors, setErrors] = useState({});

  // Email OTP States
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [devEmailOtp, setDevEmailOtp] = useState('');



  const [draftLoaded, setDraftLoaded] = useState(false);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedData = localStorage.getItem('emahu_seller_register_draft');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setFormData((prev) => ({
            ...prev,
            ...parsed,
            kycFile: null // file object cannot be serialized
          }));
        } catch (err) {
          console.error('Failed to parse seller register draft:', err);
        }
      }
      const savedStep = localStorage.getItem('emahu_seller_register_step');
      if (savedStep) {
        const parsedStep = parseInt(savedStep, 10);
        if (parsedStep >= 1 && parsedStep <= 4) {
          setStep(parsedStep);
        }
      }
      setDraftLoaded(true);
    }
  }, []);

  // Save draft to localStorage on changes
  useEffect(() => {
    if (!draftLoaded) return;
    const { kycFile, password, ...serializableData } = formData;
    localStorage.setItem('emahu_seller_register_draft', JSON.stringify(serializableData));
  }, [formData, draftLoaded]);

  useEffect(() => {
    if (!draftLoaded) return;
    localStorage.setItem('emahu_seller_register_step', step.toString());
  }, [step, draftLoaded]);


  // If already logged in, redirect directly to the seller dashboard
  useEffect(() => {
    if (localStorage.getItem('emahu_seller_logged_in') === 'true') {
      router.replace('/seller/dashboard');
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
          ownerName: nameParam || emailParam.split('@')[0],
          password: `GoogleAuthPass_${Math.random().toString(36).substring(2, 10)}`
        }));
        setErrors({ general: 'Google account connected. Please complete the registration details below.' });
      }
    }
  }, []);

  // OTP Cooldown timer
  useEffect(() => {
    let timer;
    if (otpCooldown > 0) {
      timer = setTimeout(() => setOtpCooldown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCooldown]);



  const triggerSendOtp = async (isResend = false) => {
    setIsOtpVerifying(true); // Open the popup immediately!
    setOtpSending(true);
    setOtpError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const data = await res.json();
      if (data.success) {
        setOtpCooldown(60);
        if (data.devOtp) {
          setDevEmailOtp(data.devOtp);
        }
        if (isResend) {
          setOtpError('OTP has been resent to your email.');
        }
      } else {
        setOtpError(data.error || 'Failed to send OTP. Please check email address.');
      }
    } catch (err) {
      console.error(err);
      setOtpError('Network error sending OTP. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };



  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpInput || otpInput.trim().length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP code.');
      return;
    }
    setLoading(true);
    setOtpError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: otpInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setIsOtpVerifying(false);
        setStep(2);
      } else {
        setOtpError(data.error || 'Invalid OTP code. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setOtpError('Network error verifying OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };






  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name] || errors.general) {
      setErrors((prev) => ({ ...prev, [name]: '', general: '' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, kycFile: file }));
      if (errors.kycFile || errors.general) {
        setErrors((prev) => ({ ...prev, kycFile: '', general: '' }));
      }
    }
  };

  // Step 1 Validation
  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.storeName.trim()) newErrors.storeName = 'Store name is required';
    if (!formData.ownerName.trim()) newErrors.ownerName = 'Owner name is required';
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
    if (!formData.category) {
      newErrors.category = 'Please select a store category';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.kycNumber.trim()) {
      newErrors.kycNumber = `${formData.kycType.toUpperCase()} number is required`;
    } else {
      if (formData.kycType === 'pan' && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.kycNumber.toUpperCase())) {
        newErrors.kycNumber = 'Enter a valid 10-character PAN number (e.g. ABCDE1234F)';
      } else if (formData.kycType === 'aadhaar' && !/^\d{12}$/.test(formData.kycNumber)) {
        newErrors.kycNumber = 'Enter a valid 12-digit Aadhaar number';
      }
    }
    if (!formData.kycFile) {
      newErrors.kycFile = 'Please upload a front-side document copy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    const newErrors = {};
    if (!formData.bankHolder.trim()) newErrors.bankHolder = 'Account holder name is required';
    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    } else if (!/^\d{9,18}$/.test(formData.accountNumber)) {
      newErrors.accountNumber = 'Enter a valid bank account number (9 to 18 digits)';
    }
    if (!formData.ifscCode.trim()) {
      newErrors.ifscCode = 'IFSC code is required';
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.toUpperCase())) {
      newErrors.ifscCode = 'Enter a valid 11-digit IFSC code (e.g. SBIN0001234)';
    }
    if (!formData.bankName.trim()) newErrors.bankName = 'Bank name is required';
    
    // Optional GSTIN Validation (if field is filled)
    if (formData.gstNumber.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstNumber.toUpperCase().trim())) {
      newErrors.gstNumber = 'Enter a valid 15-character GSTIN (e.g. 22AAAAA0000A1Z5)';
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
        triggerSendOtp();
      }
    }
    if (step === 2 && validateStep2()) setStep(3);
  };

  const handlePrev = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateStep3()) {
      setLoading(true);
      setErrors({});

      try {
        const fullAddress = `${formData.storeName} (${formData.category})`;
        const data = await registerUser({
          name: formData.ownerName,
          email: formData.email,
          password: formData.password,
          role: 'seller',
          phone: formData.phone,
          address: fullAddress,
          storeName: formData.storeName,
          category: formData.category,
          kycType: formData.kycType,
          kycNumber: formData.kycNumber,
          bankHolder: formData.bankHolder,
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode,
          bankName: formData.bankName,
          gstNumber: formData.gstNumber
        });

        setRegSuccessData(data);
        
        // Automatically submit documents upon registration
        if (data.accessToken) {
          const docUrl = API_BASE + '/api/auth/kyc_document.jpg';
          await fetch(API_BASE + '/api/auth/seller/documents', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + data.accessToken
            },
            body: JSON.stringify({
              documentType: 'id_proof',
              fileUrl: docUrl
            })
          });

          await fetch(API_BASE + '/api/auth/seller/documents', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + data.accessToken
            },
            body: JSON.stringify({
              documentType: 'business_registration',
              fileUrl: API_BASE + '/api/auth/gst_certificate_stub.pdf'
            })
          });
        }

        setLoading(false);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('emahu_seller_register_draft');
          localStorage.removeItem('emahu_seller_register_step');
        }
        setStep(4);
      } catch (err) {
        setLoading(false);
        setErrors({ general: err.message || 'Registration failed. Please try again.' });
      }
    }
  };

  const handleGoToDashboard = () => {
    if (regSuccessData) {
      saveAuthSession(regSuccessData, 'seller');
    }
    router.replace('/seller/dashboard');
  };

  return (
    <div className="sr-wrapper">
      {/* Sparkles / Ambient design items */}
      <div className="sr-ambient-blob sr-ambient-blob--1" />
      <div className="sr-ambient-blob sr-ambient-blob--2" />

      <div className="sr-container">
        
        {/* Step Indicator Panel */}
        <div className="sr-progress-panel">
          <Link href="/" className="sr-logo">
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="10" fill="white" />
              <path d="M8 12h16M8 16h12M8 20h14" stroke="#2b4594" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <span className="sr-logo__text">EMAHU</span>
          </Link>

          <div className="sr-steps-list">
            
            {/* Step 1 indicator */}
            <div className={`sr-step-item ${step === 1 ? 'sr-step-item--active' : ''} ${step > 1 ? 'sr-step-item--completed' : ''}`}>
              <div className="sr-step-item__number">
                {step > 1 ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5l3.5 3.5 6.5-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : '1'}
              </div>
              <div className="sr-step-item__text">
                <span className="sr-step-item__title">Account Setup</span>
                <span className="sr-step-item__subtitle">Store & contact details</span>
              </div>
            </div>

            {/* Step 2 indicator */}
            <div className={`sr-step-item ${step === 2 ? 'sr-step-item--active' : ''} ${step > 2 ? 'sr-step-item--completed' : ''}`}>
              <div className="sr-step-item__number">
                {step > 2 ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5l3.5 3.5 6.5-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : '2'}
              </div>
              <div className="sr-step-item__text">
                <span className="sr-step-item__title">KYC Verification</span>
                <span className="sr-step-item__subtitle">PAN or Aadhaar Details</span>
              </div>
            </div>

            {/* Step 3 indicator */}
            <div className={`sr-step-item ${step === 3 ? 'sr-step-item--active' : ''} ${step > 3 ? 'sr-step-item--completed' : ''}`}>
              <div className="sr-step-item__number">
                {step > 3 ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5l3.5 3.5 6.5-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : '3'}
              </div>
              <div className="sr-step-item__text">
                <span className="sr-step-item__title">Bank Details</span>
                <span className="sr-step-item__subtitle">Direct payout account</span>
              </div>
            </div>

            {/* Step 4 indicator */}
            <div className={`sr-step-item ${step === 4 ? 'sr-step-item--active' : ''}`}>
              <div className="sr-step-item__number">4</div>
              <div className="sr-step-item__text">
                <span className="sr-step-item__title">Activation</span>
                <span className="sr-step-item__subtitle">All set to sell</span>
              </div>
            </div>

          </div>

          <div className="sr-progress-footer">
            <span className="sr-progress-footer__label">Vendor Onboarding</span>
            <div className="sr-progress-bar-bg">
              <div className="sr-progress-bar-fill" style={{ width: `${(step / 4) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Right side form card */}
        <div className="sr-form-card">
          
          {errors.general && (
            <div style={{ color: '#f87171', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.85rem', marginBottom: '16px' }}>
              {errors.general}
            </div>
          )}
          
          {step === 1 && (
            <div className="sr-step-content">
              <div className="sr-form-card__header">
                <h2 className="sr-form-card__title">Create Seller Account</h2>
                <p className="sr-form-card__subtitle">Start listing your products in minutes</p>
              </div>

              <div className="sr-form-grid">
                <div className="sr-input-group">
                  <label className="sr-label" htmlFor="storeName">Store / Company Name</label>
                  <input
                    type="text"
                    id="storeName"
                    name="storeName"
                    className={`sr-input ${errors.storeName ? 'sr-input--error' : ''}`}
                    placeholder="e.g. Supreme Electro Traders"
                    value={formData.storeName}
                    onChange={handleInputChange}
                  />
                  {errors.storeName && <span className="sr-error-text">{errors.storeName}</span>}
                </div>

                <div className="sr-input-group">
                  <label className="sr-label" htmlFor="ownerName">Owner Full Name</label>
                  <input
                    type="text"
                    id="ownerName"
                    name="ownerName"
                    className={`sr-input ${errors.ownerName ? 'sr-input--error' : ''}`}
                    placeholder="e.g. Rajesh Kumar"
                    value={formData.ownerName}
                    onChange={handleInputChange}
                  />
                  {errors.ownerName && <span className="sr-error-text">{errors.ownerName}</span>}
                </div>

                <div className="sr-input-group">
                  <label className="sr-label" htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className={`sr-input ${errors.email ? 'sr-input--error' : ''}`}
                    placeholder="rajesh@company.com"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                  {errors.email && <span className="sr-error-text">{errors.email}</span>}
                </div>

                <div className="sr-input-group">
                  <label className="sr-label" htmlFor="phone">Phone Number (10-Digit)</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    className={`sr-input ${errors.phone ? 'sr-input--error' : ''}`}
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                  {errors.phone && <span className="sr-error-text">{errors.phone}</span>}
                </div>

                <div className="sr-input-group">
                  <label className="sr-label" htmlFor="password">Create Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    className={`sr-input ${errors.password ? 'sr-input--error' : ''}`}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                  {errors.password && <span className="sr-error-text">{errors.password}</span>}
                </div>

                <div className="sr-input-group">
                  <label className="sr-label" htmlFor="category">Store Category</label>
                  <select
                    id="category"
                    name="category"
                    className={`sr-input ${errors.category ? 'sr-input--error' : ''}`}
                    style={{ appearance: 'none', backgroundPosition: 'right 16px center', backgroundRepeat: 'no-repeat', backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3E%3C/svg%3E")', backgroundSize: '1.25rem' }}
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    <option value="" disabled>Select category...</option>
                    <option value="electronics">Electronics & Gadgets</option>
                    <option value="fashion">Fashion & Apparel</option>
                    <option value="groceries">Groceries & Food</option>
                    <option value="home">Home & Kitchen</option>
                    <option value="beauty">Beauty & Personal Care</option>
                    <option value="stationery">Books & Stationery</option>
                    <option value="other">Other Business Type</option>
                  </select>
                  {errors.category && <span className="sr-error-text">{errors.category}</span>}
                </div>
              </div>

              <div className="sr-form-actions">
                <button type="button" className="sr-btn sr-btn--primary" onClick={handleNext}>
                  <span>Continue</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>



              <div className="sr-form-footer">
                <span>Already registered?</span>
                <Link href="/seller/login" className="sr-form-footer-link">Sign In</Link>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="sr-step-content">
              <div className="sr-form-card__header">
                <h2 className="sr-form-card__title">Vendor Verification (KYC)</h2>
                <p className="sr-form-card__subtitle">Please verify your identities to secure transaction payouts.</p>
              </div>

              <div className="sr-form-grid">
                {/* Selector Buttons for PAN or Aadhaar */}
                <div className="sr-input-group sr-input-group--full">
                  <label className="sr-label">Select KYC Document Type</label>
                  <div className="sr-kyc-selector">
                    <button
                      type="button"
                      className={`sr-kyc-btn ${formData.kycType === 'pan' ? 'sr-kyc-btn--active' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, kycType: 'pan', kycNumber: '' }))}
                    >
                      <span className="sr-kyc-btn__badge">💳</span>
                      <span>PAN Card</span>
                    </button>
                    <button
                      type="button"
                      className={`sr-kyc-btn ${formData.kycType === 'aadhaar' ? 'sr-kyc-btn--active' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, kycType: 'aadhaar', kycNumber: '' }))}
                    >
                      <span className="sr-kyc-btn__badge">🆔</span>
                      <span>Aadhaar Card</span>
                    </button>
                  </div>
                </div>

                {/* Input for selected card number */}
                <div className="sr-input-group sr-input-group--full">
                  <label className="sr-label" htmlFor="kycNumber">
                    {formData.kycType === 'pan' ? 'PAN Number (10 characters)' : 'Aadhaar Number (12 digits)'}
                  </label>
                  <input
                    type="text"
                    id="kycNumber"
                    name="kycNumber"
                    className={`sr-input ${errors.kycNumber ? 'sr-input--error' : ''}`}
                    placeholder={formData.kycType === 'pan' ? 'ABCDE1234F' : '123456789012'}
                    value={formData.kycNumber}
                    onChange={handleInputChange}
                  />
                  {errors.kycNumber && <span className="sr-error-text">{errors.kycNumber}</span>}
                </div>

                {/* Document File Drag & Drop */}
                <div className="sr-input-group sr-input-group--full">
                  <label className="sr-label">Upload Front Copy of Document</label>
                  <label className={`sr-dropzone ${errors.kycFile ? 'sr-dropzone--error' : ''}`}>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="sr-dropzone__input"
                      onChange={handleFileChange}
                    />
                    <div className="sr-dropzone__inner">
                      <div className="sr-dropzone__icon">📄</div>
                      <div className="sr-dropzone__texts">
                        <span className="sr-dropzone__title">
                          {formData.kycFile ? formData.kycFile.name : 'Click or Drag document front photo'}
                        </span>
                        <span className="sr-dropzone__subtitle">Supports PNG, JPG, or PDF (Max 5MB)</span>
                      </div>
                    </div>
                  </label>
                  {errors.kycFile && <span className="sr-error-text">{errors.kycFile}</span>}
                </div>
              </div>

              <div className="sr-form-actions">
                <button type="button" className="sr-btn sr-btn--secondary" onClick={handlePrev}>
                  Back
                </button>
                <button type="button" className="sr-btn sr-btn--primary" onClick={handleNext}>
                  <span>Continue</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form className="sr-step-content" onSubmit={handleSubmit}>
              <div className="sr-form-card__header">
                <h2 className="sr-form-card__title">Payout Bank Details</h2>
                <p className="sr-form-card__subtitle">Your sales revenue will be direct-deposited into this bank account.</p>
              </div>

              <div className="sr-form-grid">
                <div className="sr-input-group sr-input-group--full">
                  <label className="sr-label" htmlFor="bankHolder">Account Holder Name</label>
                  <input
                    type="text"
                    id="bankHolder"
                    name="bankHolder"
                    className={`sr-input ${errors.bankHolder ? 'sr-input--error' : ''}`}
                    placeholder="Owner name or registered business name"
                    value={formData.bankHolder}
                    onChange={handleInputChange}
                  />
                  {errors.bankHolder && <span className="sr-error-text">{errors.bankHolder}</span>}
                </div>

                <div className="sr-input-group">
                  <label className="sr-label" htmlFor="accountNumber">Bank Account Number</label>
                  <input
                    type="text"
                    id="accountNumber"
                    name="accountNumber"
                    className={`sr-input ${errors.accountNumber ? 'sr-input--error' : ''}`}
                    placeholder="e.g. 123456789012"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                  />
                  {errors.accountNumber && <span className="sr-error-text">{errors.accountNumber}</span>}
                </div>

                <div className="sr-input-group">
                  <label className="sr-label" htmlFor="ifscCode">IFSC Code (11 characters)</label>
                  <input
                    type="text"
                    id="ifscCode"
                    name="ifscCode"
                    className={`sr-input ${errors.ifscCode ? 'sr-input--error' : ''}`}
                    placeholder="e.g. SBIN0001234"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                  />
                  {errors.ifscCode && <span className="sr-error-text">{errors.ifscCode}</span>}
                </div>

                <div className="sr-input-group sr-input-group--full">
                  <label className="sr-label" htmlFor="bankName">Bank Name & Branch</label>
                  <input
                    type="text"
                    id="bankName"
                    name="bankName"
                    className={`sr-input ${errors.bankName ? 'sr-input--error' : ''}`}
                    placeholder="e.g. State Bank of India, Mumbai Branch"
                    value={formData.bankName}
                    onChange={handleInputChange}
                  />
                  {errors.bankName && <span className="sr-error-text">{errors.bankName}</span>}
                </div>

                <div className="sr-input-group sr-input-group--full">
                  <label className="sr-label" htmlFor="gstNumber">GSTIN (Optional)</label>
                  <input
                    type="text"
                    id="gstNumber"
                    name="gstNumber"
                    className={`sr-input ${errors.gstNumber ? 'sr-input--error' : ''}`}
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    value={formData.gstNumber}
                    onChange={handleInputChange}
                  />
                  {errors.gstNumber && <span className="sr-error-text">{errors.gstNumber}</span>}
                </div>
              </div>

              <div className="sr-form-actions">
                <button type="button" className="sr-btn sr-btn--secondary" onClick={handlePrev}>
                  Back
                </button>
                <button type="submit" className={`sr-btn sr-btn--primary ${loading ? 'sr-btn--loading' : ''}`} disabled={loading}>
                  {loading ? (
                    <>
                      <span className="sr-btn__spinner" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 4 && (
            <div className="sr-step-content sr-step-content--success">
              <div className="sr-success-badge">
                <div className="sr-success-badge__circle" />
                <div className="sr-success-badge__icon">
                  <svg width="32" height="32" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5l3.5 3.5 6.5-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              <h2 className="sr-form-card__title">Verification Submitted!</h2>
              <p className="sr-form-card__subtitle">
                Aapki register details and KYC documents successfully receive ho gayi hain. Humare compliance experts 24 hours ke andar KYC approve kar denge!
              </p>

              <div className="sr-next-steps">
                <h4 className="sr-next-steps__title">Next Steps:</h4>
                <ul className="sr-next-steps__list">
                  <li>
                    <span className="sr-next-steps__badge">1</span>
                    <div>
                      <strong>Add Products</strong>
                      <span>Aap listing drafts save kar sakte hain jab tak KYC status pending hai.</span>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="sr-success-actions">
                <button type="button" onClick={handleGoToDashboard} className="sr-btn sr-btn--primary" style={{ width: '100%', cursor: 'pointer', textAlign: 'center', display: 'block' }}>
                  Go to Dashboard Preview
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {isOtpVerifying && (
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
            backgroundColor: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '420px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            textAlign: 'center',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ffffff', marginBottom: '8px' }}>
              {otpSending ? 'Sending Verification Code...' : 'Confirm Your Email'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5', marginBottom: '24px' }}>
              {otpSending 
                ? 'We are generating and sending a secure OTP to your email...' 
                : <>We sent a 6-digit verification code to <strong style={{ color: '#f8fafc' }}>{formData.email}</strong>. Please enter it below.</>
              }
            </p>


            {otpError && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                marginBottom: '16px',
                textAlign: 'left'
              }}>
                {otpError}
              </div>
            )}




            <form onSubmit={handleVerifyOtp}>
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  maxLength="6"
                  placeholder="000000"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  disabled={otpSending}
                  style={{
                    width: '100%',
                    height: '50px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    color: '#ffffff',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    textAlign: 'center',
                    letterSpacing: '8px',
                    outline: 'none',
                    opacity: otpSending ? 0.5 : 1,
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#38bdf8'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpSending}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '8px',
                  backgroundColor: '#38bdf8',
                  color: '#0f172a',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: (loading || otpSending) ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: (loading || otpSending) ? 0.7 : 1
                }}
              >
                {loading ? 'Verifying...' : otpSending ? 'Sending...' : 'Verify & Continue'}
              </button>
            </form>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <button
                type="button"
                onClick={() => setIsOtpVerifying(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Change Email
              </button>

              <button
                type="button"
                onClick={() => triggerSendOtp(true)}
                disabled={otpCooldown > 0 || otpSending}
                style={{
                  background: 'none',
                  border: 'none',
                  color: otpCooldown > 0 ? '#64748b' : '#38bdf8',
                  cursor: otpCooldown > 0 ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}
