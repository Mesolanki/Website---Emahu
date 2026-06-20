'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BuyerHeader from '@/components/buyer_home/buyer_header';
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
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    required
                    placeholder="e.g. +91 98765 43210"
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
      </main>

      <footer className="settings-footer">
        <p>© 2026 Emahu Consumer Escrow Portal. Secured with military-grade vault encryption.</p>
      </footer>
    </div>
  );
}
