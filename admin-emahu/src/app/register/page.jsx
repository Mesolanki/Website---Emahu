'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './register.css';
import { registerUser, saveAuthSession } from '@/utils/auth';
import API_BASE from '@/utils/config';

export default function AdminRegister() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [adminSecret, setAdminSecret] = useState('');

  useEffect(() => {
    if (localStorage.getItem('emahu_admin_logged_in') === 'true') {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleSendEmailOtp = async () => {
    if (!phone.trim()) {
      setError('Phone number is required to send OTP');
      return;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setOtpLoading(true);
    setError('');
    setDevOtp('');
    try {
      let cleanPhone = phone.trim();
      const res = await fetch(`${API_BASE}/api/auth/send-phone-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: cleanPhone })
      });
      const data = await res.json();
      if (data.success) {
        setIsEmailOtpSent(true);
        if (data.devOtp) {
          setDevOtp(data.devOtp);
        }
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      console.error(err);
      setError('Network error sending OTP code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp.trim()) {
      setError('Please enter the verification code');
      return;
    }
    setOtpLoading(true);
    setError('');
    try {
      let cleanPhone = phone.trim();
      const res = await fetch(`${API_BASE}/api/auth/verify-phone-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: cleanPhone, otp: emailOtp })
      });
      const data = await res.json();
      if (data.success) {
        setIsEmailVerified(true);
      } else {
        setError(data.error || 'Invalid OTP code');
      }
    } catch (err) {
      console.error(err);
      setError('Network error verifying OTP code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !password || !phone || !adminSecret) {
      setError('Please fill in all fields.');
      return;
    }
    if (!isEmailVerified) {
      setError('Please verify your phone number via OTP first.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const data = await registerUser({
        name,
        email: `${phone.trim()}@emahu.com`,
        password,
        phone,
        role: 'admin',
        address: 'EMAHU Corporate HQ',
        adminSecret
      });

      saveAuthSession(data, 'admin');
      setLoading(false);
      router.replace('/dashboard');
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Admin registration failed.');
    }
  };

  return (
    <div className="ar-wrapper">
      <div className="ar-ambient-blob ar-ambient-blob--1" />
      <div className="ar-ambient-blob ar-ambient-blob--2" />

      <div className="ar-container">
        <div className="ar-brand-card">
          <div className="ar-brand-card__overlay" />
          <div className="ar-brand-card__content">
            <Link href="/" className="ar-logo">
              <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="10" fill="#4169e1" />
                <path d="M8 12h16M8 16h12M8 20h14" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <span className="ar-logo__text">EMAHU</span>
            </Link>
            
            <div className="ar-brand-card__hero-text">
              <h1 className="ar-brand-card__title">Create Administrator.</h1>
              <p className="ar-brand-card__desc">
                Setup your administrative console credentials. Once created, you will have complete dashboard access to manage compliance verifications, catalog products, and verify transactions.
              </p>
            </div>
            
            <div className="ar-metrics">
              <div className="ar-metric">
                <span className="ar-metric__num">ADMIN</span>
                <span className="ar-metric__lbl">Console access</span>
              </div>
              <div className="ar-metric__divider" />
              <div className="ar-metric">
                <span className="ar-metric__num">ROLE</span>
                <span className="ar-metric__lbl">Super Administrator</span>
              </div>
            </div>
          </div>
        </div>

        <div className="ar-form-card">
          <div className="ar-form-card__header">
            <h2 className="ar-form-card__title">Admin Registration</h2>
            <p className="ar-form-card__subtitle">Initialize administrator profile</p>
          </div>

          {error && (
            <div className="ar-error" role="alert">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="ar-error__icon">
                <circle cx="9" cy="9" r="8" stroke="#ef4444" strokeWidth="1.8" />
                <path d="M9 6v4M9 12h.01" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form className="ar-form" onSubmit={handleSubmit}>
            <div className="ar-input-group">
              <label className="ar-label" htmlFor="ar-name">Full Name</label>
              <input
                id="ar-name"
                type="text"
                className="ar-input"
                placeholder="e.g. Chief Admin Officer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="ar-input-group">
              <label className="ar-label" htmlFor="ar-phone">Phone Number</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  id="ar-phone"
                  type="tel"
                  className="ar-input"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                    if (isEmailVerified) setIsEmailVerified(false);
                    if (isEmailOtpSent) setIsEmailOtpSent(false);
                  }}
                  readOnly={isEmailVerified}
                  style={{ flex: 1 }}
                  required
                />
                {!isEmailVerified && (
                  <button
                    type="button"
                    className="ar-btn"
                    style={{ padding: '0 12px', height: '42px', width: 'auto', fontSize: '0.78rem', background: 'var(--color-admin-primary, #6366f1)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onClick={handleSendEmailOtp}
                    disabled={otpLoading}
                  >
                    {otpLoading ? '...' : isEmailOtpSent ? 'Resend' : 'Send Code'}
                  </button>
                )}
              </div>

              {/* OTP Code Input */}
              {isEmailOtpSent && !isEmailVerified && (
                <div style={{ marginTop: '8px', background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.15)', padding: '10px', borderRadius: '6px' }}>
                  <label className="ar-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Verification Code</label>
                  
                  {devOtp && (
                    <div style={{
                      background: 'rgba(99, 102, 241, 0.1)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      color: 'var(--color-admin-primary, #6366f1)',
                      padding: '10px',
                      borderRadius: '8px',
                      textAlign: 'center',
                      marginTop: '8px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ fontSize: '0.75rem', marginBottom: '5px', opacity: 0.85 }}>🔑 simulated code (check console too):</div>
                      <div
                        style={{ letterSpacing: '6px', fontSize: '1.4rem', fontWeight: '800', color: 'var(--color-admin-primary, #6366f1)', background: 'rgba(0,0,0,0.05)', padding: '5px 12px', borderRadius: '6px', display: 'inline-block', cursor: 'pointer', userSelect: 'all' }}
                        onClick={() => setEmailOtp(devOtp)}
                        title="Click to auto-fill"
                      >
                        {devOtp}
                      </div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.65, marginTop: '4px' }}>👆 Click to auto-fill</div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="ar-input"
                      placeholder="Enter 6-digit OTP"
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value)}
                      style={{ flex: 1, height: '36px', fontSize: '0.85rem' }}
                    />
                    <button
                      type="button"
                      className="ar-btn"
                      style={{ padding: '0 12px', height: '36px', width: 'auto', fontSize: '0.78rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      onClick={handleVerifyEmailOtp}
                      disabled={otpLoading}
                    >
                      Verify
                    </button>
                  </div>

                </div>
              )}

              {isEmailVerified && (
                <div style={{ color: '#10b981', fontSize: '0.75rem', marginTop: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ✓ Phone Number Verified Successfully
                </div>
              )}
            </div>

            <div className="ar-input-group">
              <label className="ar-label" htmlFor="ar-password">Security Password</label>
              <input
                id="ar-password"
                type="password"
                className="ar-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="ar-input-group">
              <label className="ar-label" htmlFor="ar-admin-secret">Admin Authorization Key</label>
              <input
                id="ar-admin-secret"
                type="password"
                className="ar-input"
                placeholder="Enter admin authorization secret key"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className={`ar-btn ar-btn--primary ${loading ? 'ar-btn--loading' : ''}`}
              disabled={loading || !isEmailVerified || !adminSecret}
            >
              {loading ? (
                <>
                  <span className="ar-btn__spinner" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          <div className="ar-form-card__footer">
            <span className="ar-form-card__footer-text">Already registered?</span>
            <Link href="/login" className="ar-form-card__footer-link">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
