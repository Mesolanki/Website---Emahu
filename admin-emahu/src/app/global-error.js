'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    const isBuildMismatch = 
      error?.message?.includes('Failed to find Server Action') ||
      error?.message?.includes('Loading chunk failed') ||
      error?.message?.includes('older or newer deployment');

    if (isBuildMismatch) {
      window.location.reload();
    }
  }, [error]);

  return (
    <html>
      <body style={{
        margin: 0,
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          maxWidth: '450px',
          textAlign: 'center',
          padding: '32px',
          borderRadius: '16px',
          backgroundColor: '#1e293b',
          border: '1px solid #334155'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>
            Admin System Updated
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
            A new update has been applied to the Admin system. Please refresh to continue.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Refresh Admin Panel
          </button>
        </div>
      </body>
    </html>
  );
}
