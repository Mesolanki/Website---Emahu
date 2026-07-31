'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', role: 'buyer', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Background Decorative Glows */}
      <div style={{
        position: 'fixed',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%)',
        top: '-100px',
        left: '-100px',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'fixed',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
        bottom: '-100px',
        right: '-100px',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />

      {/* Main Container */}
      <div style={{ width: '100%', maxWidth: '960px', zIndex: 1 }}>

        {/* Back Link */}
        <Link href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: '#94a3b8',
          textDecoration: 'none',
          fontSize: '0.9rem',
          fontWeight: '600',
          marginBottom: '32px',
          transition: 'color 0.2s'
        }}>
          ← Return to Home
        </Link>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            margin: '0 0 12px 0',
            background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Contact EMAHU Support & Help Center
          </h1>
          <p style={{ fontSize: '1.05rem', color: '#94a3b8', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
            Have questions about buying, selling, or logistics on EMAHU? We are available to assist you.
          </p>
        </div>

        {/* Contact Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginBottom: '48px'
        }}>
          {/* Email Support Card */}
          <a
            href="mailto:emahu23072026@gmail.com"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '28px',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'transform 0.2s, border-color 0.2s, background 0.2s',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem'
            }}>
              ✉️
            </div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#f8fafc' }}>Email Support</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>Send us an email anytime and we will respond promptly.</p>
            <span style={{ fontSize: '1rem', fontWeight: '700', color: '#38bdf8', marginTop: 'auto' }}>
              emahu23072026@gmail.com →
            </span>
          </a>

          {/* Phone / Call Support Card */}
          <a
            href="tel:9081330134"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '28px',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'transform 0.2s, border-color 0.2s, background 0.2s',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem'
            }}>
              📞
            </div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#f8fafc' }}>Direct Helpline</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>Call our official customer support hotline directly.</p>
            <span style={{ fontSize: '1rem', fontWeight: '700', color: '#818cf8', marginTop: 'auto' }}>
              +91 9081330134 →
            </span>
          </a>

          {/* Location / Headquarters Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem'
            }}>
              📍
            </div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#f8fafc' }}>Headquarters</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>EMAHU Hub Technologies, Ahmedabad, Gujarat, India.</p>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#34d399', marginTop: 'auto' }}>
              Mon - Sat: 9:00 AM - 8:00 PM IST
            </span>
          </div>
        </div>

        {/* Message Form Box */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '36px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', margin: '0 0 24px 0', color: '#f8fafc' }}>
            Send Us a Message
          </h2>

          {submitted ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
              <h3 style={{ fontSize: '1.3rem', color: '#34d399', margin: '0 0 8px 0' }}>Thank You! Your message has been sent.</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: '0 0 24px 0' }}>
                We will contact you via email at <strong>{formData.email}</strong> or phone at <strong>+91 9081330134</strong> shortly.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      height: '46px',
                      padding: '0 16px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="emahu23072026@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      height: '46px',
                      padding: '0 16px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="9081330134"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      height: '46px',
                      padding: '0 16px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>User Portal Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{
                      width: '100%',
                      height: '46px',
                      padding: '0 16px',
                      borderRadius: '12px',
                      background: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  >
                    <option value="buyer">Buyer / Customer</option>
                    <option value="seller">Seller / Merchant</option>
                    <option value="delivery">Delivery Logistics Partner</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>Message Details</label>
                <textarea
                  required
                  rows="4"
                  placeholder="How can we help you today?"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(56, 189, 248, 0.25)',
                  transition: 'opacity 0.2s'
                }}
              >
                Submit Support Message
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
