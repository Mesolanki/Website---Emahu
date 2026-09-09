"use client";
import React, { useState } from "react";
import "./seller_calculator.css";

const CATEGORIES = [
  { id: "electronics", name: "Electronics & Gadgets", commission: 0 },
  { id: "fashion", name: "Fashion & Apparel", commission: 0 },
  { id: "home", name: "Home & Kitchen", commission: 0 },
  { id: "beauty", name: "Beauty & Personal Care", commission: 0 },
  { id: "books", name: "Books & Stationery", commission: 0 },
  { id: "other", name: "All Other Categories", commission: 0 },
];

export default function SellerCalculator() {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [monthlySales, setMonthlySales] = useState(100000);

  // EMAHU charges 0% commission
  const commissionFee = (monthlySales * selectedCategory.commission) / 100;
  const netEarnings = monthlySales - commissionFee;

  // Comparison with typical 15% traditional marketplace commission
  const traditionalCommission = monthlySales * 0.15;
  const extraSavings = traditionalCommission - commissionFee;

  return (
    <section className="sc-sec" id="calculator">
      <div className="sc-glow sc-glow--1" />
      <div className="sc-glow sc-glow--2" />

      <div className="sc-container">
        {/* Header Block */}
        <div className="sc-header">
          <span className="sc-header__badge">Earning Calculator</span>
          <h2 className="sc-header__title">Estimate Your Monthly Profits</h2>
          <p className="sc-header__desc">
            See how much you save by selling on EMAHU with 0% platform commission compared to traditional marketplaces.
          </p>
        </div>

        {/* Calculator Card */}
        <div className="sc-calc-card">
          {/* Left Inputs Panel */}
          <div className="sc-calc-inputs">
            {/* Category Selector */}
            <div className="sc-group">
              <label className="sc-label">Select Your Product Category</label>
              <div className="sc-cat-grid">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`sc-cat-btn ${
                      selectedCategory.id === cat.id ? "sc-cat-btn--active" : ""
                    }`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    <span>{cat.name}</span>
                    <span className="sc-cat-btn__rate">
                      {cat.commission}% Commission
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sales Slider */}
            <div className="sc-group">
              <div className="sc-slider-header">
                <label className="sc-label">Estimated Monthly Sales</label>
                <span className="sc-slider-val">
                  ₹{monthlySales.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="sc-range-wrapper">
                <input
                  type="range"
                  min="10000"
                  max="1000000"
                  step="5000"
                  value={monthlySales}
                  onChange={(e) => setMonthlySales(Number(e.target.value))}
                  className="sc-range-input"
                />
                <div className="sc-range-marks">
                  <span>₹10,000</span>
                  <span>₹5,000,000</span>
                  <span>₹10,00,000</span>
                </div>
              </div>
            </div>

            {/* Policy Info Box */}
            <div className="sc-policy-info">
              <span className="sc-policy-info__icon">💡</span>
              <div className="sc-policy-info__body">
                <strong>0% Commission Policy</strong>
                <p>
                  EMAHU does not deduct high platform commission fees on your sales. You keep 100% of your earnings minus payment gateway charges.
                </p>
              </div>
            </div>
          </div>

          {/* Right Live Results Screen */}
          <div className="sc-calc-screen">
            <div className="sc-screen-overlay" />
            <div className="sc-screen-inner">
              <span className="sc-screen-subtitle">Your Take-Home Earnings</span>
              <h3 className="sc-screen-headline">
                ₹{netEarnings.toLocaleString("en-IN")}
              </h3>
              <p className="sc-screen-tag">
                Estimated monthly net payout into your bank account
              </p>

              {/* Breakdown */}
              <div className="sc-breakdown">
                <div className="sc-breakdown-row">
                  <span>Gross Monthly Sales</span>
                  <strong>₹{monthlySales.toLocaleString("en-IN")}</strong>
                </div>
                <div className="sc-breakdown-row sc-breakdown-row--commission">
                  <span>EMAHU Commission Rate</span>
                  <strong>0% (₹0)</strong>
                </div>
                <div className="sc-breakdown-row">
                  <span>Savings vs standard 15% platforms</span>
                  <strong style={{ color: "#16a34a" }}>
                    +₹{extraSavings.toLocaleString("en-IN")}/mo
                  </strong>
                </div>
              </div>

              {/* Payout Widget */}
              <div className="sc-payout-widget">
                <div className="sc-payout-title">
                  <span className="sc-payout-title__dot" />
                  <span>Direct Bank Payout Schedule</span>
                </div>
                <div className="sc-payout-grid">
                  <div className="sc-payout-cell">
                    <span>Frequency</span>
                    <strong>Daily / Weekly</strong>
                  </div>
                  <div className="sc-payout-cell">
                    <span>Payout Speed</span>
                    <strong>T+1 Settlement</strong>
                  </div>
                </div>
                <p className="sc-payout-note">
                  Payments are settled directly into your registered bank account automatically after order delivery.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
