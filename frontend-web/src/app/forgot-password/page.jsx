'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './forgot-password.css';
import API_BASE from '@/utils/config';

export default function ForgotPassword() {
  const router = useRouter();
  
  // Flow steps: 'email', 'otp', 'reset', 'success'
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('buyer');
  
  // Operation states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [devOtp, setDevOtp] = useState(''); // Simulated OTP for developer ease
  const [isSandboxRestricted, setIsSandboxRestricted] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('role');
      if (r === 'seller') {
        setRole('seller');
      } else if (r === 'delivery') {
        setRole('delivery');
      }
    }
  }, []);
  
  // Timer & Resend states
  const [timer, setTimer] = useState(60);
  const [resendAttempts, setResendAttempts] = useState(0);
  const timerRef = useRef(null);
  
  // Input refs for auto-focus OTP fields
  const otpRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null)
  ];

  // Start timer count down
  const startTimer = () => {
    setTimer(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Password validations
  const passwordValidations = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[@$!%*?&#]/.test(newPassword)
  };

  const isPasswordValid = 
    passwordValidations.length && 
    passwordValidations.uppercase && 
    passwordValidations.lowercase && 
    passwordValidations.number && 
    passwordValidations.special;

  // Step 1: Submit Email
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter a registered email address');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');
    setDevOtp('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setSuccessMsg('Verification code sent!');
      if (data.otpCode) {
        setDevOtp(data.otpCode);
      }
      setIsSandboxRestricted(!!data.isSandboxRestricted);
      setStep('otp');
      startTimer();
      // Auto focus first OTP digit
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (err) {
      setError(err.message || 'Error occurred while requesting password reset.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle OTP input digit keys
  const handleOtpChange = (index, val) => {
    const updated = [...otpValues];
    // Take only last character typed
    const cleanVal = val.slice(-1).replace(/[^0-9]/g, '');
    updated[index] = cleanVal;
    setOtpValues(updated);
    setError('');

    // Auto focus next input
    if (cleanVal && index < 5) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      // Focus previous input on backspace
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasteData)) {
      const digits = pasteData.split('');
      setOtpValues(digits);
      otpRefs[5].current?.focus();
      setError('');
    }
  };

  // Step 2: Submit OTP Verification
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otpValues.join('');
    if (otpCode.length < 6) {
      setError('Please enter the full 6-digit OTP code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otpCode
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid OTP code');
      }

      setResetToken(data.passwordResetToken);
      setSuccessMsg('OTP verified successfully');
      setError('');
      setStep('reset');
    } catch (err) {
      setError(err.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Resend OTP
  const handleResendOtp = async () => {
    if (timer > 0) return;
    if (resendAttempts >= 3) {
      setError('Maximum resend attempts (3) exceeded. Please try again later.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');
    setDevOtp('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend OTP');
      }

      setResendAttempts((prev) => prev + 1);
      setSuccessMsg('Verification code resent!');
      if (data.otpCode) {
        setDevOtp(data.otpCode);
      }
      setIsSandboxRestricted(!!data.isSandboxRestricted);
      startTimer();
      setOtpValues(['', '', '', '', '', '']);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (err) {
      setError(err.message || 'Error occurred while resending OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password submit
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!isPasswordValid) {
      setError('Password does not meet validation requirements');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          passwordResetToken: resetToken,
          newPassword,
          confirmPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Reset failed');
      }

      setStep('success');
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push(role === 'seller' ? '/seller/login' : role === 'delivery' ? '/delivery' : '/buyer/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fp-wrapper">
      <div className="fp-blob fp-blob--1" />
      <div className="fp-blob fp-blob--2" />

      <div className="fp-card">
        
        {/* Brand Header */}
        <div className="fp-header">
          <Link href="/" className="fp-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="10" fill="#6366f1" />
              <path d="M8 12h16M8 16h12M8 20h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <span className="fp-logo-text">EMAHU</span>
          </Link>
          <h1 className="fp-title">
            {step === 'email' && 'Forgot Password'}
            {step === 'otp' && 'Verify OTP Code'}
            {step === 'reset' && 'Create New Password'}
            {step === 'success' && 'Reset Successful'}
          </h1>
          <p className="fp-subtitle">
            {step === 'email' && 'Enter your registered email address to receive a secure password reset OTP code on your mobile number.'}
            {step === 'otp' && 'We have sent a verification code to your registered mobile number.'}
            {step === 'reset' && 'Choose a strong password containing uppercase, lowercase, numbers, and special characters.'}
            {step === 'success' && 'Your password has been updated. You will be redirected to the login page shortly.'}
          </p>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="fp-alert fp-alert--error" role="alert">
            ⚠️ {error}
          </div>
        )}
        
        {successMsg && !error && (
          <div className="fp-alert fp-alert--success">
            ✓ {successMsg}
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 'email' && (
          <form className="fp-form" onSubmit={handleEmailSubmit} noValidate>
            <div className="fp-group">
              <label className="fp-label" htmlFor="fp-email">Email Address</label>
              <input
                id="fp-email"
                type="email"
                className="fp-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                disabled={loading}
                required
              />
            </div>
            
            <button type="submit" className="fp-btn" disabled={loading}>
              {loading ? <span className="fp-spinner" /> : 'Send Reset Code'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Remember your credentials? </span>
              <Link href={role === 'seller' ? "/seller/login" : role === 'delivery' ? "/delivery" : "/buyer/login"} className="fp-resend-link" style={{ fontSize: '0.82rem' }}>
                Sign In
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: OTP Verification */}
        {step === 'otp' && (
          <form className="fp-form" onSubmit={handleOtpSubmit}>
            <div className="fp-group">
              <label className="fp-label" style={{ textAlign: 'center', display: 'block' }}>Enter 6-Digit OTP</label>
              
              <div className="fp-otp-container" onPaste={handleOtpPaste}>
                {otpValues.map((val, idx) => (
                  <input
                    key={idx}
                    ref={otpRefs[idx]}
                    type="text"
                    maxLength={1}
                    className="fp-otp-input"
                    value={val}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    disabled={loading}
                  />
                ))}
              </div>
            </div>

            {devOtp && isSandboxRestricted && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '12px', borderRadius: '10px', textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', marginBottom: '6px', opacity: 0.85 }}>📧 Code shown here because Resend domain is unverified (Sandbox):</div>
                <div
                  style={{ letterSpacing: '6px', fontSize: '1.5rem', fontWeight: '800', color: '#fff', background: 'rgba(0,0,0,0.25)', padding: '6px 14px', borderRadius: '6px', display: 'inline-block', cursor: 'pointer', userSelect: 'all' }}
                  onClick={() => { const d=[...devOtp.split('')]; setOtpValues(d); }}
                  title="Click to auto-fill"
                >
                  {devOtp}
                </div>
                <div style={{ marginTop: '5px', fontSize: '0.72rem', opacity: 0.7 }}>👆 Click to auto-fill</div>
              </div>
            )}





            <div className="fp-timer-row">
              {timer > 0 ? (
                <span>Resend code in <strong>{timer}s</strong></span>
              ) : (
                <button
                  type="button"
                  className="fp-resend-link"
                  onClick={handleResendOtp}
                  disabled={loading || resendAttempts >= 3}
                >
                  Resend Code {resendAttempts > 0 && `(${3 - resendAttempts} remaining)`}
                </button>
              )}
              <span>Attempts: {resendAttempts}/3</span>
            </div>

            <button type="submit" className="fp-btn" style={{ marginTop: '16px' }} disabled={loading}>
              {loading ? <span className="fp-spinner" /> : 'Verify Reset Code'}
            </button>

            <button
              type="button"
              className="fp-resend-link"
              style={{ alignSelf: 'center', fontSize: '0.82rem', marginTop: '8px' }}
              onClick={() => {
                setStep('email');
                setError('');
                setSuccessMsg('');
              }}
            >
              ← Back to Email
            </button>
          </form>
        )}

        {/* STEP 3: Reset Password */}
        {step === 'reset' && (
          <form className="fp-form" onSubmit={handleResetSubmit}>
            <div className="fp-group">
              <label className="fp-label" htmlFor="fp-newpass">New Password</label>
              <input
                id="fp-newpass"
                type="password"
                className="fp-input"
                placeholder="Enter strong password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError('');
                }}
                disabled={loading}
                required
              />
            </div>

            <div className="fp-group">
              <label className="fp-label" htmlFor="fp-confirmpass">Confirm Password</label>
              <input
                id="fp-confirmpass"
                type="password"
                className="fp-input"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                disabled={loading}
                required
              />
            </div>

            {/* Password strength checklist */}
            <div className="fp-requirements">
              <div className={`fp-req-item ${passwordValidations.length ? 'fp-req-item--valid' : 'fp-req-item--invalid'}`}>
                {passwordValidations.length ? '✓' : '●'} Min 8 characters
              </div>
              <div className={`fp-req-item ${passwordValidations.uppercase ? 'fp-req-item--valid' : 'fp-req-item--invalid'}`}>
                {passwordValidations.uppercase ? '✓' : '●'} 1 Uppercase Letter
              </div>
              <div className={`fp-req-item ${passwordValidations.lowercase ? 'fp-req-item--valid' : 'fp-req-item--invalid'}`}>
                {passwordValidations.lowercase ? '✓' : '●'} 1 Lowercase Letter
              </div>
              <div className={`fp-req-item ${passwordValidations.number ? 'fp-req-item--valid' : 'fp-req-item--invalid'}`}>
                {passwordValidations.number ? '✓' : '●'} 1 Number Digit
              </div>
              <div className={`fp-req-item ${passwordValidations.special ? 'fp-req-item--valid' : 'fp-req-item--invalid'}`}>
                {passwordValidations.special ? '✓' : '●'} 1 Special Character (@$!...)
              </div>
              <div className={`fp-req-item ${confirmPassword && newPassword === confirmPassword ? 'fp-req-item--valid' : 'fp-req-item--invalid'}`}>
                {confirmPassword && newPassword === confirmPassword ? '✓' : '●'} Passwords match
              </div>
            </div>

            <button
              type="submit"
              className="fp-btn"
              style={{ marginTop: '16px' }}
              disabled={loading || !isPasswordValid || newPassword !== confirmPassword}
            >
              {loading ? <span className="fp-spinner" /> : 'Confirm New Password'}
            </button>
          </form>
        )}

        {/* STEP 4: Success View */}
        {step === 'success' && (
          <div className="fp-success-view">
            <div className="fp-success-icon">✓</div>
            <h3>Password Reset Completed!</h3>
            <p className="fp-subtitle" style={{ fontSize: '0.88rem', color: '#94a3b8', marginTop: '8px' }}>
              Your credentials are secured. Redirecting you to the Sign In screen...
            </p>
            <Link href={role === 'seller' ? "/seller/login" : role === 'delivery' ? "/delivery" : "/buyer/login"} className="fp-btn" style={{ marginTop: '24px', textDecoration: 'none' }}>
              Sign In Now
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
