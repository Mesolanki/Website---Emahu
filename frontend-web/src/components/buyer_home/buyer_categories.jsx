'use client';

import { useState } from 'react';
import Link from 'next/link';
import './buyer_categories.css';

const filters = [
  { id: 'all', label: 'All Collections' },
  { id: 'trending', label: '🔥 Trending Now' },
  { id: 'eco', label: '🌿 Eco & Sustainable' },
  { id: 'wellness', label: '✨ Wellness & Lifestyle' }
];

const categories = [
  {
    id: 'tech',
    title: 'Electronics & Tech',
    desc: 'Certified high-end tech & smart devices with premium quality inspection.',
    count: '850+ Items',
    badge: 'Trending',
    gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(147, 51, 234, 0.08) 100%)',
    iconColor: '#3b82f6',
    isLarge: true,
    tags: ['trending', 'all'],
    features: [
      { emoji: '📱', text: '100% Certified Devices' },
      { emoji: '🛡️', text: 'Emahu Secure Protection' },
      { emoji: '⚡', text: '48hr Express Delivery' }
    ],
    icon: (
      <svg className="bc-card__svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {/* High-fidelity Monitor screen in background */}
        <rect x="2" y="3" width="15" height="10" rx="1.5" />
        <path d="M6 13v3M13 13v3M3 16h13" />
        {/* Sleek Smartphone in foreground, masking the monitor behind it using the primary background color */}
        <rect x="14" y="7" width="8" height="14" rx="2" fill="var(--bg-primary, #ffffff)" stroke="currentColor" strokeWidth="1.7" />
        <line x1="17" y1="9.5" x2="19" y2="9.5" strokeWidth="1.2" />
        <circle cx="18" cy="18" r="0.75" fill="currentColor" stroke="none" />
      </svg>
    )
  },
  {
    id: 'kitchen',
    title: 'Kitchen & Dining',
    desc: 'Sustainable eco-friendly dining utensils & premium culinary craft.',
    count: '420+ Items',
    badge: 'Eco Friendly',
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.08) 100%)',
    iconColor: '#10b981',
    isLarge: false,
    tags: ['eco', 'all'],
    icon: (
      <svg className="bc-card__svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {/* High-fidelity Chef Cloche Cover & Plate */}
        <path d="M2 18h20" strokeWidth="2" />
        <path d="M20 18v-1a8 8 0 0 0-16 0v1" />
        <circle cx="12" cy="8" r="1.5" fill="currentColor" stroke="none" />
        {/* Cutlery crossing in background */}
        <path d="M8 21v-3M16 21v-3" opacity="0.6" strokeWidth="1.5" />
      </svg>
    )
  },
  {
    id: 'sports',
    title: 'Sports & Outdoors',
    desc: 'AeroCloud high-performance athletic running footwear & accessories.',
    count: '310+ Items',
    badge: 'New Drops',
    gradient: 'linear-gradient(135deg, rgba(245, 158, 11 0.08) 0%, rgba(217, 119, 6, 0.08) 100%)',
    iconColor: '#f59e0b',
    isLarge: false,
    tags: ['trending', 'all'],
    icon: (
      <svg className="bc-card__svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {/* High-fidelity Athletic Stopwatch representing performance */}
        <circle cx="12" cy="13" r="7" />
        <path d="M12 9v4l3 3" />
        <path d="M12 6V4M10 4h4" strokeWidth="2" />
        {/* Dynamic speed motion lines */}
        <path d="M2 8h3M2 12h2M2 16h4" opacity="0.5" strokeWidth="1.5" />
      </svg>
    )
  },
  {
    id: 'apparel',
    title: 'Minimalist Apparel',
    desc: 'Curated 100% organic cotton fabrics, premium blazers, and sustainable clothing drops.',
    count: '640+ Items',
    badge: 'Popular',
    gradient: 'linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(225, 29, 72, 0.08) 100%)',
    iconColor: '#f43f5e',
    isLarge: true,
    tags: ['trending', 'wellness', 'all'],
    features: [
      { emoji: '🌿', text: '100% Organic Cotton' },
      { emoji: '🧵', text: 'Reinforced Double Stitching' },
      { emoji: '🕊️', text: 'Ethical Fair Trade Certified' }
    ],
    icon: (
      <svg className="bc-card__svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {/* High-precision Coat Hanger and Shirt Tie contours */}
        <path d="M12 7V5a2 2 0 0 1 2 2" strokeWidth="1.5" />
        <path d="M2 12l10-5 10 5" strokeWidth="1.8" />
        <path d="M5 11.5v7A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-7" />
        <path d="M12 10v4l-1.5 1.5L12 17l1.5-1.5L12 14v-4" fill="none" strokeWidth="1.2" />
      </svg>
    )
  },
  {
    id: 'beauty',
    title: 'Beauty & Wellness',
    desc: 'Certified botanical cosmetics, skincare drops, & absolute wellness essentials.',
    count: '180+ Items',
    badge: 'Organic',
    gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(147, 51, 234, 0.08) 100%)',
    iconColor: '#a855f7',
    isLarge: false,
    tags: ['wellness', 'all'],
    icon: (
      <svg className="bc-card__svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {/* Luxury Cosmetic Jar Cream Container */}
        <path d="M5 11a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-7z" strokeWidth="1.8" />
        <rect x="7" y="5" width="10" height="3" rx="1" />
        {/* Sparkle detailing */}
        <path d="M12 11.5v3M10.5 13h3" strokeWidth="1.2" />
        <path d="M18.5 4.5l.5.5.5-.5-.5-.5-.5.5z" fill="currentColor" stroke="none" />
      </svg>
    )
  },
  {
    id: 'books',
    title: 'Books & Stationery',
    desc: 'Handcrafted calligraphic journals, vegan leather planners & refined sustainable desk drops.',
    count: '120+ Items',
    badge: 'Limited Edition',
    gradient: 'linear-gradient(135deg, rgba(234, 88, 12, 0.08) 0%, rgba(194, 65, 12, 0.08) 100%)',
    iconColor: '#ea580c',
    isLarge: true,
    tags: ['eco', 'wellness', 'all'],
    features: [
      { emoji: '📖', text: 'Ink-proof 120GSM Sheets' },
      { emoji: '📔', text: 'Smyth-Sewn Flex Binding' },
      { emoji: '🖋️', text: 'Includes Refillable Ink Pen' }
    ],
    icon: (
      <svg className="bc-card__svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {/* High-fidelity Open Journal Notebook */}
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 1 4 19.5z" />
        <path d="M8 6h8M8 10h8M8 14h5" opacity="0.6" strokeWidth="1.4" />
      </svg>
    )
  }
];

