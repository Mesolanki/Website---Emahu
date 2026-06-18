'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function AppleAuthContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'buyer';
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(null);

  const testAccounts = role === 'seller' ? [
    { name: 'Emahu Certified Apple Seller', email: 'seller.apple@emahu.com', img: '' },
    { name: 'Premium Apple Merchant', email: 'merchant.apple@emahu.com', img: '' }
  ] : [
    { name: 'Apple Buyer One', email: 'buyer.apple@emahu.com', img: '' },
    { name: 'Jane Doe (Apple ID)', email: 'janedoe.apple@emahu.com', img: '' }
  ];

  const handleSelectAccount = (account) => {
    setLoadingAccount(account.email);
    setTimeout(() => {
      if (window.opener) {
        window.opener.postMessage({
          type: 'APPLE_AUTH_SUCCESS',
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
      backgroundColor: '#000000',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#ffffff',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1c1c1e',
        width: '100%',
        maxWidth: '450px',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        boxSizing: 'border-box',
        textAlign: 'center',
        border: '1px solid #2c2c2e'
      }}>
        {/* Apple Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', fontSize: '3rem', marginBottom: '20px', color: '#ffffff' }}>
          
        </div>

        <h1 style={{ fontSize: '1.4rem', fontWeight: '600', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Sign in with Apple ID</h1>
        <p style={{ fontSize: '0.9rem', color: '#8e8e93', margin: '0 0 32px 0' }}>Use your Apple ID to continue to <strong>Emahu</strong></p>

        {loadingAccount ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3.5px solid #2c2c2e',
              borderTopColor: '#ffffff',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 20px'
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontSize: '0.9rem', color: '#8e8e93', margin: 0 }}>Connecting Apple ID securely...</p>
          </div>
        ) : !showManual ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
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
                  backgroundColor: '#2c2c2e',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  fontSize: '0.95rem',
                  color: '#ffffff'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3c'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2c2c2e'}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#1c1c1e',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  border: '1px solid #3a3a3c'
                }}>
                  {acc.img}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: '#ffffff' }}>{acc.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#8e8e93' }}>{acc.email}</div>
                </div>
              </button>
            ))}

            <div style={{ borderBottom: '1px solid #2c2c2e', margin: '12px 0' }} />

            <button
              onClick={() => setShowManual(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                width: '100%',
                padding: '16px',
                backgroundColor: 'transparent',
                border: '1px dashed #48484a',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.95rem',
                color: '#0a84ff'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(10, 132, 255, 0.05)';
                e.currentTarget.style.borderColor = '#0a84ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = '#48484a';
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'transparent',
                color: '#8e8e93',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem'
              }}>
                ➕
              </div>
              <span style={{ fontWeight: '500' }}>Use another Apple ID</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#8e8e93' }}>Name (Optional)</label>
              <input
                type="text"
                placeholder="Apple User"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #3a3a3c',
                  fontSize: '0.95rem',
                  outline: 'none',
                  backgroundColor: '#2c2c2e',
                  color: '#ffffff'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#8e8e93' }}>Apple ID Email *</label>
              <input
                type="email"
                placeholder="user@icloud.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #3a3a3c',
                  fontSize: '0.95rem',
                  outline: 'none',
                  backgroundColor: '#2c2c2e',
                  color: '#ffffff'
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
                  border: '1px solid #3a3a3c',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  color: '#8e8e93',
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
                  background: '#0a84ff',
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

        <div style={{ marginTop: '40px', fontSize: '0.75rem', color: '#8e8e93', lineHeight: '1.4', textAlign: 'left' }}>
          Your Apple ID is protected by Apple two-factor authentication. Apple will share your contact email and name with Emahu to setup your secure merchant or buyer profile.
        </div>
      </div>
    </div>
  );
}

export default function AppleAuthPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#000000', fontFamily: 'sans-serif', color: '#8e8e93' }}>Loading Apple ID Login...</div>}>
      <AppleAuthContent />
    </Suspense>
  );
}
