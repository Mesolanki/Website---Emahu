'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '@/app/buyer/register/buyer-register.css'; // Reuses the unified light onboarding styles
import { loginUser, saveAuthSession, googleLoginUser } from '@/utils/auth';
import { useGoogleAuth } from '@/utils/useGoogleAuth';

/**
 * Retail Buyer Login Component
 * A premium, light-themed Buyer Sign In portal for normal users.
 */
export default function BuyerLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // If already logged in, redirect directly to the buyer account marketplace home
  useEffect(() => {
    if (localStorage.getItem('emahu_buyer_logged_in') === 'true') {
      router.replace('/buyer/products');
    }
  }, [router]);

  const onGoogleSuccess = useCallback(async ({ email, name, idToken }) => {
    setLoading(true);
    setErrors({});
    try {
      const data = await googleLoginUser({ email, name, role: 'buyer', idToken });
      if (data.exists === false) {
        setLoading(false);
        router.push(`/buyer/register?email=${encodeURIComponent(data.email)}&name=${encodeURIComponent(data.name)}`);
        return;
      }
      if (data.user && data.user.role !== 'buyer' && data.user.role !== 'admin') {
        throw new Error('Access denied. Please log in using the correct portal.');
      }
      saveAuthSession(data, 'buyer');
      setLoading(false);
      setSuccess(true);
      setTimeout(() => router.replace('/buyer/products'), 1000);
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


  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Phone number or email is required';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      // Call actual backend authentication
      const data = await loginUser(email, password, 'buyer');

      // Verify the user is a buyer
      if (data.user.role !== 'buyer' && data.user.role !== 'admin') {
        throw new Error('Access denied. Please log in using the correct portal.');
      }

      saveAuthSession(data, 'buyer');
      setLoading(false);
      setSuccess(true);

      setTimeout(() => {
        router.replace('/buyer/products'); // Redirect to buyer marketplace home
      }, 1000);
    } catch (err) {
      setLoading(false);
      setErrors({ general: err.message || 'Invalid email or password' });
    }
  };

  return (
    <div className="br-wrapper">
      <div className="br-blob br-blob--1" />
      <div className="br-blob br-blob--2" />

      {/* Main Single Login Card (No Sidebar needed for simple login) */}
      <div className="br-container" style={{ maxWidth: '480px', gridTemplateColumns: '1fr' }}>
        <div className="br-form-panel" style={{ padding: '48px 40px' }}>
          
          {/* Logo Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <Link href="/" className="br-logo" style={{ marginBottom: '16px', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="10" fill="#4169e1" />
                <path d="M8 12h16M8 16h12M8 20h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              <span className="br-logo__text">EMAHU</span>
            </Link>
            <h1 className="br-title" style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Buyer Sign In</h1>
            <p className="br-subtitle" style={{ fontSize: '0.85rem' }}>Sign in to your personal buyer account to start shopping.</p>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} className="br-form-grid br-form-grid--full" style={{ marginBottom: '24px' }}>
              
              {errors.general && (
                <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fca5a5', fontSize: '0.85rem', marginBottom: '8px' }}>
                  {errors.general}
                </div>
              )}

              <div className="br-field">
                <label className="br-label">Phone Number or Email</label>
                <input
                  type="text"
                  className={`br-input ${errors.email ? 'br-input--error' : ''}`}
                  placeholder="e.g. 9876543210 or name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email || errors.general) setErrors((prev) => ({ ...prev, email: '', general: '' }));
                  }}
                  disabled={loading}
                />
                {errors.email && <span className="br-error">{errors.email}</span>}
              </div>

              <div className="br-field">
                <label className="br-label">Password</label>
                <input
                  type="password"
                  className={`br-input ${errors.password ? 'br-input--error' : ''}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password || errors.general) setErrors((prev) => ({ ...prev, password: '', general: '' }));
                  }}
                  disabled={loading}
                />
                {errors.password && <span className="br-error">{errors.password}</span>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-8px' }}>
                <Link href="/forgot-password?role=buyer" className="br-btn-sub text-buyer" style={{ fontSize: '0.75rem' }}>
                  Forgot password?
                </Link>
              </div>

              {/* Terms & Conditions Checkbox */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '12px 0 8px 0', padding: '0 2px' }}>
                <input 
                  id="agree-portal-terms"
                  type="checkbox" 
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  style={{ width: '16px', height: '16px', marginTop: '2px', cursor: 'pointer' }}
                />
                <label htmlFor="agree-portal-terms" style={{ fontSize: '0.78rem', color: '#475569', lineHeight: '1.4', cursor: 'pointer', userSelect: 'none' }}>
                  I agree to the <a href="#" onClick={(e) => { e.preventDefault(); alert("EMAHU Terms of Service & Partner Conditions: By signing in, you agree to inspect items upon receipt, release escrow payments promptly, and follow the marketplace standard of conduct."); }} style={{ color: '#4169e1', textDecoration: 'underline', fontWeight: 'bold' }}>Terms & Partner Conditions</a> of EMAHU Marketplace.
                </label>
              </div>

              <button 
                type="submit" 
                className="br-btn br-btn--next" 
                style={{ width: '100%', marginTop: '12px', ...(!agreeTerms ? { opacity: 0.5, cursor: 'not-allowed', background: '#94a3b8' } : {}) }} 
                disabled={loading || !agreeTerms}
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>

              {isGoogleEnabled && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', gap: '10px' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(0,0,0,0.08)' }} />
                    <span style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(0,0,0,0.08)' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', alignItems: 'center' }}>
                    <div id="google-signin-btn" style={{ width: '100%', minHeight: '44px' }} />
                  </div>
                </>
              )}
            </form>
          ) : (
            <div className="br-success-view" style={{ padding: '20px 0' }}>
              <div className="br-success-icon" style={{ background: '#d1fae5', color: '#10b981' }}>✓</div>
              <h3>Access Approved!</h3>
              <p className="br-subtitle" style={{ fontSize: '0.85rem' }}>Redirecting to EMAHU marketplace...</p>
            </div>
          )}

          {/* Form Footer */}
          {!loading && !success && (
            <div style={{ textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '20px', fontSize: '0.85rem' }}>
              <span style={{ color: '#718096' }}>New buyer? </span>
              <Link href="/buyer/register" className="br-btn-sub text-buyer" style={{ fontWeight: '600' }}>
                Create Account
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}


