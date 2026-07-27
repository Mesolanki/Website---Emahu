'use client';

import React from 'react';

/**
 * SellerNormsModal Component
 * Interactive glassmorphism modal presenting official EMAHU Merchant Governance & Operating Norms.
 */
export default function SellerNormsModal({ isOpen, onClose, onAccept }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeInModal 0.25s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #1e293b, #0f172a)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          color: '#f8fafc',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '22px 28px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}
            >
              📜
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ffffff', margin: 0 }}>
                EMAHU Merchant Governance & Seller Norms
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Official Partner Policy & Operating Terms (Updated 2026)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              color: '#94a3b8',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Body content */}
        <div
          style={{
            padding: '24px 28px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            fontSize: '0.9rem',
            lineHeight: '1.6',
            color: '#cbd5e1'
          }}
        >
          {/* Return Logistics Notice Alert Callout */}
          <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)', border: '1.5px dashed rgba(239, 68, 68, 0.4)', padding: '16px 20px', borderRadius: '14px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>🚨</span>
            <div style={{ fontSize: '0.88rem', lineHeight: '1.55', color: '#f8fafc' }}>
              <strong style={{ color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: '800' }}>
                Return Logistics Notice:
              </strong>{' '}
              If a buyer declines or fails to accept a perfect, undamaged order matching the exact listed product specifications, the{' '}
              <strong style={{ color: '#fca5a5' }}>
                entire logistics cost, return transit coordination, and absolute platform responsibility lie solely on the Seller
              </strong>.
            </div>
          </div>

          {/* Seller Categories & Merchant Classifications */}
          <div style={{ background: 'rgba(255, 255, 255, 0.025)', padding: '18px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h3 style={{ color: '#38bdf8', fontSize: '0.95rem', margin: '0 0 12px 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Merchant Classifications & Seller Tiers
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>🏡 Home & Individual</div>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: '1.4', display: 'block' }}>Dispatching items crafted or stored at home. Flexible local operations.</span>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>🏬 Retail Shops & Local</div>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: '1.4', display: 'block' }}>Physical storefronts offering instant local city catalog pick & fast dispatch.</span>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>🏢 Corporate Brands</div>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: '1.4', display: 'block' }}>Scaled regional business entities with multi-city warehousing & shipping.</span>
              </div>
            </div>
          </div>

          {/* Norm 1 */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <h3 style={{ color: '#60a5fa', fontSize: '0.98rem', margin: '0 0 6px 0', fontWeight: '600' }}>
              1. Platform Model & 0% Commission Policy
            </h3>
            <p style={{ margin: 0 }}>
              EMAHU operates as an open merchant matching portal connecting local sellers directly with retail buyers. Sellers keep 100% of their product listed price with 0% platform commission fees.
            </p>
          </div>

          {/* Norm 2 */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <h3 style={{ color: '#60a5fa', fontSize: '0.98rem', margin: '0 0 6px 0', fontWeight: '600' }}>
              2. 48-Hour Payout Guarantee & Escrow Safety
            </h3>
            <p style={{ margin: 0 }}>
              Customer payments are held securely in platform escrow. Funds are automatically released and settled to your verified bank account within 48 hours following delivery OTP validation by the courier partner.
            </p>
          </div>

          {/* Norm 3 */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <h3 style={{ color: '#f87171', fontSize: '0.98rem', margin: '0 0 6px 0', fontWeight: '600' }}>
              3. Merchant Conduct & Prohibited Products
            </h3>
            <p style={{ margin: 0 }}>
              Counterfeit items, expired goods, weapons, illegal substances, and misleading descriptions are strictly prohibited. Sellers listing prohibited products face immediate account suspension, legal reporting, and permanent forfeiture of pending balances.
            </p>
          </div>

          {/* Norm 4 */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <h3 style={{ color: '#60a5fa', fontSize: '0.98rem', margin: '0 0 6px 0', fontWeight: '600' }}>
              4. Fulfillment & Dispatch SLAs
            </h3>
            <p style={{ margin: 0 }}>
              Sellers agree to package and mark orders ready for dispatch within 24 hours of receiving an order notification. Repeated dispatch delays will reduce store search ranking or result in seller account probation.
            </p>
          </div>

          {/* Norm 5 */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <h3 style={{ color: '#60a5fa', fontSize: '0.98rem', margin: '0 0 6px 0', fontWeight: '600' }}>
              5. Returns & Quality Disclaimers
            </h3>
            <p style={{ margin: 0 }}>
              Sellers must honor a 7-day return policy for damaged, missing, or defective items. Returns for wrong sizes or un-damaged items are subject to individual store return policies.
            </p>
          </div>

          {/* Norm 6 */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <h3 style={{ color: '#60a5fa', fontSize: '0.98rem', margin: '0 0 6px 0', fontWeight: '600' }}>
              6. Taxation & Legal Compliance
            </h3>
            <p style={{ margin: 0 }}>
              Sellers are independent entities responsible for their own GST filings, state trade licensing, and product tax compliance. EMAHU acts solely as a matching software platform and holds no liability for seller tax obligations.
            </p>
          </div>

          {/* Norm 7 - Return Logistics Policy */}
          <div style={{ background: 'rgba(239, 68, 68, 0.06)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
            <h3 style={{ color: '#f87171', fontSize: '0.98rem', margin: '0 0 6px 0', fontWeight: '700' }}>
              7. Return Logistics & Undamaged Order Rejection Policy
            </h3>
            <p style={{ margin: 0, color: '#e2e8f0' }}>
              If a buyer declines or fails to accept a perfect, undamaged order matching the exact listed product specifications, the entire logistics cost, return transit coordination, and absolute platform responsibility lie solely on the Seller.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: '18px 28px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)'
          }}
        >
          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
            By accepting, you agree to comply with all EMAHU seller policies.
          </span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'transparent',
                color: '#94a3b8',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.88rem'
              }}
            >
              Close
            </button>
            {onAccept && (
              <button
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                style={{
                  padding: '10px 22px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
                }}
              >
                I Understand & Accept Norms
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
