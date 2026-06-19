'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './login.css';
import { loginUser, saveAuthSession, googleLoginUser } from '@/utils/auth';
import { useGoogleAuth } from '@/utils/useGoogleAuth';

/**
 * SellerLogin Component
 * A luxury-themed, high-fidelity vendor login page with dynamic state handling,
 * responsive glassmorphism styling, and premium interactive micro-animations.
 */
export default function SellerLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in, redirect directly to the seller dashboard (unless expired)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired') === 'true') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('Your session has expired. Please log in again.');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (localStorage.getItem('emahu_seller_logged_in') === 'true') {
      router.replace('/seller/dashboard');
    }
  }, [router]);

  const onGoogleSuccess = useCallback(async ({ email, name, idToken }) => {
    setLoading(true);
    setError('');
    try {
      const data = await googleLoginUser({ email, name, role: 'seller', idToken });
      if (data.exists === false) {
        setLoading(false);
        router.push(`/seller/register?email=${encodeURIComponent(data.email)}&name=${encodeURIComponent(data.name)}`);
        return;
      }
      saveAuthSession(data, 'seller');
      setLoading(false);
      router.replace('/seller/dashboard');
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Google Sign-In failed');
    }
  }, [router]);

  const onGoogleError = useCallback((msg) => {
    setError(msg);
  }, []);

  const { triggerGoogleSignIn, isGoogleEnabled, renderGoogleButton } = useGoogleAuth(onGoogleSuccess, onGoogleError);

  const handleGoogleSignIn = () => triggerGoogleSignIn();

  useEffect(() => {
    if (isGoogleEnabled) {
      renderGoogleButton('google-signin-btn');
    }
  }, [isGoogleEnabled, renderGoogleButton]);

  const handleAppleSignIn = () => {
    setError('Apple Sign-In is not supported yet.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // Call actual backend authentication
      const data = await loginUser(email, password);

      // Verify the user is a seller
      if (data.user.role !== 'seller') {
        throw new Error('Access denied. Please log in using the correct portal.');
      }

      saveAuthSession(data, 'seller');
      setLoading(false);
      
      router.replace('/seller/dashboard');
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Invalid email or password.');
    }
  };

  return (
    <div className="sl-wrapper">
      {/* Dynamic Ambient Background Blobs */}
      <div className="sl-ambient-blob sl-ambient-blob--1" />
      <div className="sl-ambient-blob sl-ambient-blob--2" />

      {/* Floating Sparkles/Particles */}
      <div className="sl-sparkle sl-sparkle--1" />
      <div className="sl-sparkle sl-sparkle--2" />

      <div className="sl-container">
        
        {/* Left Side: Brand Cinematic Welcome Panel */}
        <div className="sl-brand-card">
          <div className="sl-brand-card__overlay" />
          <div className="sl-brand-card__content">
            <Link href="/" className="sl-logo">
              <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="10" fill="white" />
                <path d="M8 12h16M8 16h12M8 20h14" stroke="#2b4594" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              <span className="sl-logo__text">EMAHU</span>
            </Link>
            
            <div className="sl-brand-card__hero-text">
              <h1 className="sl-brand-card__title">Empower Your Business Today.</h1>
              <p className="sl-brand-card__desc">
                Join India&apos;s most seller-friendly marketplace with 0% commission, seamless doorstep shipping, and ultra-fast 48-hour payouts.
              </p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="sl-metrics">
              <div className="sl-metric">
                <span className="sl-metric__num">2M+</span>
                <span className="sl-metric__lbl">Active Sellers</span>
              </div>
              <div className="sl-metric__divider" />
              <div className="sl-metric">
                <span className="sl-metric__num">0%</span>
                <span className="sl-metric__lbl">Commission</span>
              </div>
              <div className="sl-metric__divider" />
              <div className="sl-metric">
                <span className="sl-metric__num">48h</span>
                <span className="sl-metric__lbl">Payout Guarantee</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: High-End Interactive Login Form */}
        <div className="sl-form-card">
          <div className="sl-form-card__header">
            <h2 className="sl-form-card__title">Welcome Back</h2>
            <p className="sl-form-card__subtitle">Sign in to manage your Emahu store</p>
          </div>

          {error && (
            <div className="sl-error" role="alert">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="sl-error__icon">
                <circle cx="9" cy="9" r="8" stroke="#ef4444" strokeWidth="1.8" />
                <path d="M9 6v4M9 12h.01" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form className="sl-form" onSubmit={handleSubmit}>
            
            {/* Input Group: Email */}
            <div className="sl-input-group">
              <label className="sl-label" htmlFor="sl-email">Email Address</label>
              <div className="sl-input-wrapper">
                <svg className="sl-input-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M2.5 5h15c.8 0 1.5.7 1.5 1.5v7c0 .8-.7 1.5-1.5 1.5h-15C1.7 15 1 14.3 1 13.5v-7C1 5.7 1.7 5 2.5 5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M1 6.5l9 5.5 9-5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  id="sl-email"
                  type="email"
                  className="sl-input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Input Group: Password */}
            <div className="sl-input-group">
              <div className="sl-label-row">
                <label className="sl-label" htmlFor="sl-password">Password</label>
                <a href="#forgot" className="sl-forgot-link">Forgot Password?</a>
              </div>
              <div className="sl-input-wrapper">
                <svg className="sl-input-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="9" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M6 9V6a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                <input
                  id="sl-password"
                  type="password"
                  className="sl-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Checkbox: Remember Me */}
            <div className="sl-row">
              <label className="sl-checkbox-wrapper">
                <input
                  type="checkbox"
                  className="sl-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="sl-checkbox-custom" />
                <span className="sl-checkbox-label">Keep me logged in</span>
              </label>
            </div>

            {/* Main Submit button with dynamic loading state */}
            <button
              type="submit"
              className={`sl-btn sl-btn--primary ${loading ? 'sl-btn--loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="sl-btn__spinner" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {isGoogleEnabled && (
            <>
              {/* Social login divider */}
              <div className="sl-social-divider">
                <span className="sl-social-divider__line" />
                <span className="sl-social-divider__text">or sign in with</span>
                <span className="sl-social-divider__line" />
              </div>
            </>
          )}

          {/* Social Sign-In buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
            {isGoogleEnabled && (
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '44px' }}>
                <div id="google-signin-btn" style={{ width: '100%' }} />
              </div>
            )}
            <button 
              onClick={handleAppleSignIn} 
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                width: '100%',
                height: '44px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#000000',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a1a1a'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#000000'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.7 18.5C17.5 20.3 16.3 22 14.5 22c-1.8 0-2.3-1.1-4.3-1.1-2.1 0-2.6 1.1-4.3 1.1-1.7 0-3.1-1.8-4.2-3.4C-.6 15 1.1 9.4 3.7 9.4c1.8 0 2.8 1.1 3.9 1.1 1.1 0 2.3-1.1 4.4-1.1 1.8 0 3.2 1 4.1 2.2-3.8 2.2-3.2 7.7.3 9.4-.7 1.9-1.9 3.5-3.7 3.5zM15.8 6.4c1-1.2 1.6-2.8 1.4-4.4-1.4.1-3 1-4 2.1-1 1.1-1.8 2.8-1.5 4.3 1.5.1 3-1 4.1-2z" />
              </svg>
              <span>Continue with Apple ID</span>
            </button>
          </div>

          {/* Form Footer links */}
          <div className="sl-form-card__footer">
            <span className="sl-form-card__footer-text">New to Emahu Seller?</span>
            <Link href="/seller/register" className="sl-form-card__footer-link">
              Create an Account
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
