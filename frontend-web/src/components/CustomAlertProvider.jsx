'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CustomAlertProvider({ children }) {
  const [alertState, setAlertState] = useState({ isOpen: false, message: '' });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.alert = (message) => {
        setAlertState({ isOpen: true, message });
      };
    }
  }, []);

  const closeAlert = () => {
    setAlertState({ isOpen: false, message: '' });
  };

  return (
    <>
      {children}

      <AnimatePresence>
        {alertState.isOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            pointerEvents: 'none'
          }}>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeAlert}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.4)',
                backdropFilter: 'blur(8px)',
                pointerEvents: 'auto'
              }}
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '440px',
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(25px)',
                WebkitBackdropFilter: 'blur(25px)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '24px',
                padding: '28px',
                boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                pointerEvents: 'auto',
                boxSizing: 'border-box',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
              }}
            >
              {/* Decorative Accent Glow */}
              <div style={{
                position: 'absolute',
                top: '-50px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100px',
                height: '100px',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
                filter: 'blur(10px)',
                pointerEvents: 'none'
              }} />

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                  color: '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem'
                }}>
                  ✨
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.01em' }}>
                    EMAHU Platform
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                    Notification Alert
                  </span>
                </div>
              </div>

              {/* Message Content */}
              <div style={{
                fontSize: '0.9rem',
                lineHeight: '1.6',
                color: '#334155',
                fontWeight: '550',
                maxHeight: '300px',
                overflowY: 'auto',
                paddingRight: '4px'
              }}>
                {alertState.message}
              </div>

              {/* Action Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={closeAlert}
                  style={{
                    padding: '10px 24px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                    transition: 'box-shadow 0.2s ease',
                    outline: 'none'
                  }}
                >
                  Understood
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
