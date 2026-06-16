'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './register.css';
import { registerUser, saveAuthSession, googleLoginUser } from '@/utils/auth';

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

  // If already logged in, redirect directly to the seller dashboard
  useEffect(() => {
    if (localStorage.getItem('emahu_seller_logged_in') === 'true') {
      router.replace('/seller/dashboard');
    }
  }, [router]);

  const handleGoogleSignIn = () => {
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popup = window.open(
      '/buyer/google-auth?role=seller',
      'google_auth_popup',
      `width=${width},height=${height},top=${top},left=${left}`
    );

    const handleMessage = async (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS' && event.data?.role === 'seller') {
        window.removeEventListener('message', handleMessage);
        const { email, name, role } = event.data;
        setLoading(true);
        setErrors({});
        try {
          const data = await googleLoginUser({ email, name, role });
          saveAuthSession(data, 'seller');
          setLoading(false);
          router.replace('/seller/dashboard');
        } catch (err) {
          setLoading(false);
          setErrors({ general: err.message || 'Google Sign-In failed' });
        }
      }
    };

    window.addEventListener('message', handleMessage);
  };

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
    if (step === 1 && validateStep1()) setStep(2);
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
          const docUrl = `https://emahu-documents.s3.amazonaws.com/${formData.kycFile ? encodeURIComponent(formData.kycFile.name) : 'kyc_document.jpg'}`;
          await fetch('http://localhost:5000/api/auth/seller/documents', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.accessToken}`
            },
            body: JSON.stringify({
              documentType: 'id_proof',
              fileUrl: docUrl
            })
          });

          await fetch('http://localhost:5000/api/auth/seller/documents', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.accessToken}`
            },
            body: JSON.stringify({
              documentType: 'business_registration',
              fileUrl: 'https://emahu-documents.s3.amazonaws.com/gst_certificate_stub.pdf'
            })
          });
        }

        setLoading(false);
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

              <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#fff',
                  border: '1px solid #dadce0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  color: '#3c4043',
                  transition: 'background-color 0.2s',
                  marginBottom: '16px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.47-.806 5.96-2.18l-2.908-2.258c-.806.54-1.837.86-3.052.86-2.352 0-4.341-1.587-5.05-3.72H1.026v2.332C2.51 15.98 5.534 18 9 18z" fill="#34A853"/>
                  <path d="M3.95 10.702c-.18-.54-.282-1.117-.282-1.702s.102-1.162.282-1.702V4.966H1.026C.371 6.273 0 7.761 0 9s.371 2.727 1.026 4.034l2.924-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.32 0 2.5.454 3.435 1.348l2.58-2.58C13.464.896 11.428 0 9 0 5.534 0 2.51 2.02 1.026 4.966L3.95 7.298C4.659 5.165 6.648 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

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
                      <strong>Verify Phone Number</strong>
                      <span>Humne aapke mobile pe verification OTP code send kiya hai.</span>
                    </div>
                  </li>
                  <li>
                    <span className="sr-next-steps__badge">2</span>
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
    </div>
  );
}
