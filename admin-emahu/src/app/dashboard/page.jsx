'use client';

import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './dashboard.css';
import { logoutUser, clearAuthSession } from '@/utils/auth';
let toastIdCounter = 0;

export default function AdminDashboard() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState('sellers');

  // Sellers and Products State
  const [sellers, setSellers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [toasts, setToasts] = useState([]);

  // Audit logs & Notifications states
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Settings & 2FA states
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [setupSecret, setSetupSecret] = useState('');
  const [setupOtpauth, setSetupOtpauth] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);

  // Seller documents states
  const [selectedSellerDocs, setSelectedSellerDocs] = useState(null); // { sellerId, documents }
  const [loadingDocsSellerId, setLoadingDocsSellerId] = useState('');
  
  // Premium Seller Detail Drawer Modal States
  const [selectedDetailSeller, setSelectedDetailSeller] = useState(null);
  const [detailTab, setDetailTab] = useState('profile'); // 'profile' | 'payout' | 'kyc' | 'performance'

  // Inline custom SKUs map
  const [customSkus, setCustomSkus] = useState({});

  // Feedback modals states (generic for reject / request changes / request more info)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('product'); // 'seller' or 'product'
  const [feedbackTargetId, setFeedbackTargetId] = useState('');
  const [feedbackDecision, setFeedbackDecision] = useState('');
  const [feedbackText, setFeedbackText] = useState('');

  // Sync details drawer when sellers update
  useEffect(() => {
    if (selectedDetailSeller) {
      const updated = sellers.find(s => s._id === selectedDetailSeller._id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedDetailSeller)) {
        setSelectedDetailSeller(updated);
      }
    }
  }, [sellers]);

  // Premium Product Detail Drawer Modal States
  const [selectedDetailProduct, setSelectedDetailProduct] = useState(null);
  const [productDetailTab, setProductDetailTab] = useState('info'); // 'info' | 'pricing' | 'seller'

  // Sync details drawer when products update
  useEffect(() => {
    if (selectedDetailProduct) {
      const updated = products.find(p => (p._id || p.id) === (selectedDetailProduct._id || selectedDetailProduct.id));
      if (!updated) {
        setSelectedDetailProduct(null);
      } else if (JSON.stringify(updated) !== JSON.stringify(selectedDetailProduct)) {
        setSelectedDetailProduct(updated);
      }
    }
  }, [products]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts((prev) => prev.slice(1));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  const triggerToast = (title, message, type = 'success') => {
    const id = `toast-${++toastIdCounter}`;
    setToasts([{ id, title, message, type }]);
  };

  // Auth checking
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('emahu_admin_logged_in') === 'true';
    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }

    const storedUser = localStorage.getItem('emahu_admin_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setTimeout(() => {
          setAdminUser(parsed);
          setIs2FAEnabled(parsed.isTwoFactorEnabled || false);
          setIsAuthorized(true);
        }, 0);
      } catch (e) {
        console.error(e);
        setTimeout(() => {
          setIsAuthorized(true);
        }, 0);
      }
    } else {
      setTimeout(() => {
        setIsAuthorized(true);
      }, 0);
    }
  }, [router]);

  const handleSessionExpired = () => {
    clearAuthSession('admin');
    router.replace('/login?expired=true');
  };

  // Fetch Sellers List
  const fetchSellers = async () => {
    setLoadingSellers(true);
    try {
      const token = localStorage.getItem('emahu_admin_token');
      if (!token) return;
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/central-sellers-directory`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      // Fallback to normal admin sellers endpoint if helper route not defined
      let data;
      if (res.status === 404) {
        const fallbackRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/admin/sellers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (fallbackRes.status === 401) {
          handleSessionExpired();
          return;
        }
        data = await fallbackRes.json();
      } else {
        data = await res.json();
      }
      
      if (data.success) {
        const sortedSellers = (data.sellers || [])
          .map(s => ({ ...s, status: s.status || 'approved' }))
          .sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (timeA !== timeB) return timeB - timeA;
            return String(b._id || '').localeCompare(String(a._id || ''));
          });
        setSellers(sortedSellers);
      } else {
        triggerToast('Error', data.error || 'Failed to fetch sellers list.', 'danger');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Network error fetching sellers.', 'danger');
    } finally {
      setLoadingSellers(false);
    }
  };

  // Fetch Products List
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const token = localStorage.getItem('emahu_admin_token');
      if (!token) return;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products/admin/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success) {
        const sortedProducts = (data.products || [])
          .map(p => ({ ...p, approvalStatus: p.approvalStatus || 'pending' }))
          .sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (timeA !== timeB) return timeB - timeA;
            return String(b._id || b.id || '').localeCompare(String(a._id || a.id || ''));
          });
        setProducts(sortedProducts);
      } else {
        triggerToast('Error', data.error || 'Failed to fetch products list.', 'danger');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Network error fetching products.', 'danger');
    } finally {
      setLoadingProducts(false);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    setLoadingAuditLogs(true);
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/audit`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  // Fetch Notifications
  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Mark all notifications read
  const markAllNotificationsRead = async () => {
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const unread = notifications.filter(n => !n.isRead);
      for (const n of unread) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/notifications/${n._id}/read`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) {
          handleSessionExpired();
          return;
        }
      }
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch seller documents
  const fetchSellerDocuments = async (sellerId) => {
    setLoadingDocsSellerId(sellerId);
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/admin/sellers/${sellerId}/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success) {
        setSelectedSellerDocs({ sellerId, documents: data.documents });
      } else {
        triggerToast('Error', data.error || 'Failed to fetch seller documents', 'danger');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Network error fetching documents', 'danger');
    } finally {
      setLoadingDocsSellerId('');
    }
  };

  // Verify a single document
  const handleVerifySellerDocument = async (sellerId, docId, status, feedback = '') => {
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/admin/sellers/${sellerId}/documents/${docId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, feedback })
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success) {
        setSelectedSellerDocs(prev => {
          if (!prev || prev.sellerId !== sellerId) return prev;
          const updatedDocs = prev.documents.map(d => d._id === docId ? data.document : d);
          return { sellerId, documents: updatedDocs };
        });
        triggerToast('Document Audited', `Document status marked as '${status}'`, 'success');
      } else {
        triggerToast('Error', data.error || 'Failed to update document status', 'danger');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 2FA setups
  const handle2FASetup = async () => {
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/admin/2fa/setup`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success) {
        setSetupSecret(data.secret);
        setSetupOtpauth(data.otpauthUrl);
        setIsSettingUp2FA(true);
      } else {
        triggerToast('Error', data.error || 'Failed to setup 2FA', 'danger');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Network error setting up 2FA', 'danger');
    }
  };

  const handle2FAVerify = async () => {
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/admin/2fa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ secret: setupSecret, code: totpCode })
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success) {
        setIs2FAEnabled(true);
        setIsSettingUp2FA(false);
        setTotpCode('');
        
        const updatedUser = { ...adminUser, isTwoFactorEnabled: true };
        setAdminUser(updatedUser);
        localStorage.setItem('emahu_admin_user', JSON.stringify(updatedUser));

        triggerToast('2FA Enabled', 'Two-factor authentication is now active on your account.', 'success');
      } else {
        triggerToast('Error', data.error || 'Invalid verification code', 'danger');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Network error verifying 2FA code', 'danger');
    }
  };

  const handle2FADisable = async () => {
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/admin/2fa/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: totpCode })
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success) {
        setIs2FAEnabled(false);
        setTotpCode('');
        
        const updatedUser = { ...adminUser, isTwoFactorEnabled: false };
        setAdminUser(updatedUser);
        localStorage.setItem('emahu_admin_user', JSON.stringify(updatedUser));

        triggerToast('2FA Disabled', 'Two-factor authentication has been disabled.', 'warning');
      } else {
        triggerToast('Error', data.error || 'Invalid verification code', 'danger');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Network error disabling 2FA', 'danger');
    }
  };

  // Load active tab data
  useEffect(() => {
    if (!isAuthorized) return;
    if (activeTab === 'sellers' || activeTab === 'new-sellers') {
      setTimeout(() => fetchSellers(), 0);
    } else if (activeTab === 'products' || activeTab === 'new-products') {
      setTimeout(() => fetchProducts(), 0);
    } else if (activeTab === 'stats') {
      setTimeout(() => {
        fetchSellers();
        fetchProducts();
      }, 0);
    } else if (activeTab === 'audit') {
      setTimeout(() => fetchAuditLogs(), 0);
    } else if (activeTab === 'notifications') {
      setTimeout(() => fetchNotifications(), 0);
    }
  }, [isAuthorized, activeTab]);

  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error(e);
    }
    clearAuthSession('admin');
    router.push('/login');
  };

  // Admin Seller Account Decision
  const handleSellerDecision = async (id, decision, feedback = '') => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/admin/sellers/${id}/decision`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ decision, feedback })
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success) {
        setSellers(prev => prev.map(s => s._id === id ? data.seller : s));
        triggerToast('Seller Updated', `Seller account status changed to '${decision}' successfully.`, 'success');
      } else {
        triggerToast('Error', data.error || 'Failed to update seller.', 'danger');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Network error updating seller status.', 'danger');
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // Admin Product Listing Decision
  const handleProductDecision = async (id, decision, reason = '', sku = '') => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products/${id}/admin-decision`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ decision, reason, sku })
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success) {
        if (data.productDeleted) {
          setProducts(prev => prev.filter(p => (p.id || p._id) !== id));
          triggerToast('Product Deleted', 'Product listing rejected 3 times and removed permanently.', 'warning');
        } else {
          setProducts(prev => prev.map(p => (p.id || p._id) === id ? data.product : p));
          if (decision === 'approve') {
            triggerToast('Product Approved', `Product approved! SKU Assigned: ${data.product.sku}. Activation Code: ${data.product.adminCode}`, 'success');
          } else if (decision === 'request_changes') {
            triggerToast('Changes Requested', 'Seller notified to edit product properties.', 'warning');
          } else {
            triggerToast('Product Rejected', `Product status set to rejected. (Rejections: ${data.product.approvalAttempts}/3)`, 'warning');
          }
        }
      } else {
        triggerToast('Error', data.error || 'Failed to save product decision.', 'danger');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Network error saving product decision.', 'danger');
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const openFeedbackModal = (type, id, decision) => {
    setFeedbackType(type);
    setFeedbackTargetId(id);
    setFeedbackDecision(decision);
    setFeedbackText('');
    setIsFeedbackModalOpen(true);
  };

  const submitFeedback = () => {
    setIsFeedbackModalOpen(false);
    if (feedbackType === 'product') {
      handleProductDecision(feedbackTargetId, feedbackDecision, feedbackText);
    } else {
      handleSellerDecision(feedbackTargetId, feedbackDecision, feedbackText);
    }
  };

  if (!isAuthorized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0a0b10', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #1f2937', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ad-layout">
      {/* Toast Notifications */}
      <div className="ad-toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`ad-toast ${toast.type}`}>
            <div className="ad-toast-content">
              <span className="ad-toast-title">{toast.title}</span>
              <span className="ad-toast-message">{toast.message}</span>
            </div>
            <button className="ad-toast-close" onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>✕</button>
          </div>
        ))}
      </div>

      {/* Feedback Modal */}
      {isFeedbackModalOpen && (
        <div className="ad-modal-overlay">
          <div className="ad-modal">
            <h3 className="ad-modal-title">
              {feedbackDecision === 'request_changes' ? 'Request Listing Changes' :
               feedbackDecision === 'more_info_requested' ? 'Request More Information' :
               'Provide Rejection Reason'}
            </h3>
            <p className="ad-modal-desc">Please enter feedback or instructions for the seller:</p>
            <textarea
              className="ad-modal-input"
              rows="4"
              placeholder="Provide clear reasons/instructions..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            />
            <div className="ad-modal-actions">
              <button className="ad-btn-sec" onClick={() => setIsFeedbackModalOpen(false)}>Cancel</button>
              <button className="ad-btn-danger" onClick={submitFeedback} disabled={!feedbackText.trim()}>
                Submit Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Merchant Detail Drawer/Modal */}
      {selectedDetailSeller && (
        <div className="ad-modal-overlay" onClick={() => setSelectedDetailSeller(null)}>
          <div className="ad-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="ad-detail-close" onClick={() => setSelectedDetailSeller(null)}>✕</button>
            
            <div className="ad-detail-header-block">
              <div className="ad-detail-title-section">
                <h3 className="ad-detail-store-name">{selectedDetailSeller.storeName || 'Merchant Profile'}</h3>
                <div className="ad-detail-store-meta">
                  <span>📂 {selectedDetailSeller.category || 'Unspecified Category'}</span>
                  <span>•</span>
                  <span>👤 {selectedDetailSeller.name}</span>
                </div>
              </div>
              <span className={`ad-status-badge ${selectedDetailSeller.status}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                {selectedDetailSeller.status?.replace(/_/g, ' ')?.toUpperCase()}
              </span>
            </div>

            <div className="ad-detail-tabs-nav">
              <button 
                className={`ad-detail-tab-trigger ${detailTab === 'profile' ? 'active' : ''}`}
                onClick={() => setDetailTab('profile')}
              >
                Business Profile
              </button>
              <button 
                className={`ad-detail-tab-trigger ${detailTab === 'payout' ? 'active' : ''}`}
                onClick={() => setDetailTab('payout')}
              >
                Payout Accounts
              </button>
              <button 
                className={`ad-detail-tab-trigger ${detailTab === 'kyc' ? 'active' : ''}`}
                onClick={() => {
                  setDetailTab('kyc');
                  fetchSellerDocuments(selectedDetailSeller._id);
                }}
              >
                Documents Compliance
              </button>
              <button 
                className={`ad-detail-tab-trigger ${detailTab === 'performance' ? 'active' : ''}`}
                onClick={() => setDetailTab('performance')}
              >
                Store Analytics
              </button>
            </div>

            <div style={{ flex: 1, minHeight: '300px' }}>
              {detailTab === 'profile' && (
                <div className="ad-detail-info-grid">
                  <div className="ad-detail-info-section">
                    <h4>Merchant Overview</h4>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Store Brand Name</span>
                      <span className="ad-detail-row-val">{selectedDetailSeller.storeName || 'N/A'}</span>
                    </div>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Vendor Category</span>
                      <span className="ad-detail-row-val">{selectedDetailSeller.category || 'N/A'}</span>
                    </div>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Created At</span>
                      <span className="ad-detail-row-val">{selectedDetailSeller.createdAt ? new Date(selectedDetailSeller.createdAt).toLocaleDateString('en-IN') : 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="ad-detail-info-section">
                    <h4>Contact Directory</h4>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Primary Owner</span>
                      <span className="ad-detail-row-val">{selectedDetailSeller.name}</span>
                    </div>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Registered Email</span>
                      <span className="ad-detail-row-val">{selectedDetailSeller.email}</span>
                    </div>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Telephone Line</span>
                      <span className="ad-detail-row-val">{selectedDetailSeller.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'payout' && (
                <div className="ad-detail-info-grid" style={{ alignItems: 'center' }}>
                  <div className="ad-detail-bank-card">
                    <div className="ad-detail-bank-logo">
                      <span>🏦 {selectedDetailSeller.bankName || 'Payout Destination'}</span>
                      <span style={{ fontSize: '0.75rem', letterSpacing: 'normal', opacity: 0.8 }}>PREMIUM MERCHANT</span>
                    </div>
                    <div className="ad-detail-bank-number">
                      {selectedDetailSeller.accountNumber ? selectedDetailSeller.accountNumber.replace(/.(?=.{4})/g, '•') : '•••• •••• ••••'}
                    </div>
                    <div className="ad-detail-bank-holder">
                      <div>
                        <span>Account Holder</span>
                        <div>{selectedDetailSeller.bankHolder || 'Holder N/A'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span>IFSC Route Code</span>
                        <div style={{ fontFamily: 'monospace' }}>{selectedDetailSeller.ifscCode || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="ad-detail-info-section">
                    <h4>Tax Details</h4>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">GSTIN / Tax Code</span>
                      <span className="ad-detail-row-val" style={{ fontFamily: 'monospace' }}>{selectedDetailSeller.gstNumber || 'Not Provided'}</span>
                    </div>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Bank Settlement Status</span>
                      <span className="ad-detail-row-val" style={{ color: '#10b981' }}>Active</span>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'kyc' && (
                <div>
                  <div className="ad-detail-info-grid" style={{ marginBottom: '20px' }}>
                    <div className="ad-detail-info-section">
                      <h4>Merchant Verification Details</h4>
                      <div className="ad-detail-row">
                        <span className="ad-detail-row-label">KYC Document Type</span>
                        <span className="ad-detail-row-val">{selectedDetailSeller.kycType?.toUpperCase() || 'PAN'}</span>
                      </div>
                      <div className="ad-detail-row">
                        <span className="ad-detail-row-label">KYC Identifier Number</span>
                        <span className="ad-detail-row-val" style={{ fontFamily: 'monospace' }}>{selectedDetailSeller.kycNumber || 'Not Provided'}</span>
                      </div>
                    </div>
                    
                    <div className="ad-detail-info-section">
                      <h4>Compliance Standing</h4>
                      <div className="ad-detail-row">
                        <span className="ad-detail-row-label">Account Verification Status</span>
                        <span className="ad-detail-row-val">{selectedDetailSeller.status?.replace(/_/g, ' ')?.toUpperCase()}</span>
                      </div>
                      <div className="ad-detail-row">
                        <span className="ad-detail-row-label">KYC Verification Grade</span>
                        <span className="ad-detail-row-val" style={{ color: '#10b981' }}>Tier 1 Verified</span>
                      </div>
                    </div>
                  </div>

                  <div className="ad-detail-info-section">
                    <h4 style={{ marginBottom: '14px' }}>Uploaded Compliance Documents</h4>
                    {loadingDocsSellerId === selectedDetailSeller._id ? (
                      <div style={{ color: 'var(--color-admin-primary)', padding: '20px 0', textAlign: 'center', fontWeight: 'bold' }}>
                        Loading compliance documents checklist...
                      </div>
                    ) : selectedSellerDocs?.sellerId === selectedDetailSeller._id ? (
                      <div className="ad-detail-docs-checklist">
                        {selectedSellerDocs.documents.map(doc => (
                          <div key={doc._id} className="ad-detail-doc-item">
                            <div className="ad-detail-doc-info">
                              <span className="ad-detail-doc-title">{doc.documentType?.replace(/_/g, ' ')}</span>
                              <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="ad-detail-doc-link">
                                🔗 Open Document File Reference
                              </a>
                              {doc.feedback && (
                                <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                                  Audit Rejection Reason: {doc.feedback}
                                </div>
                              )}
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: '600',
                                backgroundColor: doc.status === 'approved' ? 'rgba(16,185,129,0.1)' : doc.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                color: doc.status === 'approved' ? '#10b981' : doc.status === 'rejected' ? '#ef4444' : '#f59e0b'
                              }}>
                                {doc.status.toUpperCase()}
                              </span>
                              {doc.status === 'pending' && (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    className="ad-btn-action approve"
                                    style={{ height: '28px', fontSize: '0.75rem', padding: '0 10px' }}
                                    onClick={() => handleVerifySellerDocument(selectedDetailSeller._id, doc._id, 'approved')}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="ad-btn-action reject"
                                    style={{ height: '28px', fontSize: '0.75rem', padding: '0 10px' }}
                                    onClick={() => {
                                      const feedback = prompt('Please enter rejection feedback for this document:');
                                      if (feedback) {
                                        handleVerifySellerDocument(selectedDetailSeller._id, doc._id, 'rejected', feedback);
                                      }
                                    }}
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {selectedSellerDocs.documents.length === 0 && (
                          <div style={{ color: '#71717a', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>
                            No verification documents submitted by this merchant yet.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ color: '#71717a', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>
                        Compliance records not loaded.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {detailTab === 'performance' && (
                <div>
                  <div className="ad-detail-grid-cards">
                    <div className="ad-detail-metric-card">
                      <span>Products Listed</span>
                      <h4>{selectedDetailSeller.totalProducts || 0}</h4>
                    </div>
                    <div className="ad-detail-metric-card">
                      <span>Units Sold</span>
                      <h4>{selectedDetailSeller.totalSales || 0}</h4>
                    </div>
                    <div className="ad-detail-metric-card">
                      <span>Total Orders</span>
                      <h4>{selectedDetailSeller.totalOrders || 0}</h4>
                    </div>
                    <div className="ad-detail-metric-card">
                      <span>Total Revenue</span>
                      <h4>₹{(selectedDetailSeller.totalRevenue || 0).toLocaleString('en-IN')}</h4>
                    </div>
                  </div>
                  
                  <div className="ad-detail-info-section">
                    <h4>Merchant Performance Standing</h4>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Operational Quality Rating</span>
                      <span className="ad-detail-row-val" style={{ color: '#10b981' }}>Excellent (100% Fulfillment)</span>
                    </div>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Merchant Standing</span>
                      <span className="ad-detail-row-val">Active and Compliant</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="ad-detail-decision-bar">
              {(selectedDetailSeller.status === 'pending' || selectedDetailSeller.status === 'more_info_requested') ? (
                <>
                  <button
                    className="ad-btn-action approve"
                    style={{ height: '42px', padding: '0 24px', fontSize: '0.9rem' }}
                    onClick={() => {
                      handleSellerDecision(selectedDetailSeller._id, 'approve');
                    }}
                    disabled={actionLoading[selectedDetailSeller._id]}
                  >
                    {actionLoading[selectedDetailSeller._id] ? 'Updating...' : 'Approve Account'}
                  </button>
                  <button
                    className="ad-btn-action approve"
                    style={{ height: '42px', padding: '0 24px', fontSize: '0.9rem', background: 'var(--color-yellow)', color: '#000' }}
                    onClick={() => {
                      openFeedbackModal('seller', selectedDetailSeller._id, 'more_info_requested');
                    }}
                    disabled={actionLoading[selectedDetailSeller._id]}
                  >
                    Request More Info
                  </button>
                  <button
                    className="ad-btn-action reject"
                    style={{ height: '42px', padding: '0 24px', fontSize: '0.9rem' }}
                    onClick={() => {
                      openFeedbackModal('seller', selectedDetailSeller._id, 'reject');
                    }}
                    disabled={actionLoading[selectedDetailSeller._id]}
                  >
                    Reject Application
                  </button>
                </>
              ) : selectedDetailSeller.status === 'approved' ? (
                <button
                  className="ad-btn-danger"
                  style={{ height: '42px', padding: '0 24px', fontSize: '0.9rem' }}
                  onClick={() => {
                    openFeedbackModal('seller', selectedDetailSeller._id, 'reject');
                  }}
                  disabled={actionLoading[selectedDetailSeller._id]}
                >
                  Block/Suspend Merchant
                </button>
              ) : (
                <button
                  className="ad-btn-action approve"
                  style={{ height: '42px', padding: '0 24px', fontSize: '0.9rem' }}
                  onClick={() => {
                    handleSellerDecision(selectedDetailSeller._id, 'approve');
                  }}
                  disabled={actionLoading[selectedDetailSeller._id]}
                >
                  Re-Approve Merchant
                </button>
              )}
              <button className="ad-btn-sec" style={{ height: '42px', padding: '0 20px', fontSize: '0.9rem' }} onClick={() => setSelectedDetailSeller(null)}>
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Product Detail Drawer/Modal */}
      {selectedDetailProduct && (
        <div className="ad-modal-overlay" onClick={() => setSelectedDetailProduct(null)}>
          <div className="ad-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="ad-detail-close" onClick={() => setSelectedDetailProduct(null)}>✕</button>
            
            <div className="ad-detail-header-block">
              <div className="ad-detail-title-section">
                <h3 className="ad-detail-store-name">{selectedDetailProduct.name || 'Product Details'}</h3>
                <div className="ad-detail-store-meta">
                  <span>📂 {selectedDetailProduct.category || 'Unspecified Category'}</span>
                  <span>•</span>
                  <span>🏷️ Brand: {selectedDetailProduct.brand || 'N/A'}</span>
                </div>
              </div>
              <span className={`ad-status-badge ${selectedDetailProduct.approvalStatus}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                {selectedDetailProduct.approvalStatus === 'approved' ? 'LIVE' : selectedDetailProduct.approvalStatus === 'pending' ? 'PENDING' : selectedDetailProduct.approvalStatus === 'changes_requested' ? 'CHANGES REQ.' : 'REJECTED'}
              </span>
            </div>

            <div className="ad-detail-tabs-nav">
              <button 
                className={`ad-detail-tab-trigger ${productDetailTab === 'info' ? 'active' : ''}`}
                onClick={() => setProductDetailTab('info')}
              >
                General Info
              </button>
              <button 
                className={`ad-detail-tab-trigger ${productDetailTab === 'pricing' ? 'active' : ''}`}
                onClick={() => setProductDetailTab('pricing')}
              >
                Pricing &amp; Inventory
              </button>
              <button 
                className={`ad-detail-tab-trigger ${productDetailTab === 'seller' ? 'active' : ''}`}
                onClick={() => setProductDetailTab('seller')}
              >
                Merchant Vendor
              </button>
            </div>

            <div style={{ flex: 1, minHeight: '300px' }}>
              {productDetailTab === 'info' && (
                <div className="ad-detail-info-grid">
                  <div className="ad-detail-info-section" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h4>Listing Specifications</h4>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Product Name</span>
                      <span className="ad-detail-row-val">{selectedDetailProduct.name}</span>
                    </div>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Brand Label</span>
                      <span className="ad-detail-row-val">{selectedDetailProduct.brand || 'N/A'}</span>
                    </div>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Product Category</span>
                      <span className="ad-detail-row-val">{selectedDetailProduct.category}</span>
                    </div>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Added On</span>
                      <span className="ad-detail-row-val">
                        {selectedDetailProduct.createdAt ? new Date(selectedDetailProduct.createdAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' }) : 'N/A'}
                      </span>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <span className="ad-detail-row-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem' }}>Description Summary</span>
                      <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-admin-border)', maxHeight: '120px', overflowY: 'auto' }}>
                        {selectedDetailProduct.description || 'No description provided by merchant.'}
                      </p>
                    </div>
                  </div>

                  <div className="ad-detail-info-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
                    <div style={{ width: '100%', height: '260px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-admin-border)', background: '#0a0b10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {(!selectedDetailProduct.image || !selectedDetailProduct.image.startsWith('http')) ? (
                        <span style={{ fontSize: '5rem' }}>{selectedDetailProduct.image || '📦'}</span>
                      ) : (
                        <img src={selectedDetailProduct.image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {productDetailTab === 'pricing' && (
                <div className="ad-detail-info-grid">
                  <div className="ad-detail-info-section">
                    <h4>Valuation &amp; Stock</h4>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Marketplace Selling Price</span>
                      <span className="ad-detail-row-val" style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.05rem' }}>
                        ₹{selectedDetailProduct.price?.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">List Price (Strike-through)</span>
                      <span className="ad-detail-row-val" style={{ textDecoration: 'line-through' }}>
                        ₹{selectedDetailProduct.comparePrice ? selectedDetailProduct.comparePrice.toLocaleString('en-IN') : 'N/A'}
                      </span>
                    </div>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Warehouse Stock Level</span>
                      <span className="ad-detail-row-val">{selectedDetailProduct.stock} units</span>
                    </div>
                  </div>

                  <div className="ad-detail-info-section">
                    <h4>SKU &amp; Identifiers</h4>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Official Catalog SKU</span>
                      <span className="ad-detail-row-val" style={{ fontFamily: 'monospace', fontWeight: 'bold', color: selectedDetailProduct.sku ? '#10b981' : 'var(--color-admin-muted)' }}>
                        {selectedDetailProduct.sku || 'Awaiting Approval'}
                      </span>
                    </div>
                    {selectedDetailProduct.adminCode && (
                      <div className="ad-detail-row">
                        <span className="ad-detail-row-label">Activation Pin Code</span>
                        <span className="ad-detail-row-val" style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#f59e0b' }}>
                          {selectedDetailProduct.adminCode}
                        </span>
                      </div>
                    )}
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Product ID</span>
                      <span className="ad-detail-row-val" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{selectedDetailProduct._id || selectedDetailProduct.id}</span>
                    </div>
                  </div>
                </div>
              )}

              {productDetailTab === 'seller' && (
                <div className="ad-detail-info-grid">
                  <div className="ad-detail-info-section">
                    <h4>Merchant Store Info</h4>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Store Brand Name</span>
                      <span className="ad-detail-row-val">{selectedDetailProduct.seller?.storeName || 'N/A'}</span>
                    </div>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Merchant Category</span>
                      <span className="ad-detail-row-val">{selectedDetailProduct.seller?.category || 'N/A'}</span>
                    </div>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Seller Account Status</span>
                      <span className="ad-detail-row-val" style={{ textTransform: 'capitalize' }}>
                        {selectedDetailProduct.seller?.status || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="ad-detail-info-section">
                    <h4>Primary Owner details</h4>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Full Name</span>
                      <span className="ad-detail-row-val">{selectedDetailProduct.seller?.name || 'N/A'}</span>
                    </div>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Primary Email</span>
                      <span className="ad-detail-row-val">{selectedDetailProduct.seller?.email || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="ad-detail-decision-bar" style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'stretch' }}>
              {(selectedDetailProduct.approvalStatus === 'pending' || selectedDetailProduct.approvalStatus === 'changes_requested') && !selectedDetailProduct.adminCode ? (
                <div style={{ borderTop: '1px solid var(--color-admin-border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-admin-muted)', marginBottom: '6px', fontWeight: 'bold' }}>
                        CUSTOM SYSTEM SKU CODE (OPTIONAL - LEAVE BLANK TO AUTOMATICALLY GENERATE PROFESSIONAL SKU)
                      </label>
                      <input
                        type="text"
                        placeholder="E.g. EM-ELEC-PRO-38A9 (or leave blank to auto-generate)"
                        className="ad-modal-input"
                        style={{ height: '42px', fontSize: '0.9rem', width: '100%', margin: 0, background: 'rgba(255,255,255,0.02)' }}
                        value={customSkus[selectedDetailProduct.id || selectedDetailProduct._id] || ''}
                        onChange={(e) => setCustomSkus(prev => ({ ...prev, [selectedDetailProduct.id || selectedDetailProduct._id]: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                      className="ad-btn-action approve"
                      style={{ height: '42px', padding: '0 24px', fontSize: '0.9rem' }}
                      onClick={async () => {
                        await handleProductDecision(selectedDetailProduct.id || selectedDetailProduct._id, 'approve', '', customSkus[selectedDetailProduct.id || selectedDetailProduct._id]);
                      }}
                      disabled={actionLoading[selectedDetailProduct.id || selectedDetailProduct._id]}
                    >
                      {actionLoading[selectedDetailProduct.id || selectedDetailProduct._id] ? 'Auditing...' : 'Approve & Assign SKU'}
                    </button>
                    <button
                      className="ad-btn-action approve"
                      style={{ height: '42px', padding: '0 24px', fontSize: '0.9rem', background: 'var(--color-yellow)', color: '#000' }}
                      onClick={() => {
                        openFeedbackModal('product', selectedDetailProduct.id || selectedDetailProduct._id, 'request_changes');
                      }}
                      disabled={actionLoading[selectedDetailProduct.id || selectedDetailProduct._id]}
                    >
                      Request Changes
                    </button>
                    <button
                      className="ad-btn-action reject"
                      style={{ height: '42px', padding: '0 24px', fontSize: '0.9rem' }}
                      onClick={() => {
                        openFeedbackModal('product', selectedDetailProduct.id || selectedDetailProduct._id, 'reject');
                      }}
                      disabled={actionLoading[selectedDetailProduct.id || selectedDetailProduct._id]}
                    >
                      Reject Listing
                    </button>
                    <button className="ad-btn-sec" style={{ height: '42px', padding: '0 20px', fontSize: '0.9rem' }} onClick={() => setSelectedDetailProduct(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  {selectedDetailProduct.approvalStatus === 'approved' && (
                    <button
                      className="ad-btn-danger"
                      style={{ height: '42px', padding: '0 24px', fontSize: '0.9rem' }}
                      onClick={() => {
                        openFeedbackModal('product', selectedDetailProduct.id || selectedDetailProduct._id, 'reject');
                      }}
                      disabled={actionLoading[selectedDetailProduct.id || selectedDetailProduct._id]}
                    >
                      Block/Take Down Listing
                    </button>
                  )}
                  {selectedDetailProduct.approvalStatus === 'rejected' && (
                    <button
                      className="ad-btn-action approve"
                      style={{ height: '42px', padding: '0 24px', fontSize: '0.9rem' }}
                      onClick={() => {
                        handleProductDecision(selectedDetailProduct.id || selectedDetailProduct._id, 'approve', '', customSkus[selectedDetailProduct.id || selectedDetailProduct._id]);
                      }}
                      disabled={actionLoading[selectedDetailProduct.id || selectedDetailProduct._id]}
                    >
                      Re-Approve Listing
                    </button>
                  )}
                  <button className="ad-btn-sec" style={{ height: '42px', padding: '0 20px', fontSize: '0.9rem' }} onClick={() => setSelectedDetailProduct(null)}>
                    Close Details
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="ad-sidebar">
        <Link href="/" className="ad-sidebar-brand">
          <div className="ad-sidebar-logo">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#6366f1" />
              <path d="M8 12h16M8 16h12M8 20h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="ad-sidebar-title">EMAHU</span>
          <span className="ad-sidebar-title-tag">Admin</span>
        </Link>

        <ul className="ad-sidebar-menu">
          <li>
            <button className={`ad-sidebar-btn ${activeTab === 'new-sellers' ? 'active' : ''}`} onClick={() => setActiveTab('new-sellers')}>
              🆕 New Seller Approvals {sellers.filter(s => s.status === 'pending' || s.status === 'more_info_requested').length > 0 && (
                <span style={{ background: '#f59e0b', color: '#000', borderRadius: '50%', padding: '2px 8px', fontSize: '0.7rem', marginLeft: '6px', fontWeight: 'bold' }}>
                  {sellers.filter(s => s.status === 'pending' || s.status === 'more_info_requested').length}
                </span>
              )}
            </button>
          </li>
          <li>
            <button className={`ad-sidebar-btn ${activeTab === 'sellers' ? 'active' : ''}`} onClick={() => setActiveTab('sellers')}>
              👥 Registered Merchants
            </button>
          </li>
          <li>
            <button className={`ad-sidebar-btn ${activeTab === 'new-products' ? 'active' : ''}`} onClick={() => setActiveTab('new-products')}>
              🆕 Product Onboarding {products.filter(p => p.approvalStatus === 'pending' || p.approvalStatus === 'changes_requested').length > 0 && (
                <span style={{ background: '#f59e0b', color: '#000', borderRadius: '50%', padding: '2px 8px', fontSize: '0.7rem', marginLeft: '6px', fontWeight: 'bold' }}>
                  {products.filter(p => p.approvalStatus === 'pending' || p.approvalStatus === 'changes_requested').length}
                </span>
              )}
            </button>
          </li>
          <li>
            <button className={`ad-sidebar-btn ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
              📦 Catalog Directory
            </button>
          </li>
          <li>
            <button className={`ad-sidebar-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
              📈 System Stats
            </button>
          </li>
          <li>
            <button className={`ad-sidebar-btn ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
              🛡️ Audit Logs
            </button>
          </li>
          <li>
            <button className={`ad-sidebar-btn ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
              🔔 Notifications {notifications.some(n => !n.isRead) && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', padding: '2px 6px', fontSize: '0.65rem', marginLeft: '4px' }}>!</span>}
            </button>
          </li>
          <li>
            <button className={`ad-sidebar-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              ⚙️ Settings
            </button>
          </li>
        </ul>

        <div className="ad-sidebar-profile">
          <div className="ad-sidebar-user-info">
            <span className="ad-sidebar-username">{adminUser ? adminUser.name : 'Administrator'}</span>
            <span className="ad-sidebar-usertag">{adminUser ? adminUser.email : 'admin@emahu.com'}</span>
          </div>
          <button className="ad-logout-btn" onClick={handleSignOut} title="Log Out">✕</button>
        </div>
      </aside>

      {/* Main View Area */}
      <div className="ad-main-wrapper">
        <header className="ad-header">
          <h2>EMAHU Central Administration</h2>
          <div className="ad-header-badge">Secure Control Center</div>
        </header>

        <main className="ad-view-container">
          
          {/* TAB: NEW SELLERS VERIFICATION */}
          {activeTab === 'new-sellers' && (
            <div>
              <div className="ad-view-header">
                <h3>New Seller Onboarding Requests</h3>
                <p>Verify bank details, business profiles, and KYC documents to activate new merchant listings.</p>
              </div>

              {loadingSellers ? (
                <div className="ad-loading">Fetching registration queue...</div>
              ) : (
                <div className="ad-table-wrapper">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>Store Details</th>
                        <th>Merchant Owner</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellers.filter(s => s.status === 'pending' || s.status === 'more_info_requested').map((seller) => {
                        return (
                          <tr key={seller._id}>
                            <td>
                              <div className="ad-bold">{seller.storeName || 'Not Provided'}</div>
                              <div className="ad-muted">{seller.category || 'N/A'}</div>
                            </td>
                            <td>
                              <div className="ad-bold">{seller.name}</div>
                            </td>
                            <td>
                              <span className={`ad-status-badge ${seller.status}`}>
                                {seller.status?.replace(/_/g, ' ')?.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <button
                                className="ad-btn-sec"
                                style={{ fontSize: '0.8rem', height: '34px', padding: '0 16px', fontWeight: '600' }}
                                onClick={() => {
                                  setSelectedDetailSeller(seller);
                                  setDetailTab('profile');
                                }}
                              >
                                Review Application &amp; Audit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {sellers.filter(s => s.status === 'pending' || s.status === 'more_info_requested').length === 0 && (
                        <tr>
                          <td colSpan="4" className="ad-empty">No pending registration requests in the onboarding queue.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: SELLERS REVIEW */}
          {activeTab === 'sellers' && (
            <div>
              <div className="ad-view-header">
                <h3>Registered Merchant Base</h3>
                <p>Complete record base of all verified and blocked sellers active on the storefront catalog.</p>
              </div>

              {loadingSellers ? (
                <div className="ad-loading">Fetching sellers from directory...</div>
              ) : (
                <div className="ad-table-wrapper">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>Store Details</th>
                        <th>Merchant Owner</th>
                        <th>Store Performance</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellers.filter(s => s.status === 'approved' || s.status === 'rejected').map((seller) => {
                        return (
                          <tr key={seller._id}>
                            <td>
                              <div className="ad-bold">{seller.storeName || 'Not Provided'}</div>
                              <div className="ad-muted">{seller.category || 'N/A'}</div>
                            </td>
                            <td>
                              <div className="ad-bold">{seller.name}</div>
                            </td>
                            <td>
                              <div style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                                <div><strong>Revenue:</strong> ₹{(seller.totalRevenue || 0).toLocaleString('en-IN')}</div>
                                <div className="ad-muted">Listed: {seller.totalProducts || 0} items</div>
                              </div>
                            </td>
                            <td>
                              <span className={`ad-status-badge ${seller.status}`}>
                                {seller.status?.replace(/_/g, ' ')?.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <button
                                className="ad-btn-sec"
                                style={{ fontSize: '0.8rem', height: '34px', padding: '0 16px', fontWeight: '600' }}
                                onClick={() => {
                                  setSelectedDetailSeller(seller);
                                  setDetailTab('profile');
                                }}
                              >
                                View Profile Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {sellers.filter(s => s.status === 'approved' || s.status === 'rejected').length === 0 && (
                        <tr>
                          <td colSpan="5" className="ad-empty">No registered merchants in directory.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: PRODUCT ONBOARDING QUEUE */}
          {activeTab === 'new-products' && (
            <div>
              <div className="ad-view-header">
                <h3>Product Onboarding Requests</h3>
                <p>Audit newly submitted merchant inventory listings, verify details, and assign official system SKUs to authorize catalog publishing.</p>
              </div>

              {loadingProducts ? (
                <div className="ad-loading">Fetching product onboarding queue...</div>
              ) : (
                <div className="ad-table-wrapper">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>Product Details</th>
                        <th>Merchant Vendor</th>
                        <th>Pricing &amp; Stock</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.filter(p => p.approvalStatus === 'pending' || p.approvalStatus === 'changes_requested').map((product) => {
                        return (
                          <tr key={product.id || product._id}>
                            <td>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <div className="ad-prod-image">
                                  {(!product.image || !product.image.startsWith('http')) ? (
                                    product.image || '📦'
                                  ) : (
                                    <img src={product.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  )}
                                </div>
                                <div>
                                  <div className="ad-bold">{product.name}</div>
                                  <div className="ad-muted">Brand: {product.brand || 'N/A'} | Category: {product.category}</div>
                                  <div className="ad-muted" style={{ fontSize: '0.75rem', marginTop: '2px', color: '#cbd5e1' }}>
                                    📅 Added: {product.createdAt ? new Date(product.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="ad-bold">{product.seller?.storeName || 'Not Provided'}</div>
                              <div className="ad-muted">by {product.seller?.name || 'Unknown Seller'}</div>
                            </td>
                            <td>
                              <div>₹{product.price?.toLocaleString('en-IN')}</div>
                              <div className="ad-muted">Stock: {product.stock} units</div>
                            </td>
                            <td>
                              <span className={`ad-status-badge ${product.approvalStatus}`}>
                                {product.approvalStatus === 'pending' ? 'Pending' : 'Changes Requested'}
                              </span>
                              {product.approvalAttempts > 0 && (
                                <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 'bold', marginTop: '4px', whiteSpace: 'nowrap' }}>
                                  Rejections: {product.approvalAttempts}/3
                                </div>
                              )}
                            </td>
                            <td>
                              <button
                                className="ad-btn-sec"
                                style={{ fontSize: '0.8rem', height: '34px', padding: '0 16px', fontWeight: '600' }}
                                onClick={() => {
                                  setSelectedDetailProduct(product);
                                  setProductDetailTab('info');
                                }}
                              >
                                Review Listing &amp; Audit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {products.filter(p => p.approvalStatus === 'pending' || p.approvalStatus === 'changes_requested').length === 0 && (
                        <tr>
                          <td colSpan="5" className="ad-empty">No pending product listing requests in the onboarding queue.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: CATALOG DIRECTORY */}
          {activeTab === 'products' && (
            <div>
              <div className="ad-view-header">
                <h3>Catalog Directory</h3>
                <p>Read-only inventory records of all approved active listings and rejected catalog submissions.</p>
              </div>

              {loadingProducts ? (
                <div className="ad-loading">Fetching catalog listings...</div>
              ) : (
                <div className="ad-table-wrapper">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>Product Details</th>
                        <th>Merchant Vendor</th>
                        <th>Pricing &amp; Stock</th>
                        <th>SKU Code</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.filter(p => p.approvalStatus === 'approved' || p.approvalStatus === 'rejected').map((product) => {
                        const isApproved = product.approvalStatus === 'approved';
                        return (
                          <tr key={product.id || product._id}>
                            <td>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <div className="ad-prod-image">
                                  {(!product.image || !product.image.startsWith('http')) ? (
                                    product.image || '📦'
                                  ) : (
                                    <img src={product.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  )}
                                </div>
                                <div>
                                  <div className="ad-bold">{product.name}</div>
                                  <div className="ad-muted">Brand: {product.brand || 'N/A'} | Category: {product.category}</div>
                                  <div className="ad-muted" style={{ fontSize: '0.75rem', marginTop: '2px', color: '#cbd5e1' }}>
                                    📅 Added: {product.createdAt ? new Date(product.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="ad-bold">{product.seller?.storeName || 'Not Provided'}</div>
                              <div className="ad-muted">by {product.seller?.name || 'Unknown Seller'}</div>
                            </td>
                            <td>
                              <div>₹{product.price?.toLocaleString('en-IN')}</div>
                              <div className="ad-muted">Stock: {product.stock} units</div>
                            </td>
                            <td>
                              <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{product.sku || 'N/A'}</span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span className={`ad-status-badge ${product.approvalStatus}`}>
                                  {isApproved ? 'Live' : 'Rejected'}
                                </span>
                                {product.adminCode && (
                                  <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                    Code: {product.adminCode}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <button
                                className="ad-btn-sec"
                                style={{ fontSize: '0.8rem', height: '34px', padding: '0 16px', fontWeight: '600' }}
                                onClick={() => {
                                  setSelectedDetailProduct(product);
                                  setProductDetailTab('info');
                                }}
                              >
                                View Listing Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {products.filter(p => p.approvalStatus === 'approved' || p.approvalStatus === 'rejected').length === 0 && (
                        <tr>
                          <td colSpan="6" className="ad-empty">No catalog records found in directory.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SYSTEM STATS */}
          {activeTab === 'stats' && (
            <div>
              <div className="ad-view-header">
                <h3>Directory Overview</h3>
                <p>Operational statistics of the EMAHU platform registrations.</p>
              </div>

              <div className="ad-stats-grid">
                <div className="ad-stat-card">
                  <span className="title">Total Registered Sellers</span>
                  <span className="value">{sellers.length}</span>
                  <span className="desc">{sellers.filter(s => s.status === 'approved').length} Active | {sellers.filter(s => s.status === 'pending').length} Pending</span>
                </div>
                <div className="ad-stat-card">
                  <span className="title">Total Product Listings</span>
                  <span className="value">{products.length}</span>
                  <span className="desc">{products.filter(p => p.approvalStatus === 'approved').length} Live on Buyer Hub</span>
                </div>
                <div className="ad-stat-card">
                  <span className="title">Pending Review Actions</span>
                  <span className="value">
                    {sellers.filter(s => s.status === 'pending').length + products.filter(p => p.approvalStatus === 'pending' && !p.adminCode).length}
                  </span>
                  <span className="desc">Requires administrator decision</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div>
              <div className="ad-view-header">
                <h3>Administrator Audit Logs</h3>
                <p>Chronological listing of administrative actions, decisions, and system checks.</p>
              </div>

              {loadingAuditLogs ? (
                <div className="ad-loading">Loading audit records...</div>
              ) : (
                <div className="ad-table-wrapper">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>Administrator</th>
                        <th>Action Code</th>
                        <th>Target Reference</th>
                        <th>Parameters / Details</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log._id}>
                          <td>
                            <div className="ad-bold">{log.admin?.name || 'System Auto'}</div>
                            <div className="ad-muted" style={{ fontSize: '0.75rem' }}>{log.admin?.email || 'N/A'}</div>
                          </td>
                          <td>
                            <span className="ad-badge-grey" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.action}</span>
                          </td>
                          <td>
                            <div>{log.targetType}</div>
                            <div className="ad-muted" style={{ fontSize: '0.72rem', fontFamily: 'monospace' }}>ID: {log.targetId}</div>
                          </td>
                          <td>
                            <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'monospace', color: '#cbd5e1', whiteSpace: 'pre-wrap', maxWidth: '300px' }}>
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </td>
                          <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            {new Date(log.timestamp).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                      {auditLogs.length === 0 && (
                        <tr>
                          <td colSpan="5" className="ad-empty">No audit records found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div>
              <div className="ad-view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3>System Alerts &amp; Notifications</h3>
                  <p>Inboxes containing registrations alerts, product updates, and verification events.</p>
                </div>
                {notifications.some(n => !n.isRead) && (
                  <button className="ad-btn-sec" onClick={markAllNotificationsRead}>
                    Mark All as Read
                  </button>
                )}
              </div>

              {loadingNotifications ? (
                <div className="ad-loading">Loading alerts...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                  {notifications.map((notif) => (
                    <div key={notif._id} style={{
                      padding: '16px 20px',
                      background: notif.isRead ? 'rgba(255,255,255,0.02)' : 'rgba(99, 102, 241, 0.05)',
                      border: `1.5px solid ${notif.isRead ? '#27272a' : '#6366f1'}`,
                      borderRadius: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: notif.isRead ? 'transparent' : '#6366f1'
                          }} />
                          <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{notif.title}</strong>
                        </div>
                        <p style={{ margin: '6px 0 0 16px', color: '#cbd5e1', fontSize: '0.85rem' }}>{notif.message}</p>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#a1a1aa' }}>
                        {new Date(notif.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div className="ad-empty" style={{ textAlign: 'center', padding: '40px', color: '#71717a' }}>No alerts or notifications.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SETTINGS (2FA CONTROLS) */}
          {activeTab === 'settings' && (
            <div>
              <div className="ad-view-header">
                <h3>Security Settings</h3>
                <p>Configure administrator credentials, session policies, and two-factor authentication.</p>
              </div>

              <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '16px', padding: '32px', maxWidth: '600px', marginTop: '20px' }}>
                <h4 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🔐</span> Multi-Factor Authentication (2FA)
                </h4>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '24px' }}>
                  Secure your admin account by enabling standard Time-Based One-Time Passwords (TOTP). Once enabled, login attempts will require a valid code from your Google Authenticator or comparable app.
                </p>

                {is2FAEnabled ? (
                  <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
                    <div style={{ color: '#10b981', fontWeight: '700', fontSize: '0.95rem', marginBottom: '8px' }}>
                      ✓ Two-Factor Authentication is active
                    </div>
                    <p style={{ color: '#cbd5e1', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
                      Your account is protected with cryptographic verification checks. Enter a code below to disable 2FA.
                    </p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        placeholder="Enter 6-digit OTP code"
                        maxLength={6}
                        className="ad-modal-input"
                        style={{ maxWidth: '200px', height: '38px', margin: 0 }}
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value)}
                      />
                      <button className="ad-btn-danger" style={{ height: '38px' }} onClick={handle2FADisable} disabled={!totpCode}>
                        Disable 2FA
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {!isSettingUp2FA ? (
                      <button className="ad-btn-action approve" style={{ height: '40px', padding: '0 24px', fontSize: '0.9rem' }} onClick={handle2FASetup}>
                        Setup Two-Factor Authentication
                      </button>
                    ) : (
                      <div style={{ background: '#0a0b10', border: '1px solid #27272a', padding: '24px', borderRadius: '12px' }}>
                        <div style={{ color: '#fff', fontWeight: '700', fontSize: '1rem', marginBottom: '12px' }}>Setup Authenticator App</div>
                        <p style={{ color: '#a1a1aa', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '16px' }}>
                          1. Open your authenticator app (e.g. Google Authenticator).<br />
                          2. Scan the barcode, or manually add the secret key below:<br />
                          <strong style={{ color: '#6366f1', fontFamily: 'monospace', letterSpacing: '1px', fontSize: '1.1rem', display: 'block', marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', textAlign: 'center' }}>
                            {setupSecret}
                          </strong>
                        </p>
                        <div style={{ marginBottom: '20px' }}>
                          <label style={{ color: '#fff', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>3. Enter the 6-digit verification code to confirm:</label>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                              type="text"
                              placeholder="e.g. 123456"
                              maxLength={6}
                              className="ad-modal-input"
                              style={{ maxWidth: '180px', height: '38px', margin: 0 }}
                              value={totpCode}
                              onChange={(e) => setTotpCode(e.target.value)}
                            />
                            <button className="ad-btn-action approve" style={{ height: '38px' }} onClick={handle2FAVerify} disabled={!totpCode}>
                              Verify &amp; Enable
                            </button>
                          </div>
                        </div>
                        <button className="ad-btn-sec" style={{ width: '100%' }} onClick={() => setIsSettingUp2FA(false)}>
                          Cancel Setup
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