export default function BuyerCategories() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [hoveredCard, setHoveredCard] = useState(null);

  return (
    <section id="categories" className="bc-section" aria-labelledby="bc-section-title">
      <div className="bc-container">
        
        {/* Section Header */}
        <div className="bc-header-block">
          <div className="bc-header-subtitle">Curated Bento Collections</div>
          <h2 id="bc-section-title" className="bc-header-title">
            Explore Curated Categories
          </h2>
          <p className="bc-header-desc">
            Discover verified, high-quality retail drops backed by full buyer protection and express delivery.
          </p>
        </div>

        {/* Dynamic Interactive Filter Pills */}
        <div className="bc-filters">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`bc-filter-pill ${activeFilter === filter.id ? 'bc-filter-pill--active' : ''}`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Categories Bento Grid */}
        <div className="bc-grid bc-grid--bento">
          {categories.map((cat) => {
            const matchesFilter = cat.tags.includes(activeFilter);
            const isHovered = hoveredCard === cat.id;
            
            return (
              <Link 
                key={cat.id} 
                href={`/buyer/category/${cat.id}`}
                className={`bc-card ${cat.isLarge ? 'bc-card--large' : ''} ${isHovered ? 'bc-card--hovered' : ''} ${!matchesFilter ? 'bc-card--dimmed' : ''}`}
                onMouseEnter={() => setHoveredCard(cat.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  '--card-bg-gradient': cat.gradient,
                  '--accent-color': cat.iconColor
                }}
              >
                {/* Radial Glow Overlay */}
                <div className="bc-card__glow" />

                {/* Card Top: Badges and Counters */}
                <div className="bc-card__top">
                  <span className="bc-card__badge">{cat.badge}</span>
                  <span className="bc-card__count">{cat.count}</span>
                </div>

                {/* Card Main Block */}
                <div className="bc-card__content-wrap">
                  
                  {/* Left Column: Icon and Texts */}
                  <div className="bc-card__main-info">
                    <div className="bc-card__icon-wrapper">
                      <div className="bc-card__icon-bg">
                        {cat.icon}
                      </div>
                    </div>
                    
                    <div className="bc-card__body">
                      <h3 className="bc-card__title">{cat.title}</h3>
                      <p className="bc-card__desc">{cat.desc}</p>
                    </div>
                  </div>

                  {/* Right Column (Only for large Bento Cards): Specifications/Features */}
                  {cat.isLarge && cat.features && (
                    <div className="bc-card__spec-list">
                      {cat.features.map((feat, i) => (
                        <div key={i} className="bc-card__spec-item">
                          <span className="bc-card__spec-emoji">{feat.emoji}</span>
                          <span className="bc-card__spec-text">{feat.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                </div>

                {/* Card Interactive Footer */}
                <div className="bc-card__footer">
                  <span className="bc-card__action-text">Explore Drops</span>
                  <svg className="bc-card__action-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

              </Link>
            );
          })}
        </div>

      </div>
    </section>
  );
}
