'use client';

import { useState } from 'react';
import './seller_calculator.css';

/**
 * Standard product categories with their respective commission percentages
 * managed by Emahu platform admins.
 */
const categories = [
  { name: 'Electronics & Gadgets', rate: 5 },
  { name: 'Apparel & Fashion', rate: 8 },
  { name: 'Home & Kitchen Essentials', rate: 10 },
  { name: 'Beauty & Personal Care', rate: 6 },
  { name: 'Grocery & Gourmet Foods', rate: 4 },
];

/**
 * SellerCalculator Component
 * An interactive payout & commission slider calculator designed to build trust
 * with future vendors. Features responsive sliders, dynamic visual calculations,
 * and a premium, clean layout.
 */
export default function SellerCalculator() {
  const [sales, setSales] = useState(150000); // Default sales: ₹1.5 Lakhs
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);

  // Calculate calculations
  const commissionAmount = Math.round((sales * selectedCategory.rate) / 100);
  const takeHomeEarnings = Math.round(sales - commissionAmount);

  // Format currency in Indian Rupees format (INR)
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <section className="sc-sec" id="pricing">
      
      {/* Background ambient glowing details */}
      <div className="sc-glow sc-glow--1" />
      <div className="sc-glow sc-glow--2" />

      <div className="sc-container">
        
        {/* Header Block */}
        <div className="sc-header">
          <span className="sc-header__badge">Fees & Transparency</span>
          <h2 className="sc-header__title">Estimate Your Earnings</h2>
          <p className="sc-header__desc">
            No hidden setup fees, no monthly maintenance charges. Emahu runs on a transparent commission model. Calculate your monthly earnings below.
          </p>
        </div>

        {/* Dynamic Calculator Grid */}
        <div className="sc-calc-card">
          
          {/* Left Block: Sliders and Inputs */}
          <div className="sc-calc-inputs">
            
            {/* Input 1: Category Selector */}
            <div className="sc-group">
              <label className="sc-label">Select Your Product Category</label>
              <div className="sc-cat-grid">
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    className={`sc-cat-btn ${selectedCategory.name === cat.name ? 'sc-cat-btn--active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    <span>{cat.name}</span>
                    <span className="sc-cat-btn__rate">{cat.rate}% Fee</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input 2: Monthly Sales Slider */}
            <div className="sc-group">
              <div className="sc-slider-header">
                <label className="sc-label">Estimated Monthly Sales</label>
                <span className="sc-slider-val">{formatCurrency(sales)}</span>
              </div>
              <div className="sc-range-wrapper">
                <input
                  type="range"
                  min="10000"
                  max="1000000"
                  step="5000"
                  value={sales}
                  onChange={(e) => setSales(Number(e.target.value))}
                  className="sc-range-input"
                />
                <div className="sc-range-marks">
                  <span>₹10K</span>
                  <span>₹2.5L</span>
                  <span>₹5L</span>
                  <span>₹7.5L</span>
                  <span>₹10L+</span>
                </div>
              </div>
            </div>

            {/* Admin Policy Callout info */}
            <div className="sc-policy-info">
              <div className="sc-policy-info__icon">⚙️</div>
              <div className="sc-policy-info__body">
                <strong>Admin Controlled Commission</strong>
                <p>Emahu platform admins calibrate commission settings fairly per category to sustain secure infrastructure and marketing.</p>
              </div>
            </div>

          </div>

          {/* Right Block: Live Earnings Screen Visualizer */}
          <div className="sc-calc-screen">
            <div className="sc-screen-overlay" />
            <div className="sc-screen-inner">
              
              <span className="sc-screen-subtitle">Your Monthly Payout</span>
              <h3 className="sc-screen-headline">{formatCurrency(takeHomeEarnings)}</h3>
              <span className="sc-screen-tag">Take-home Earnings (Net)</span>

              {/* Dynamic breakdown table */}
              <div className="sc-breakdown">
                <div className="sc-breakdown-row">
                  <span>Monthly Sales (Gross)</span>
                  <strong>{formatCurrency(sales)}</strong>
                </div>
                <div className="sc-breakdown-row sc-breakdown-row--commission">
                  <span>Emahu Fee ({selectedCategory.rate}%)</span>
                  <strong>- {formatCurrency(commissionAmount)}</strong>
                </div>
              </div>

              {/* Payout Mechanism Callout Info */}
              <div className="sc-payout-widget">
                <h4 className="sc-payout-title">
                  <span className="sc-payout-title__dot" />
                  <span>Weekly Payout Policy</span>
                </h4>
                <div className="sc-payout-grid">
                  <div className="sc-payout-cell">
                    <span>Schedule</span>
                    <strong>Every Friday</strong>
                  </div>
                  <div className="sc-payout-cell">
                    <span>Verification</span>
                    <strong>Manual Review</strong>
                  </div>
                </div>
                <p className="sc-payout-note">
                  Payouts are verified and **manually approved** by admins every week to ensure absolute bank-clearing security and zero automatic sweep errors.
                </p>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
