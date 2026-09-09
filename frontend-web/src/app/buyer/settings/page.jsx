'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BuyerHeader from '@/components/buyer_home/buyer_header';
import { changeUserRole, clearAuthSession, saveAuthSession, logoutUser } from '@/utils/auth';
import API_BASE from '@/utils/config';
import { detectLocationWithGPS } from '@/utils/location';
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
    state: '',
    latitude: '',
    longitude: ''
  });
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
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
          state: parsed.state || '',
          latitude: parsed.latitude !== undefined && parsed.latitude !== null ? parsed.latitude : '',
          longitude: parsed.longitude !== undefined && parsed.longitude !== null ? parsed.longitude : ''
        });

        // Load and display the user's saved address and profile details
      } catch (e) {
        console.error('Error parsing buyer user', e);
      }
    }

    if (storedToken) {
      setToken(storedToken);
      // Fetch latest profile details from server
      fetch(`${API_BASE}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${storedToken}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            setUser(data.user);
            localStorage.setItem('emahu_buyer_user', JSON.stringify(data.user));
            setProfileForm({
              name: data.user.name || '',
              email: data.user.email || '',
              phone: data.user.phone || '',
              address: data.user.address || '',
              city: data.user.city || '',
              state: data.user.state || '',
              latitude: data.user.latitude !== undefined && data.user.latitude !== null ? data.user.latitude : '',
              longitude: data.user.longitude !== undefined && data.user.longitude !== null ? data.user.longitude : ''
            });
          }
        })
        .catch((err) => console.warn('Could not refresh user profile from server:', err));
    }
  }, [router]);

  const detectBuyerLocation = async (manualClick = true, activeToken = null) => {
    setDetectingLocation(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const result = await detectLocationWithGPS();
      const newLat = result.coords.latitude;
      const newLon = result.coords.longitude;
      const newAddress = result.streetAddress || result.fullAddress || '';
      const newCity = result.city || '';
      const newState = result.state || '';

      setProfileForm((prev) => ({
        ...prev,
        latitude: newLat,
        longitude: newLon,
        address: newAddress || prev.address,
        city: newCity || prev.city,
        state: newState || prev.state
      }));

      // Store in localStorage for buyer coordinate persistence
      localStorage.setItem('emahu_buyer_coordinates', JSON.stringify({
        latitude: parseFloat(newLat),
        longitude: parseFloat(newLon)
      }));
      if (newCity) localStorage.setItem('emahu_buyer_city', newCity);
      if (newAddress) localStorage.setItem('emahu_buyer_address', newAddress);

      const authToken = activeToken || token;
      if (authToken) {
        try {
          const syncRes = await fetch(`${API_BASE}/api/auth/update-details`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              address: newAddress || profileForm.address,
              city: newCity || profileForm.city,
              state: newState || profileForm.state,
              latitude: parseFloat(newLat),
              longitude: parseFloat(newLon)
            })
          });
          const syncData = await syncRes.json();
          if (syncData.success && syncData.user) {
            localStorage.setItem('emahu_buyer_user', JSON.stringify(syncData.user));
            setUser(syncData.user);
          }
        } catch (err) {
          console.warn('Auto-sync buyer location to server error:', err);
        }
      }

      window.dispatchEvent(new Event('storage'));

      if (manualClick) {
        setSuccessMsg(`Location detected successfully! Pinned to: ${newCity || newLat}, ${newState || newLon}`);
      }
    } catch (err) {
      console.error('Buyer GPS detection failed:', err);
      if (manualClick) {
        setErrorMsg('Failed to auto-detect location. Please allow browser location access or fill coordinates manually.');
      }
    } finally {
      setDetectingLocation(false);
    }
  };

  // Fetch orders and calculate stats
  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        const userId = user.id || user._id;
        const res = await fetch(`${API_BASE}/api/orders?userId=${userId}`);
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
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/api/auth/send-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: profileForm.phone, role: 'buyer' })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP code.');
      }
    } catch (err) {
      console.error(err);
      setOtpError('Failed to send verification code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyAndSave = async (e) => {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);
    try {
      const apiBase = API_BASE;
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
      const payload = {
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        address: profileForm.address,
        city: profileForm.city,
        state: profileForm.state,
        latitude: profileForm.latitude !== '' && profileForm.latitude !== undefined && profileForm.latitude !== null ? parseFloat(profileForm.latitude) : undefined,
        longitude: profileForm.longitude !== '' && profileForm.longitude !== undefined && profileForm.longitude !== null ? parseFloat(profileForm.longitude) : undefined
      };

      const res = await fetch(`${API_BASE}/api/auth/update-details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success && data.user) {
        // Sync user details to localStorage
        const updatedUser = { ...user, ...data.user };
        localStorage.setItem('emahu_buyer_user', JSON.stringify(updatedUser));
        if (data.user.latitude && data.user.longitude) {
          localStorage.setItem('emahu_buyer_coordinates', JSON.stringify({
            latitude: data.user.latitude,
            longitude: data.user.longitude
          }));
        }
        if (data.user.city) {
          localStorage.setItem('emahu_buyer_city', data.user.city);
        }
        setUser(updatedUser);
        setProfileForm({
          name: data.user.name || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          address: data.user.address || '',
          city: data.user.city || '',
          state: data.user.state || '',
          latitude: data.user.latitude !== undefined && data.user.latitude !== null ? data.user.latitude : '',
          longitude: data.user.longitude !== undefined && data.user.longitude !== null ? data.user.longitude : ''
        });

        // Dispatch local event to sync header name and location
        window.dispatchEvent(new Event('storage'));
        setSuccessMsg('Your profile and location coordinates have been saved successfully!');
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
            <div className="settings-section-header">
              <div>
                <h2 className="section-title" style={{ margin: 0 }}>Update Contact & Shipping Profile</h2>
                <p className="section-subtitle" style={{ margin: '4px 0 0 0' }}>These details will be used to dynamically calculate distance between seller and buyer for orders.</p>
              </div>
              <button
                type="button"
                onClick={() => detectBuyerLocation(true)}
                className="gps-detect-btn"
                disabled={detectingLocation}
              >
                <span>📍</span>
                <span>{detectingLocation ? 'Detecting Location...' : 'Use Current Location'}</span>
              </button>
            </div>

            {successMsg && <div className="settings-alert-success" style={{ marginTop: '16px' }}>✓ {successMsg}</div>}
            {errorMsg && <div className="settings-alert-error" style={{ marginTop: '16px' }}>⚠️ {errorMsg}</div>}

            <form onSubmit={handleProfileSubmit} className="profile-form" style={{ marginTop: '20px' }}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Account Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileForm.name ?? ''}
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
                    value={profileForm.phone ?? ''}
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
                  value={profileForm.email ?? ''}
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
                  value={profileForm.address ?? ''}
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
                    value={profileForm.city ?? ''}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    required
                    placeholder="e.g. Ahmedabad"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State / Region</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileForm.state ?? ''}
                    onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                    required
                    placeholder="e.g. Gujarat"
                  />
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileForm.latitude ?? ''}
                    onChange={(e) => setProfileForm({ ...profileForm, latitude: e.target.value })}
                    placeholder="e.g. 23.063013"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileForm.longitude ?? ''}
                    onChange={(e) => setProfileForm({ ...profileForm, longitude: e.target.value })}
                    placeholder="e.g. 72.532466"
                  />
                </div>
              </div>

              {(profileForm.address || profileForm.city || profileForm.latitude) && (
                <div className="location-badge">
                  <span>✓</span>
                  <span>
                    {[profileForm.address, profileForm.city, profileForm.state].filter(Boolean).join(', ') ||
                     `${profileForm.latitude}, ${profileForm.longitude}`}
                  </span>
                </div>
              )}

              <button type="submit" className="settings-submit-btn" disabled={loading}>
                {loading ? 'Saving Profile Details...' : 'Save Profile Details'}
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
