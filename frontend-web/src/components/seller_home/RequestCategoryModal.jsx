'use client';

import { useState } from 'react';
import API_BASE from '@/utils/config';

export default function RequestCategoryModal({
  isOpen,
  onClose,
  parentId,
  parentName,
  onSuccess
}) {
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (!categoryName.trim()) {
      setError('Please provide a category name.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const token = localStorage.getItem('emahu_seller_token');
      const res = await fetch(`${API_BASE}/api/categories/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          name: categoryName.trim(),
          parentId: parentId || null
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Request submitted successfully.');
        setCategoryName('');
        if (onSuccess) {
          // Trigger reload of category tree
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1500);
        }
      } else {
        setError(data.error || 'Failed to submit request.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999
    }}>
      <div className="modal-card" style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '24px',
        width: '90%',
        maxWidth: '440px',
        boxShadow: 'var(--shadow-lg)',
        color: 'var(--text-primary)',
        boxSizing: 'border-box'
      }}>
        <div className="modal-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '16px',
          marginBottom: '20px'
        }}>
          <div className="modal-title-group" style={{ textAlign: 'left' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Request New Category</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Propose a global category. Requires Admin approval.
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '1.5rem',
              lineHeight: 1,
              padding: 0
            }}
          >
            &times;
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid var(--color-danger)',
              borderRadius: '8px',
              color: '#b91c1c',
              fontSize: '0.85rem'
            }}>
              ⚠️ {error}
            </div>
          )}

          {successMsg && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid var(--color-success)',
              borderRadius: '8px',
              color: '#065f46',
              fontSize: '0.85rem'
            }}>
              ✓ {successMsg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Parent Category</label>
            <input
              type="text"
              readOnly
              value={parentName || 'Root / None'}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                outline: 'none',
                cursor: 'not-allowed'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Proposed Category Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Smart Watches, Air Fryers"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '16px',
            marginTop: '8px'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '10px 20px',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                backgroundColor: '#d97706', // Merchant Orange / Gold
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
