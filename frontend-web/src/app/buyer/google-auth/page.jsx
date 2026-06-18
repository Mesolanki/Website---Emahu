'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function GoogleAuthContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'buyer';
  const [loadingAccount, setLoadingAccount] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [clientId, setClientId] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setClientId(localStorage.getItem('emahu_google_client_id') || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '');
    setMounted(true);
  }, []);

  // Load GIS SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    return () => {
      try {
        document.body.removeChild(script);
      } catch (e) {}
    };
  }, []);

  // Initialize GIS when client ID is loaded/changed
  useEffect(() => {
    if (typeof window === 'undefined' || !clientId) return;

    const initGis = () => {
      if (!window.google?.accounts?.id) {
        setTimeout(initGis, 200);
        return;
      }
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          ux_mode: 'popup'
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-real-btn-container'),
          { theme: 'outline', size: 'large', width: 370 }
        );
      } catch (err) {
        console.error('GIS initialization error:', err);
        setErrorMsg('Failed to initialize Google Sign-In helper.');
      }
    };

    initGis();
  }, [clientId]);

  const handleCredentialResponse = (response) => {
    const idToken = response.credential;
    let decodedPayload = {};
    try {
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      decodedPayload = JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Error decoding ID token:', e);
    }

    setLoadingAccount(decodedPayload.email);
    setTimeout(() => {
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_SUCCESS',
          email: decodedPayload.email,
          name: decodedPayload.name || decodedPayload.given_name || decodedPayload.email.split('@')[0],
          role: role,
          idToken: idToken
        }, '*');
      }
      window.close();
    }, 1500);
  };

  const handleSaveClientId = (e) => {
    e.preventDefault();
    const inputId = e.target.elements.clientIdInput.value.trim();
    if (inputId) {
      localStorage.setItem('emahu_google_client_id', inputId);
      setClientId(inputId);
      setShowConfig(false);
      setErrorMsg('');
    }
  };

  const handleClearClientId = () => {
    localStorage.removeItem('emahu_google_client_id');
    setClientId('');
    window.location.reload();
  };

  if (!mounted) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', color: '#666' }}>
        Initializing Google Sign-in...
      </div>
    );
  }

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
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '16px' }}>
          <span style={{ color: '#4285F4' }}>G</span>
          <span style={{ color: '#EA4335' }}>o</span>
          <span style={{ color: '#FBBC05' }}>o</span>
          <span style={{ color: '#4285F4' }}>g</span>
          <span style={{ color: '#34A853' }}>l</span>
          <span style={{ color: '#EA4335' }}>e</span>
        </div>

        <h1 style={{ fontSize: '1.4rem', fontWeight: '400', margin: '0 0 8px 0' }}>Continue with Google</h1>
        <p style={{ fontSize: '0.85rem', color: '#5f6368', margin: '0 0 24px 0' }}>to continue to <strong style={{ color: '#4285F4' }}>Emahu</strong></p>

        {errorMsg && (
          <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fca5a5', fontSize: '0.85rem', marginBottom: '16px' }}>
            {errorMsg}
          </div>
        )}

        {/* Real Google Auth Area */}
        {clientId ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '120px', justifyContent: 'center' }}>
            {loadingAccount ? (
              <div style={{ textAlign: 'center' }}>
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
            ) : (
              <>
                <div id="google-real-btn-container" style={{ margin: '10px 0' }}></div>
                <button 
                  onClick={handleClearClientId} 
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', marginTop: '16px' }}
                >
                  Clear saved Google Client ID
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: '20px', padding: '16px', borderRadius: '12px', border: '1px dashed #4285f4', backgroundColor: '#f4f8ff', textAlign: 'left' }}>
            <p style={{ fontSize: '0.82rem', margin: '0 0 10px 0', color: '#1a73e8', fontWeight: '500', lineHeight: '1.4' }}>
              ⚠️ Google Cloud Client ID is required to connect to Google. Please provide your Google Client ID below:
            </p>
            {!showConfig ? (
              <button 
                onClick={() => setShowConfig(true)}
                style={{ backgroundColor: '#1a73e8', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600', width: '100%' }}
              >
                Configure Client ID
              </button>
            ) : (
              <form onSubmit={handleSaveClientId} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input 
                  name="clientIdInput" 
                  placeholder="Paste Google Client ID here..." 
                  style={{ padding: '8px 12px', fontSize: '0.8rem', border: '1px solid #dadce0', borderRadius: '6px' }} 
                  required
                />
                <button type="submit" style={{ backgroundColor: '#34a853', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}>
                  Save and Connect
                </button>
              </form>
            )}
          </div>
        )}

        <div style={{ marginTop: '40px', fontSize: '0.72rem', color: '#5f6368', lineHeight: '1.4', textAlign: 'left' }}>
          To continue, Google will share your name, email address, language preference, and profile picture with Emahu. Before using this app, you can review Emahu&apos;s <span style={{ color: '#1a73e8', cursor: 'pointer' }}>privacy policy</span> and <span style={{ color: '#1a73e8', cursor: 'pointer' }}>terms of service</span>.
        </div>
      </div>
    </div>
  );
}

export default function GoogleAuthPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#666' }}>Loading Google Sign-In...</div>}>
      <GoogleAuthContent />
    </Suspense>
  );
}
