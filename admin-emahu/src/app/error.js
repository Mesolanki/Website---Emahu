'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    const isBuildMismatch = 
      error?.message?.includes('Failed to find Server Action') ||
      error?.message?.includes('Loading chunk failed') ||
      error?.message?.includes('older or newer deployment');

    if (isBuildMismatch) {
      console.warn('Deployment update detected in Admin Panel. Auto-reloading...');
      window.location.reload();
    } else {
      console.error('Unhandled Admin Panel Error:', error);
    }
  }, [error]);

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '480px',
        padding: '32px',
        borderRadius: '16px',
        background: 'linear-gradient(145deg, #1e293b, #0f172a)',
        border: '1px solid #334155',
        color: '#f8fafc',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
        <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px' }}>
          Admin Panel Update Detected
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
          A new update was deployed to the Admin Panel. Please refresh to load active session data.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Refresh Admin Panel
          </button>
          <button
            onClick={() => reset()}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              backgroundColor: '#334155',
              color: '#cbd5e1',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
