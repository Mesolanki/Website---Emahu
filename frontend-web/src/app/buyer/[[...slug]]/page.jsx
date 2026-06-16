'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BuyerDashboardCatchAll() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/buyer/products');
  }, [router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0a0b10', color: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #1f2937', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>Redirecting to products directory...</p>
      </div>
    </div>
  );
}
