'use client';

import { useState } from 'react';
import './seller_faq.css';

/**
 * Frequently Asked Questions (FAQ) with standard verified answers.
 */
const faqs = [
  {
    question: 'How does Emahu\'s commission structure work?',
    answer: 'Emahu operates on a fair, category-based commission structure. You only pay a flat fee (ranging from 4% to 10% depending on your product category) when you make a sale. Admins manage and update these rates transparently to maintain safe infrastructure.'
  },
  {
    question: 'When do I receive my seller payouts?',
    answer: 'Payouts are processed on a weekly schedule. To ensure absolute bank security and eliminate automated sweep failures, payouts are reviewed and approved manually by our finance admins every Friday directly to your registered bank account.'
  },
  {
    question: 'What documentation is mandatory for KYC verification?',
    answer: 'To verify your store and secure transaction payouts, you must upload your PAN Card or Aadhaar Card front copy, along with active Bank Payout Details (Account Number & IFSC Code) under the registration wizard.'
  },
  {
    question: 'Can I manage my own shipping courier rates?',
    answer: 'Absolutely. Emahu offers shipping managed by the vendor. You have complete flexibility to configure your preferred logistics partners, specify custom shipping fees per region, and coordinate courier handovers.'
  },
  {
    question: 'Are there registration fees or monthly seller hub charges?',
    answer: 'None whatsoever. Listing products, store registration, and inventory management are 100% free. You only pay the nominal category commission rate when a customer places an order.'
  }
];

/**
 * SellerFaq Component
 * A premium accordion FAQ widget with dynamic state, smooth sliding transitions,
 * and high-end glassmorphic borders designed to remove merchant onboarding doubts.
 */
export default function SellerFaq() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="sfq-sec" id="support">
      
      {/* Background glowing blurs */}
      <div className="sfq-glow sfq-glow--1" />
      <div className="sfq-glow sfq-glow--2" />

      <div className="sfq-container">
        
        {/* Header Block */}
        <div className="sfq-header">
          <span className="sfq-header__badge">Seller Support FAQs</span>
          <h2 className="sfq-header__title">Frequently Asked Questions</h2>
          <p className="sfq-header__desc">
            Got questions about payouts, commissions, or KYC settings? Find rapid answers to help launch your Emahu storefront.
          </p>
        </div>

        {/* Accordion List details */}
        <div className="sfq-list">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={index} 
                className={`sfq-item ${isOpen ? 'sfq-item--open' : ''}`}
                onClick={() => toggleFaq(index)}
              >
                {/* Accordion Trigger button */}
                <button
                  type="button"
                  className="sfq-trigger"
                  aria-expanded={isOpen}
                  id={`sfq-trigger-${index}`}
                >
                  <span className="sfq-question">{faq.question}</span>
                  <span className="sfq-icon-wrap" aria-hidden="true">
                    <svg className="sfq-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>

                {/* Accordion Answer content */}
                <div 
                  className="sfq-answer-container" 
                  style={{ maxHeight: isOpen ? '200px' : '0' }}
                  role="region"
                  aria-labelledby={`sfq-trigger-${index}`}
                >
                  <p className="sfq-answer">{faq.answer}</p>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
