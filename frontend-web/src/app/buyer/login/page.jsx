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

  const { triggerGoogleSignIn } = useGoogleAuth(onGoogleSuccess, onGoogleError);

  const handleGoogleSignIn = () => triggerGoogleSignIn();


  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Enter a valid email address';
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
      const data = await loginUser(email, password);

      // Verify the user is a buyer
      if (data.user.role !== 'buyer') {
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
                <label className="br-label">Email Address</label>
                <input
                  type="email"
                  className={`br-input ${errors.email ? 'br-input--error' : ''}`}
                  placeholder="name@example.com"
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
                <Link href="#forgot" className="br-btn-sub text-buyer" style={{ fontSize: '0.75rem' }}>
                  Forgot password?
                </Link>
              </div>

              <button type="submit" className="br-btn br-btn--next" style={{ width: '100%', marginTop: '12px' }} disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(0,0,0,0.08)' }} />
                <span style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(0,0,0,0.08)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
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


