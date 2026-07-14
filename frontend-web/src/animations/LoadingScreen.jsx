'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * LoadingScreen — Elegant logo animation shown on first page load.
 * Fades out smoothly before showing page content.
 */
export default function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Respect reduced motion — skip loader entirely
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReducedMotion) {
      setVisible(false);
      return;
    }

    // Show loader for 1.2s then fade out
    const timer = setTimeout(() => setVisible(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Don't render on server
  if (!mounted) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '16px',
            background: '#ffffff',
            pointerEvents: 'none',
          }}
        >
          {/* Animated Logo */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <svg
              width="56"
              height="56"
              viewBox="0 0 32 32"
              fill="none"
              aria-label="EMAHU"
            >
              <rect width="32" height="32" rx="10" fill="url(#loadGrad)" />
              <motion.path
                d="M8 12h16M8 16h12M8 20h14"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
              />
              <defs>
                <linearGradient id="loadGrad" x1="0" y1="0" x2="32" y2="32">
                  <stop stopColor="#63b3ed" />
                  <stop offset="1" stopColor="#4169e1" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>

          {/* Brand name */}
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            style={{
              fontSize: '1.2rem',
              fontWeight: 900,
              letterSpacing: '2px',
              background: 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            EMAHU
          </motion.span>

          {/* Loading dots */}
          <motion.div
            style={{ display: 'flex', gap: '6px', marginTop: '4px' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#6366f1',
                }}
                animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
