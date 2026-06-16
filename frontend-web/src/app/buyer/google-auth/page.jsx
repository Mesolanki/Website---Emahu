'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function GoogleAuthContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'buyer';
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(null);

  const testAccounts = role === 'seller' ? [
    { name: 'ds (Seller)', email: 'qwert@test.com', img: '👤' },
    { name: 'EW (Seller)', email: 'ccyu@gmail.com', img: '👤' }
  ] : [
    { name: 'FFf Buyer', email: 'qwerty123@gmail.com', img: '👤' },
    { name: 'As Buyer', email: 'qwerty1234@gmail.com', img: '👤' }
  ];

  const handleSelectAccount = (account) => {
    setLoadingAccount(account.email);
    setTimeout(() => {
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_SUCCESS',
          email: account.email,
          name: account.name,
          role: role
        }, '*');
      }
      window.close();
    }, 1500);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    
    const account = {
      name: nameInput.trim() || emailInput.split('@')[0],
      email: emailInput.trim()
    };
    handleSelectAccount(account);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f0f4f9',
      fontFamily: 'Roboto, Arial, sans-serif',
      color: '#1f1f1f',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        width: '100%',
        maxWidth: '450px',
        borderRadius: '28px',
        padding: '40px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        boxSizing: 'border-box',
        textAlign: 'center'
      }}>
        {/* Google Multi-Color Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '24px' }}>
          <span style={{ color: '#4285F4' }}>G</span>
          <span style={{ color: '#EA4335' }}>o</span>
          <span style={{ color: '#FBBC05' }}>o</span>
          <span style={{ color: '#4285F4' }}>g</span>
          <span style={{ color: '#34A853' }}>l</span>
          <span style={{ color: '#EA4335' }}>e</span>
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: '400', margin: '0 0 8px 0' }}>Choose an account</h1>
        <p style={{ fontSize: '0.9rem', color: '#5f6368', margin: '0 0 32px 0' }}>to continue to <strong style={{ color: '#4285F4' }}>Emahu</strong></p>

        {loadingAccount ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3.5px solid #e8f0fe',
              borderTopColor: '#1a73e8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 20px'
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontSize: '0.9rem', color: '#5f6368', margin: 0 }}>Signing in as {loadingAccount}...</p>
          </div>
        ) : !showManual ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
            {testAccounts.map((acc, i) => (
              <button
                key={i}
                onClick={() => handleSelectAccount(acc)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  width: '100%',
                  padding: '16px',
                  background: 'none',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  fontSize: '0.95rem',
                  color: '#3c4043'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#e8f0fe',
                  color: '#1a73e8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem'
                }}>
                  {acc.img}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', color: '#3c4043' }}>{acc.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#5f6368' }}>{acc.email}</div>
                </div>
              </button>
            ))}

            <div style={{ borderBottom: '1px solid #dadce0', margin: '12px 0' }} />

            <button
              onClick={() => setShowManual(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                width: '100%',
                padding: '16px',
                background: 'none',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                fontSize: '0.95rem',
                color: '#1a73e8'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#f1f3f4',
                color: '#5f6368',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem'
              }}>
                ➕
              </div>
              <span style={{ fontWeight: '500' }}>Use another account</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#5f6368' }}>Name (Optional)</label>
              <input
                type="text"
                placeholder="Google User"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #dadce0',
                  fontSize: '0.95rem',
                  outline: 'none',
                  backgroundColor: '#fff',
                  color: '#1f1f1f'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#5f6368' }}>Email Address *</label>
              <input
                type="email"
                placeholder="user@gmail.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #dadce0',
                  fontSize: '0.95rem',
                  outline: 'none',
                  backgroundColor: '#fff',
                  color: '#1f1f1f'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifySelf: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setShowManual(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '100px',
                  border: '1px solid #dadce0',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  color: '#1a73e8',
                  fontWeight: '500'
                }}
              >
                Back
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 24px',
                  borderRadius: '100px',
                  border: 'none',
                  background: '#1a73e8',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  flex: 1
                }}
              >
                Continue
              </button>
            </div>
          </form>
        )}

        <div style={{ marginTop: '40px', fontSize: '0.75rem', color: '#5f6368', lineHeight: '1.4', textAlign: 'left' }}>
          To continue, Google will share your name, email address, language preference, and profile picture with Emahu. Before using this app, you can review Emahu&apos;s <span style={{ color: '#1a73e8', cursor: 'pointer' }}>privacy policy</span> and <span style={{ color: '#1a73e8', cursor: 'pointer' }}>terms of service</span>.
        </div>
      </div>
    </div>
  );
}

export default function GoogleAuthPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#666' }}>Loading Google Sign-In Chooser...</div>}>
      <GoogleAuthContent />
    </Suspense>
  );
}
