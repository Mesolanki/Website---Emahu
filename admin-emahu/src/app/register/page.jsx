'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './register.css';
import { registerUser, saveAuthSession } from '@/utils/auth';

export default function AdminRegister() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (localStorage.getItem('emahu_admin_logged_in') === 'true') {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !phone) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const data = await registerUser({
        name,
        email,
        password,
        phone,
        role: 'admin',
        address: 'EMAHU Corporate HQ'
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
                <rect width="32" height="32" rx="10" fill="white" />
                <path d="M8 12h16M8 16h12M8 20h14" stroke="#6366f1" strokeWidth="2.2" strokeLinecap="round" />
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
              <label className="ar-label" htmlFor="ar-email">Email Address</label>
              <input
                id="ar-email"
                type="email"
                className="ar-input"
                placeholder="e.g. admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="ar-input-group">
              <label className="ar-label" htmlFor="ar-phone">Phone Number</label>
              <input
                id="ar-phone"
                type="tel"
                className="ar-input"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
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

            <button
              type="submit"
              className={`ar-btn ar-btn--primary ${loading ? 'ar-btn--loading' : ''}`}
              disabled={loading}
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
