'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0f172a',
      color: '#ffffff',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '24px',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Decorative Neon Glows */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(49, 151, 149, 0.15) 0%, transparent 70%)',
        top: '20%',
        left: '15%',
        filter: 'blur(40px)',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
        bottom: '15%',
        right: '10%',
        filter: 'blur(50px)',
        zIndex: 0
      }} />

      {/* Main Content Card */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px' }}>
        <h1 style={{
          fontSize: '8rem',
          fontWeight: 900,
          margin: 0,
          lineHeight: 1,
          background: 'linear-gradient(135deg, #319795 0%, #6366f1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-2px',
          textShadow: '0 4px 20px rgba(49,151,149,0.1)'
        }}>
          404
        </h1>

        <h2 style={{
          fontSize: '2rem',
          fontWeight: 800,
          margin: '24px 0 12px',
          color: '#f8fafc',
          letterSpacing: '-0.5px'
        }}>
          Lost in the Grid?
        </h2>

        <p style={{
          fontSize: '1rem',
          lineHeight: '1.6',
          color: '#94a3b8',
          margin: '0 0 32px'
        }}>
          The page you are looking for has either been moved, decommissioned, or never existed in the EMAHU marketplace network.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <Link href="/" style={{
            padding: '12px 24px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #319795 0%, #2b6cb0 100%)',
            color: '#ffffff',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '0.95rem',
            boxShadow: '0 4px 14px rgba(49, 151, 149, 0.3)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(49, 151, 149, 0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(49, 151, 149, 0.3)'; }}
          >
            Return to Gateway
          </Link>
          <Link href="/buyer/products" style={{
            padding: '12px 24px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#f8fafc',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '0.95rem',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
          >
            Browse Catalog
          </Link>
        </div>
      </div>
    </div>
  );
}
