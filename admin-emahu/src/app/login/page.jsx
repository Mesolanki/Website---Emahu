'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './login.css';
import { loginUser, saveAuthSession } from '@/utils/auth';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired') === 'true') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('Your session has expired. Please log in again.');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (localStorage.getItem('emahu_admin_logged_in') === 'true') {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (requires2FA && !twoFactorCode) {
      setError('Please enter the 2FA verification code.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const data = await loginUser(email, password, requires2FA ? twoFactorCode : undefined);

      if (data.requires2FA) {
        setRequires2FA(true);
        if (data.devOtp) {
          setDevOtp(data.devOtp);
        }
        setLoading(false);
        setError('');
        return;
      }

      if (data.user.role !== 'admin') {
        throw new Error('Access denied. This portal is restricted to administrators.');
      }

      saveAuthSession(data, 'admin');
      setLoading(false);
      router.replace('/dashboard');
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Invalid admin credentials.');
    }
  };

  return (
    <div className="al-wrapper">
      <div className="al-ambient-blob al-ambient-blob--1" />
      <div className="al-ambient-blob al-ambient-blob--2" />

      <div className="al-container">
        <div className="al-brand-card">
          <div className="al-brand-card__overlay" />
          <div className="al-brand-card__content">
            <Link href="/" className="al-logo">
              <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="10" fill="white" />
                <path d="M8 12h16M8 16h12M8 20h14" stroke="#6366f1" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              <span className="al-logo__text">EMAHU</span>
            </Link>
            
            <div className="al-brand-card__hero-text">
              <h1 className="al-brand-card__title">Central Administration.</h1>
              <p className="al-brand-card__desc">
                Review pending store verifications, audit product catalog registrations, manage logistics status, and monitor real-time ecommerce activity metrics.
              </p>
            </div>
            
            <div className="al-metrics">
              <div className="al-metric">
                <span className="al-metric__num">SECURE</span>
                <span className="al-metric__lbl">Audit Controls</span>
              </div>
              <div className="al-metric__divider" />
              <div className="al-metric">
                <span className="al-metric__num">256-BIT</span>
                <span className="al-metric__lbl">Encryption</span>
              </div>
            </div>
          </div>
        </div>

        <div className="al-form-card">
          <div className="al-form-card__header">
            <h2 className="al-form-card__title">Admin Portal</h2>
            <p className="al-form-card__subtitle">Authorized personnel login only</p>
          </div>

          {error && (
            <div className="al-error" role="alert">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="al-error__icon">
                <circle cx="9" cy="9" r="8" stroke="#ef4444" strokeWidth="1.8" />
                <path d="M9 6v4M9 12h.01" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form className="al-form" onSubmit={handleSubmit}>
            {!requires2FA ? (
              <>
                <div className="al-input-group">
                  <label className="al-label" htmlFor="al-email">Email Address</label>
                  <div className="al-input-wrapper">
                    <input
                      id="al-email"
                      type="email"
                      className="al-input"
                      placeholder="admin@emahu.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="al-input-group">
                  <div className="al-label-row">
                    <label className="al-label" htmlFor="al-password">Security Password</label>
                  </div>
                  <div className="al-input-wrapper">
                    <input
                      id="al-password"
                      type="password"
                      className="al-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="al-input-group">
                <label className="al-label" htmlFor="al-otp">2FA Verification Code</label>
                <div className="al-input-wrapper">
                  <input
                    id="al-otp"
                    type="text"
                    className="al-input"
                    placeholder="Enter 6-digit OTP code"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    required
                  />
                </div>

                <p style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '8px', lineHeight: '1.4' }}>
                  Two-Factor Authentication is enabled on your account. Enter the 6-digit code sent to your email or from your authenticator app to log in.
                </p>
                <button
                  type="button"
                  onClick={() => { setRequires2FA(false); setTwoFactorCode(''); setDevOtp(''); }}
                  style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.8rem', cursor: 'pointer', marginTop: '12px', padding: 0 }}
                >
                  ← Back to password login
                </button>
              </div>
            )}

            <button
              type="submit"
              className={`al-btn al-btn--primary ${loading ? 'al-btn--loading' : ''}`}
              disabled={loading}
              style={{ marginTop: '16px' }}
            >
              {loading ? (
                <>
                  <span className="al-btn__spinner" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>{requires2FA ? 'Verify Code & Sign In' : 'Sign In to Admin'}</span>
                </>
              )}
            </button>
          </form>

          <div className="al-form-card__footer">
            <span className="al-form-card__footer-text">New Administrator?</span>
            <Link href="/register" className="al-form-card__footer-link">
              Create Admin Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
