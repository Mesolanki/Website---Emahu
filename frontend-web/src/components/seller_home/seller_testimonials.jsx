'use client';

import { useEffect, useRef, useState } from 'react';
import './seller_testimonials.css';

/* ─── Stat counters ─────────────────────────────────────────────── */
const stats = [
  { value: 12400, suffix: '+', label: 'Active Sellers', prefix: '' },
  { value: 58, suffix: ' Cr+', label: 'Total Payouts', prefix: '₹' },
  { value: 28000, suffix: '+', label: 'Pin Codes Served', prefix: '' },
  { value: 99.7, suffix: '%', label: 'On-Time Payout Rate', prefix: '', decimals: 1 },
];

/* ─── Testimonial cards data ─────────────────────────────────────── */
const testimonials = [
  {
    name: 'Rahul Sharma',
    role: 'Electronics Seller · Delhi',
    avatar: 'RS',
    color: '#2563eb',
    rating: 5,
    revenue: '₹4.2L / mo',
    quote: 'After switching from Flipkart, my monthly earnings jumped by 38%. Zero commission means I keep every rupee I earn. The weekly Friday payout is always on time.',
  },
  {
    name: 'Priya Mehta',
    role: 'Fashion Brand · Mumbai',
    avatar: 'PM',
    color: '#7c3aed',
    rating: 5,
    revenue: '₹2.8L / mo',
    quote: 'The KYC process was under 10 minutes and my store was live by the same evening. The AI catalog tool alone saved me 6 hours a week on product listings.',
  },
  {
    name: 'Arun Patel',
    role: 'Home Goods · Ahmedabad',
    avatar: 'AP',
    color: '#059669',
    rating: 5,
    revenue: '₹6.1L / mo',
    quote: 'I was skeptical at first — no commission sounded too good. But the numbers speak for themselves. Emahu is exactly what small sellers in India need.',
  },
  {
    name: 'Sneha Rao',
    role: 'Beauty & Skincare · Bengaluru',
    avatar: 'SR',
    color: '#dc2626',
    rating: 5,
    revenue: '₹1.9L / mo',
    quote: 'The logistics grid is unreal. Same product, same price — I get 18% better courier rates through Emahu than booking directly. The smart routing is genuinely impressive.',
  },
  {
    name: 'Mohammed Irfan',
    role: 'Grocery Seller · Hyderabad',
    avatar: 'MI',
    color: '#d97706',
    rating: 5,
    revenue: '₹3.5L / mo',
    quote: 'The Emahu system gives me full confidence that every buyer payment is protected. No more worrying about chargebacks or disputed orders eating into margins.',
  },
  {
    name: 'Kavita Joshi',
    role: 'Handcraft Store · Jaipur',
    avatar: 'KJ',
    color: '#0891b2',
    rating: 5,
    revenue: '₹88K / mo',
    quote: 'As a first-time online seller, Emahu made the whole experience feel safe and simple. The support team helped me list my first 50 products in one afternoon.',
  },
];

/* ─── Animated Counter Hook ─────────────────────────────────────── */
function useCounter(target, duration = 2000, decimals = 0, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration, decimals]);
  return count;
}

function StatCard({ stat, started }) {
  const count = useCounter(stat.value, 2200, stat.decimals || 0, started);
  return (
    <div className="st-stat-card">
      <div className="st-stat-number">
        <span className="st-stat-pre">{stat.prefix}</span>
        <span className="st-stat-val">
          {stat.decimals ? count.toFixed(stat.decimals) : Math.floor(count).toLocaleString('en-IN')}
        </span>
        <span className="st-stat-suf">{stat.suffix}</span>
      </div>
      <p className="st-stat-label">{stat.label}</p>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function SellerTestimonials() {
  const statsRef = useRef(null);
  const [statsStarted, setStatsStarted] = useState(false);

  // Trigger counters when stats bar scrolls into view
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;

    // Safety fallback: auto-trigger after 1200ms if observer is slow
    const timer = setTimeout(() => {
      setStatsStarted(true);
    }, 1200);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsStarted(true);
          clearTimeout(timer);
          observer.disconnect();
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(el);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  // Duplicate cards for seamless infinite scroll
  const doubled = [...testimonials, ...testimonials];

  return (
    <section className="st-section" id="testimonials">
      {/* Ambient glows */}
      <div className="st-bg">
        <div className="st-bg__glow st-bg__glow--left" />
        <div className="st-bg__glow st-bg__glow--right" />
      </div>

      <div className="st-container">
        {/* Section Header */}
        <div className="st-header">
          <span className="st-header__badge">Seller Stories</span>
          <h2 className="st-header__title">Trusted by 12,400+ Sellers Across India</h2>
          <p className="st-header__desc">
            {"From first-time entrepreneurs to established brands — here's what real sellers say about selling on Emahu."}
          </p>
        </div>
      </div>

      {/* ── Scrolling Marquee (full-width, outside container) ── */}
      <div className="st-marquee-wrapper" aria-label="Seller testimonials">
        {/* Row 1 — scrolls left */}
        <div className="st-marquee st-marquee--left">
          <div className="st-marquee__track">
            {doubled.map((t, i) => (
              <TestimonialCard key={`a-${i}`} t={t} />
            ))}
          </div>
        </div>

        {/* Row 2 — scrolls right (mirrored) */}
        <div className="st-marquee st-marquee--right">
          <div className="st-marquee__track">
            {[...doubled].reverse().map((t, i) => (
              <TestimonialCard key={`b-${i}`} t={t} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="st-container">
        <div className="st-stats-bar" ref={statsRef}>
          {stats.map((stat, i) => (
            <StatCard key={i} stat={stat} started={statsStarted} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ t }) {
  return (
    <div className="st-card">
      {/* Card top: avatar + name + rating */}
      <div className="st-card__top">
        <div className="st-card__avatar" style={{ background: t.color }}>
          {t.avatar}
        </div>
        <div className="st-card__author">
          <span className="st-card__name">{t.name}</span>
          <span className="st-card__role">{t.role}</span>
        </div>
        <div className="st-card__revenue">{t.revenue}</div>
      </div>

      {/* Stars */}
      <div className="st-card__stars" aria-label="5 stars">
        {'★★★★★'.split('').map((s, i) => <span key={i}>{s}</span>)}
      </div>

      {/* Quote text */}
      <p className="st-card__quote">&quot;{t.quote}&quot;</p>
    </div>
  );
}
