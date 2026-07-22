'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BuyerHeader from '@/components/buyer_home/buyer_header';
import { changeUserRole, clearAuthSession, saveAuthSession, logoutUser } from '@/utils/auth';
import './buyer_settings.css';

export default function BuyerSettingsPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Failed to log out from server:', err);
    }
    clearAuthSession('buyer');
    window.dispatchEvent(new Event('storage'));
    router.push('/');
  };

  // Profile States
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: ''
  });
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [mockOtpCode, setMockOtpCode] = useState('');
  const [isMockOtpActive, setIsMockOtpActive] = useState(false);

  // Analytics States
  const [stats, setStats] = useState({
    totalTransactions: 0,
    activeLocks: 0,
    itemsBought: 0,
    totalSpent: 0
  });
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [upgradeRole, setUpgradeRole] = useState(null); // null, 'seller', 'delivery'
  const [storeForm, setStoreForm] = useState({
    storeName: '',
    category: '',
    kycType: 'pan',
    kycNumber: '',
    bankHolder: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    gstNumber: ''
  });
  const [vehicleForm, setVehicleForm] = useState({
    vehicleType: 'bike',
    vehicleNumber: '',
    currentCity: '',
    currentArea: '',
    pincode: '',
    serviceRadius: '15',
    perKmRate: '5',
    deliveryScope: 'local'
  });
  const [upgradeError, setUpgradeError] = useState('');
  const [upgradeSuccess, setUpgradeSuccess] = useState('');
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const CATEGORIES = [
    'Electronics & Tech',
    'Apparel & Fashion',
    'Shoes & Footwear',
    'Kitchen & Dining',
    'Lifestyle & Home',
    'Beauty & Cosmetics',
    'Sports & Outdoors',
    'Books & Stationery',
    'Grocery & Essentials',
    'Toys & Games',
    'Health & Wellness',
    'Pet Supplies',
    'Baby Care',
    'Automotive & Tools'
  ];

  const handleUpgradeSubmit = async (e) => {
    e.preventDefault();
    setUpgradeError('');
    setUpgradeSuccess('');
    setUpgradeLoading(true);

    try {
      if (upgradeRole === 'seller') {
        if (!storeForm.storeName || !storeForm.category || !storeForm.kycNumber) {
          throw new Error('Please fill in all mandatory store and identity details');
        }
        const data = await changeUserRole('seller', token, storeForm);
        if (data.success) {
          setUpgradeSuccess('Account upgrade request submitted successfully! Redirecting to seller dashboard...');
          clearAuthSession('buyer');
          saveAuthSession(data, 'seller');
          setTimeout(() => {
            window.location.href = '/seller/dashboard';
          }, 2000);
        }
      } else if (upgradeRole === 'delivery') {
        if (!vehicleForm.vehicleNumber || !vehicleForm.currentCity || !vehicleForm.currentArea) {
          throw new Error('Please fill in vehicle details and operating location');
        }
        const data = await changeUserRole('delivery', token, vehicleForm);
        if (data.success) {
          setUpgradeSuccess('Account upgrade request submitted successfully! Redirecting to delivery portal...');
          clearAuthSession('buyer');
          saveAuthSession(data, 'delivery');
          setTimeout(() => {
            window.location.href = '/delivery';
          }, 2000);
        }
      }
    } catch (err) {
      console.error(err);
      setUpgradeError(err.message || 'Upgrade request failed');
    } finally {
      setUpgradeLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loggedIn = localStorage.getItem('emahu_buyer_logged_in') === 'true';
    if (!loggedIn) {
      router.replace('/buyer/login');
      return;
    }

    const storedUser = localStorage.getItem('emahu_buyer_user');
    const storedToken = localStorage.getItem('emahu_buyer_token');

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setProfileForm({
          name: parsed.name || '',
          email: parsed.email || '',
          phone: parsed.phone || '',
          address: parsed.address || '',
          city: parsed.city || '',
          state: parsed.state || ''
        });
      } catch (e) {
        console.error('Error parsing buyer user', e);
      }
    }
    if (storedToken) {
      setToken(storedToken);
    }
  }, [router]);

  // Fetch orders and calculate stats
  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        const userId = user.id || user._id;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/orders?userId=${userId}`);
        const data = await res.json();

        if (data.success && data.orders) {
          const fetchedOrders = data.orders;

          // Transactions count
          const totalTransactions = fetchedOrders.length;

          // Active Locks vs Completed
          const activeLocks = fetchedOrders.filter(o =>
            !o.status.includes('RELEASED') &&
            !o.status.includes('REJECTED') &&
            !o.status.includes('DISPUTED')
          ).length;

          // Total Items Purchased
          let itemsBought = 0;
          fetchedOrders.forEach(order => {
            order.items.forEach(item => {
              itemsBought += item.quantity || 1;
            });
          });

          // Total Spend
          const totalSpent = fetchedOrders.reduce((sum, order) => sum + (order.total || 0), 0);

          setStats({
            totalTransactions,
            activeLocks,
            itemsBought,
            totalSpent
          });
        }
      } catch (err) {
        console.error('Failed to fetch analytics stats:', err);
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const sendOtpToNewPhone = async () => {
    setOtpLoading(true);
    setOtpError('');
    setMockOtpCode('');
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiBase}/api/auth/send-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: profileForm.phone, role: 'buyer' })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP code.');
      }
      if (data.devOtp) {
        setMockOtpCode(data.devOtp);
        setIsMockOtpActive(true);
      } else {
        setIsMockOtpActive(false);
      }
    } catch (err) {
      console.error(err);
      // Fallback code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setMockOtpCode(code);
      setIsMockOtpActive(true);
      setOtpError('Failed to send verification code. Falling back to simulated verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyAndSave = async (e) => {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiBase}/api/auth/verify-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: profileForm.phone, otp: otpInput })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid OTP code.');
      }

      // OTP is verified! Now save profile
      await saveProfileData();
      setIsOtpModalOpen(false);
      setOtpInput('');
    } catch (err) {
      console.error(err);
      setOtpError(err.message || 'OTP verification failed.');
    } finally {
      setOtpLoading(false);
    }
  };

  const saveProfileData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/update-details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      });
      const data = await res.json();

      if (data.success && data.user) {
        // Sync user details to localStorage
        const updatedUser = { ...user, ...data.user };
        localStorage.setItem('emahu_buyer_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setProfileForm({
          name: data.user.name || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          address: data.user.address || '',
          city: data.user.city || '',
          state: data.user.state || ''
        });

        // Dispatch local event to sync header name
        window.dispatchEvent(new Event('storage'));
        setSuccessMsg('Your profile has been updated successfully!');
      } else {
        setErrorMsg(data.error || 'Failed to update profile.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error while updating details.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    // If phone has changed, verify first!
    if (user && profileForm.phone !== user.phone) {
      setIsOtpModalOpen(true);
      sendOtpToNewPhone();
      return;
    }

    // Otherwise save directly
    await saveProfileData();
  };

  return (
    <div className="buyer-settings-page">
      <BuyerHeader />

      <main className="settings-container">
        <div className="settings-header-row">
          <div>
            <h1 className="settings-title">Buyer Account Dashboard</h1>
            <p className="settings-subtitle">Manage your shipping address, contact profile details, and review order transaction statistics.</p>
          </div>
          <button onClick={handleSignOut} className="settings-logout-btn">
            🚪 Logout
          </button>
        </div>

        {/* Analytics Section */}
        <section className="analytics-section">
          <h2 className="section-title">Purchase Activity & Analytics</h2>
          {ordersLoading ? (
            <div className="analytics-loading">Loading transaction summaries...</div>
          ) : (
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Total Transactions</span>
                <h3 className="stat-val">{stats.totalTransactions}</h3>
                <p className="stat-desc">Order groups placed in system</p>
              </div>
              <div className="stat-card">
                <span className="stat-label">Active Emahu Locks</span>
                <h3 className="stat-val" style={{ color: '#4169e1' }}>{stats.activeLocks}</h3>
                <p className="stat-desc">Capital secured inside vault</p>
              </div>
              <div className="stat-card">
                <span className="stat-label">Products Bought</span>
                <h3 className="stat-val" style={{ color: '#10b981' }}>{stats.itemsBought}</h3>
                <p className="stat-desc">Individual item packages</p>
              </div>
              <div className="stat-card">
                <span className="stat-label">Total Capital Spent</span>
                <h3 className="stat-val" style={{ color: '#0f172a' }}>₹{stats.totalSpent.toLocaleString('en-IN')}</h3>
                <p className="stat-desc">Accumulated wallet expenditure</p>
              </div>
            </div>
          )}
        </section>

        {/* Settings Form Section */}
        <section className="profile-edit-section">
          <div className="glass-card settings-card">
            <h2 className="section-title">Update Contact & Shipping Profile</h2>
            <p className="section-subtitle" style={{ marginBottom: '24px' }}>These details will be prefilled automatically during checkouts to streamline shipping and transit calculations.</p>

            {successMsg && <div className="settings-alert-success">✓ {successMsg}</div>}
            {errorMsg && <div className="settings-alert-error">⚠️ {errorMsg}</div>}

            <form onSubmit={handleProfileSubmit} className="profile-form">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Account Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    required
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Mobile Phone</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    required
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  required
                  placeholder="e.g. name@example.com"
                />
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Default Shipping Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  required
                  placeholder="Enter flat number, building name, sector, and street..."
                />
              </div>

              <div className="form-grid" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label">City / Town</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    required
                    placeholder="e.g. Noida"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State / Region</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileForm.state}
                    onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                    required
                    placeholder="e.g. Uttar Pradesh"
                  />
                </div>
              </div>

              <button type="submit" className="settings-submit-btn" disabled={loading}>
                {loading ? 'Saving Profile Settings...' : 'Update Account Profile'}
              </button>
            </form>
          </div>
        </section>

      </main>

      <footer className="settings-footer">
        <p>© 2026 Emahu Consumer Emahu Portal. Secured with military-grade vault encryption.</p>
      </footer>
      {isOtpModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '28px',
            width: '100%',
            maxWidth: '420px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
            color: '#1e293b'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
              📱 Verify New Mobile Number
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px', lineHeight: '1.4' }}>
              We have sent a 6-digit verification code to <strong style={{ color: '#0f172a' }}>+91 {profileForm.phone}</strong>. Please enter it below to confirm.
            </p>

            {otpError && (
              <div style={{ padding: '10px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', fontSize: '0.78rem', marginBottom: '16px', fontWeight: '600' }}>
                {otpError}
              </div>
            )}

            {isMockOtpActive && mockOtpCode && (
              <div style={{ padding: '10px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', fontSize: '0.78rem', marginBottom: '16px', fontWeight: '700' }}>
                🔑 Developer verification code: <span style={{ fontSize: '0.9rem', letterSpacing: '2px' }}>{mockOtpCode}</span>
              </div>
            )}

            <form onSubmit={handleVerifyAndSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                type="text"
                maxLength="6"
                placeholder="0 0 0 0 0 0"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                style={{
                  height: '46px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  textAlign: 'center',
                  fontSize: '1.4rem',
                  fontWeight: '700',
                  letterSpacing: '8px',
                  color: '#0f172a',
                  outline: 'none',
                  background: '#f8fafc',
                  transition: 'border-color 0.15s ease'
                }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setIsOtpModalOpen(false); setOtpInput(''); }}
                  style={{
                    flex: 1,
                    height: '42px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#64748b',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={otpLoading || otpInput.length !== 6}
                  style={{
                    flex: 2,
                    height: '42px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#4f46e5',
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    opacity: (otpLoading || otpInput.length !== 6) ? 0.6 : 1
                  }}
                >
                  {otpLoading ? 'Verifying...' : 'Verify & Save'}
                </button>
              </div>
            </form>

            <button
              type="button"
              onClick={sendOtpToNewPhone}
              style={{
                background: 'none',
                border: 'none',
                color: '#4f46e5',
                fontSize: '0.8rem',
                fontWeight: '700',
                textDecoration: 'underline',
                marginTop: '16px',
                cursor: 'pointer'
              }}
            >
              Resend Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
