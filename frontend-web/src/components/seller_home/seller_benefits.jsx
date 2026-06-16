'use client';

import './seller_benefits.css';

/**
 * Onboarding step-by-step launch workflow.
 */
const onboardingSteps = [
  {
    step: '01',
    icon: '📝',
    title: 'Onboard & Register',
    desc: 'Provide your basic store particulars and create your seller profile credentials in under 2 minutes.',
    badge: 'Fast Setup'
  },
  {
    step: '02',
    icon: '🆔',
    title: 'KYC Document Verification',
    desc: 'Verify store safety by uploading your PAN Card or Aadhaar details for manual admin compliance check.',
    badge: '100% Secure'
  },
  {
    step: '03',
    icon: '💳',
    title: 'Link Your Payout Account',
    desc: 'Register your bank details securely so your weekly revenue checks can be direct-deposited directly.',
    badge: 'Direct Deposit'
  },
  {
    step: '04',
    icon: '🚀',
    title: 'List Products & Launch',
    desc: 'Go live on India\'s premium commission-friendly marketplace and track secure weekly Friday payouts.',
    badge: 'Start Selling'
  }
];

/**
 * SellerBenefits Component
 * A high-fidelity step-by-step onboarding walkthrough styled with a modern
 * glassmorphic timeline layout, hover effects, and glowing indicators.
 */
export default function SellerBenefits() {
  return (
    <section className="sb-sec" id="register">
      
      {/* Dynamic Background Glowing Blobs */}
      <div className="sb-glow sb-glow--1" />
      <div className="sb-glow sb-glow--2" />

      <div className="sb-container">
        
        {/* Header Block */}
        <div className="sb-header">
          <span className="sb-header__badge">Launch Process</span>
          <h2 className="sb-header__title">4 Simple Steps to Start Selling</h2>
          <p className="sb-header__desc">
            We’ve eliminated standard marketplace red-tape. Our onboarding process is designed to get your store verified and active within 24 hours.
          </p>
        </div>

        {/* Timeline Grid details */}
        <div className="sb-grid">
          {onboardingSteps.map((s, idx) => (
            <div key={idx} className="sb-card" style={{ '--card-index': idx }}>
              
              {/* Card top bar */}
              <div className="sb-card__header">
                <span className="sb-card__num">{s.step}</span>
                <span className="sb-card__badge">{s.badge}</span>
              </div>

              {/* Card Body details */}
              <div className="sb-card__body">
                <span className="sb-card__icon" aria-hidden="true">{s.icon}</span>
                <h3 className="sb-card__title">{s.title}</h3>
                <p className="sb-card__desc">{s.desc}</p>
              </div>

              {/* Timeline link connector bar (excluding last card) */}
              {idx < onboardingSteps.length - 1 && (
                <div className="sb-card__connector" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}

            </div>
          ))}
        </div>

        {/* Bottom trust assurance text callout */}
        <div className="sb-footer-trust">
          <span className="sb-footer-trust__badge">🛡️ Compliance Trust</span>
          <p className="sb-footer-trust__text">
            Every step is protected by industry-grade AES 256-bit database encryption. Your KYC files and Bank account details are 100% private and verified manually by Emahu compliance officials.
          </p>
        </div>

      </div>
    </section>
  );
}
