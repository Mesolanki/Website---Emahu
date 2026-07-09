'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BuyerHeader from '@/components/buyer_home/buyer_header';
import { changeUserRole, clearAuthSession, saveAuthSession } from '@/utils/auth';
import './buyer_settings.css';

export default function BuyerSettingsPage() {
  const router = useRouter();

  // Profile States
  const [profileForm, setProfileForm] = useState({
    name: '',
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

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
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

  return (
    <div className="buyer-settings-page">
      <BuyerHeader />

      <main className="settings-container">
        <div className="settings-header-row">
          <div>
            <h1 className="settings-title">Buyer Account Dashboard</h1>
            <p className="settings-subtitle">Manage your shipping address, contact profile details, and review order transaction statistics.</p>
          </div>
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
                <span className="stat-label">Active Escrow Locks</span>
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

        {/* Upgrade / Change Account Role Section */}
        <section className="upgrade-role-section" style={{ marginTop: '32px' }}>
          <div className="glass-card settings-card">
            <h2 className="section-title">Change Account Role</h2>
            <p className="section-subtitle" style={{ marginBottom: '24px' }}>
              Switch your account type to become a Seller or a Delivery Partner. Upgrades are subject to admin verification.
            </p>

            {upgradeSuccess && <div className="settings-alert-success">✓ {upgradeSuccess}</div>}
            {upgradeError && <div className="settings-alert-error">⚠️ {upgradeError}</div>}

            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <button
                type="button"
                className={`settings-submit-btn ${upgradeRole === 'seller' ? 'active-role' : ''}`}
                style={{
                  background: upgradeRole === 'seller' ? '#4f46e5' : '#e4e4e7',
                  color: upgradeRole === 'seller' ? '#fff' : '#18181b',
                  flex: 1
                }}
                onClick={() => { setUpgradeRole(upgradeRole === 'seller' ? null : 'seller'); setUpgradeError(''); setUpgradeSuccess(''); }}
              >
                Become Seller (Store Vendor)
              </button>
              <button
                type="button"
                className={`settings-submit-btn ${upgradeRole === 'delivery' ? 'active-role' : ''}`}
                style={{
                  background: upgradeRole === 'delivery' ? '#0d9488' : '#e4e4e7',
                  color: upgradeRole === 'delivery' ? '#fff' : '#18181b',
                  flex: 1
                }}
                onClick={() => { setUpgradeRole(upgradeRole === 'delivery' ? null : 'delivery'); setUpgradeError(''); setUpgradeSuccess(''); }}
              >
                Become Delivery Partner (Courier)
              </button>
            </div>

            {upgradeRole === 'seller' && (
              <form onSubmit={handleUpgradeSubmit} className="profile-form" style={{ borderTop: '1px solid #e4e4e7', paddingTop: '20px' }}>
                <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: '16px' }}>Store & Identity Profile Details</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Store / Company Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={storeForm.storeName}
                      onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })}
                      required
                      placeholder="e.g. Supreme Electro Traders"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Store Category *</label>
                    <select
                      className="form-input"
                      value={storeForm.category}
                      onChange={(e) => setStoreForm({ ...storeForm, category: e.target.value })}
                      required
                    >
                      <option value="">Select category...</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-grid" style={{ marginTop: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">KYC Document Type *</label>
                    <select
                      className="form-input"
                      value={storeForm.kycType}
                      onChange={(e) => setStoreForm({ ...storeForm, kycType: e.target.value })}
                      required
                    >
                      <option value="pan">PAN Card</option>
                      <option value="aadhaar">Aadhaar Card</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">KYC Document Number *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={storeForm.kycNumber}
                      onChange={(e) => setStoreForm({ ...storeForm, kycNumber: e.target.value })}
                      required
                      placeholder={storeForm.kycType === 'pan' ? 'ABCDE1234F' : '123456789012'}
                    />
                  </div>
                </div>

                <h3 className="section-title" style={{ fontSize: '1rem', marginTop: '24px', marginBottom: '16px' }}>Payout Bank Account</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Account Holder Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={storeForm.bankHolder}
                      onChange={(e) => setStoreForm({ ...storeForm, bankHolder: e.target.value })}
                      placeholder="Owner or registered business name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bank Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={storeForm.bankName}
                      onChange={(e) => setStoreForm({ ...storeForm, bankName: e.target.value })}
                      placeholder="e.g. HDFC Bank"
                    />
                  </div>
                </div>

                <div className="form-grid" style={{ marginTop: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Bank Account Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={storeForm.accountNumber}
                      onChange={(e) => setStoreForm({ ...storeForm, accountNumber: e.target.value })}
                      placeholder="e.g. 5010023456789"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">IFSC Code</label>
                    <input
                      type="text"
                      className="form-input"
                      value={storeForm.ifscCode}
                      onChange={(e) => setStoreForm({ ...storeForm, ifscCode: e.target.value })}
                      placeholder="e.g. HDFC0000123"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label className="form-label">GST Number (GSTIN)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={storeForm.gstNumber}
                    onChange={(e) => setStoreForm({ ...storeForm, gstNumber: e.target.value })}
                    placeholder="e.g. 22AAAAA0000A1Z5"
                  />
                </div>

                <button
                  type="submit"
                  className="settings-submit-btn"
                  style={{ marginTop: '24px', background: '#4f46e5', color: '#fff' }}
                  disabled={upgradeLoading}
                >
                  {upgradeLoading ? 'Submitting Upgrade Request...' : 'Submit Upgrade & Become Seller'}
                </button>
              </form>
            )}

            {upgradeRole === 'delivery' && (
              <form onSubmit={handleUpgradeSubmit} className="profile-form" style={{ borderTop: '1px solid #e4e4e7', paddingTop: '20px' }}>
                <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: '16px' }}>Vehicle & Location Details</h3>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Vehicle Type *</label>
                    <select
                      className="form-input"
                      value={vehicleForm.vehicleType}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })}
                      required
                    >
                      <option value="bike">Bike</option>
                      <option value="scooter">Scooter</option>
                      <option value="car">Car</option>
                      <option value="truck">Truck</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle Registration Number *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={vehicleForm.vehicleNumber}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleNumber: e.target.value })}
                      required
                      placeholder="e.g. DL-3C-AB-1234"
                    />
                  </div>
                </div>

                <div className="form-grid" style={{ marginTop: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Primary Service City *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={vehicleForm.currentCity}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, currentCity: e.target.value })}
                      required
                      placeholder="e.g. Ahmedabad"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Primary Service Area *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={vehicleForm.currentArea}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, currentArea: e.target.value })}
                      required
                      placeholder="e.g. Gota"
                    />
                  </div>
                </div>

                <div className="form-grid" style={{ marginTop: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Operating Pincode</label>
                    <input
                      type="text"
                      className="form-input"
                      value={vehicleForm.pincode}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, pincode: e.target.value })}
                      placeholder="e.g. 382481"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Service Radius (KM)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={vehicleForm.serviceRadius}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, serviceRadius: e.target.value })}
                      placeholder="15"
                    />
                  </div>
                </div>

                <div className="form-grid" style={{ marginTop: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Payout Rate per KM (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={vehicleForm.perKmRate}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, perKmRate: e.target.value })}
                      placeholder="5"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Delivery Scope</label>
                    <select
                      className="form-input"
                      value={vehicleForm.deliveryScope}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, deliveryScope: e.target.value })}
                    >
                      <option value="local">Local Only</option>
                      <option value="intercity">Intercity</option>
                      <option value="interstate">Interstate</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="settings-submit-btn"
                  style={{ marginTop: '24px', background: '#0d9488', color: '#fff' }}
                  disabled={upgradeLoading}
                >
                  {upgradeLoading ? 'Submitting Upgrade Request...' : 'Submit Upgrade & Become Delivery Partner'}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      <footer className="settings-footer">
        <p>© 2026 Emahu Consumer Escrow Portal. Secured with military-grade vault encryption.</p>
      </footer>
    </div>
  );
}
