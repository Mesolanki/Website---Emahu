'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { io } from 'socket.io-client';
import './delivery.css'; 
import { registerUser, loginUser, saveAuthSession, clearAuthSession, checkIsLoggedIn } from '@/utils/auth';

export default function DeliveryPortal() {
  const formSectionRef = useRef(null);

  // --- Session State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [portalMode, setPortalMode] = useState('landing'); // 'landing', 'login', 'dashboard'

  // --- Registration / Onboarding States ---
  const [deliveryName, setDeliveryName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [currentCity, setCurrentCity] = useState('Ahmedabad');
  const [currentArea, setCurrentArea] = useState('Gota');
  const [pincode, setPincode] = useState('382481');
  const [serviceRadius, setServiceRadius] = useState('20');
  const [perItemCharge, setPerItemCharge] = useState('10'); // Rate per KM
  const [vehicleType, setVehicleType] = useState('bike');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [latitude, setLatitude] = useState('23.0225');
  const [longitude, setLongitude] = useState('72.5714');
  const [dispatchNotes, setDispatchNotes] = useState('');

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Login States ---
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // --- Dashboard States ---
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, earnings: 0 });
  const [dashLoading, setDashLoading] = useState(false);
  const [editProfileMode, setEditProfileMode] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [faqActive, setFaqActive] = useState(null);

  // Auto-set Lat/Lon when city changes for Ahmedabad & Surat defaults
  useEffect(() => {
    if (currentCity.toLowerCase() === 'ahmedabad') {
      setLatitude('23.0225');
      setLongitude('72.5714');
    } else if (currentCity.toLowerCase() === 'surat') {
      setLatitude('21.1702');
      setLongitude('72.8311');
    }
  }, [currentCity]);

  // Load session on startup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const logged = checkIsLoggedIn('delivery');
      if (logged) {
        setIsLoggedIn(true);
        const storedUser = JSON.parse(localStorage.getItem('emahu_delivery_user') || '{}');
        const storedToken = localStorage.getItem('emahu_delivery_token');
        setUser(storedUser);
        setToken(storedToken);
        setPortalMode('dashboard');
      }
    }
  }, []);

  // Fetch Dashboard Orders
  const fetchDashboardData = async (userToken) => {
    if (!userToken) return;
    setDashLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/delivery/my-orders`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      const data = await res.json();
      if (data.success) {
        const jobs = data.orders || [];
        setOrders(jobs);
        
        // Calculate Stats
        const deliveredJobs = jobs.filter(j => j.deliveryStatus === 'delivered');
        const pendingJobs = jobs.filter(j => j.deliveryStatus !== 'delivered' && j.deliveryStatus !== 'rejected');
        
        const totalEarnings = deliveredJobs.reduce((acc, curr) => {
          // Earnings = distanceKm * userRate
          const rate = user?.perItemCharge || 10;
          return acc + ((curr.distanceKm || 0) * rate);
        }, 0);

        setStats({
          total: jobs.length,
          pending: pendingJobs.length,
          earnings: parseFloat(totalEarnings.toFixed(2))
        });
      }
    } catch (err) {
      console.error('Fetch dashboard jobs failed:', err);
    } finally {
      setDashLoading(false);
    }
  };

  // Socket.io integration for real-time order alerts
  useEffect(() => {
    if (!token) return;
    fetchDashboardData(token);

    // Connect to websocket
    const socket = io();
    socket.on('connect', () => {
      console.log('Connected to logistics socket grid');
    });

    socket.on('delivery-status-changed', (payload) => {
      console.log('Received socket status update:', payload);
      // Refresh dashboard
      fetchDashboardData(token);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // --- Auth Handlers ---
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Please enter both email and password');
      return;
    }
    setLoginLoading(true);
    try {
      const data = await loginUser(loginEmail.trim(), loginPassword);
      if (data.user.role !== 'delivery') {
        throw new Error('This login portal is restricted to Delivery Partners only.');
      }
      saveAuthSession(data, 'delivery');
      setUser(data.user);
      setToken(data.accessToken);
      setIsLoggedIn(true);
      setPortalMode('dashboard');
    } catch (err) {
      setLoginError(err.message || 'Invalid credentials');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession('delivery');
    setIsLoggedIn(false);
    setUser(null);
    setToken(null);
    setPortalMode('landing');
  };

  // Form Validation
  const validateForm = () => {
    const newErrors = {};
    if (!deliveryName.trim()) newErrors.deliveryName = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!password || password.length < 6) newErrors.password = 'Password must be >= 6 chars';
    if (!phoneNumber.trim()) newErrors.phoneNumber = 'Mobile number is required';
    if (!currentCity.trim()) newErrors.currentCity = 'City is required';
    if (!currentArea.trim()) newErrors.currentArea = 'Area is required';
    if (!pincode.trim()) newErrors.pincode = 'Pincode is required';
    if (!serviceRadius.trim() || isNaN(serviceRadius)) newErrors.serviceRadius = 'Enter valid radius (KM)';
    if (!perItemCharge.trim() || isNaN(perItemCharge)) newErrors.perItemCharge = 'Enter rate per KM';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const payload = {
        name: deliveryName,
        email: email.trim(),
        password,
        role: 'delivery',
        phone: phoneNumber.trim(),
        operatingLocation: `${currentArea}, ${currentCity}`,
        vehicleType,
        vehicleNumber,
        currentCity,
        currentArea,
        pincode,
        serviceRadius: parseFloat(serviceRadius),
        perItemCharge: parseFloat(perItemCharge),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        dispatchNotes,
        status: 'approved' // Auto approve for instant testing flow
      };

      await registerUser(payload);
      setLoading(false);
      setSubmitted(true);
      // Wait a bit, then redirect to login view
      setTimeout(() => {
        setPortalMode('login');
        setLoginEmail(email);
        setSubmitted(false);
      }, 3000);
    } catch (err) {
      setLoading(false);
      setErrors({ apiError: err.message || 'Registration failed' });
    }
  };

  // --- Action Handlers ---
  const handleUpdateJobStatus = async (orderId, newStatus) => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/delivery/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId,
          status: newStatus,
          remarks: `Status updated to ${newStatus} by partner ${user?.name}`
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchDashboardData(token);
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating status');
    }
  };

  // Partner self-profile update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSuccessMsg('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/delivery/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentCity,
          currentArea,
          pincode,
          serviceRadius: parseFloat(serviceRadius),
          perItemCharge: parseFloat(perItemCharge),
          vehicleType,
          vehicleNumber,
          isActivePartner: user?.isActivePartner
        })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.partner);
        localStorage.setItem('emahu_delivery_user', JSON.stringify(data.partner));
        setProfileSuccessMsg('Profile settings updated successfully!');
        setEditProfileMode(false);
        fetchDashboardData(token);
      } else {
        alert(data.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating profile');
    }
  };

  // Toggle active availability status
  const handleToggleActiveStatus = async () => {
    if (!token || !user) return;
    const newActiveState = !user.isActivePartner;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/delivery/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isActivePartner: newActiveState
        })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.partner);
        localStorage.setItem('emahu_delivery_user', JSON.stringify(data.partner));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Rendering ---
  return (
    <div className="lp-wrapper">
      <div className="lp-glow lp-glow--1" />
      <div className="lp-glow lp-glow--2" />

      {/* --- HEADER --- */}
      <header className="lp-header">
        <div className="lp-header-container">
          <Link href="/" className="lp-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="10" fill="#319795" />
              <path d="M8 12h16M8 16h12M8 20h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <span className="lp-logo-text">EMAHU PORTAL</span>
          </Link>
          
          <nav className="lp-nav">
            {isLoggedIn ? (
              <>
                <span className="lp-nav-user">👋 {user?.name} ({user?.currentCity})</span>
                <button onClick={() => setEditProfileMode(!editProfileMode)} className="lp-nav-link-btn">
                  Edit Fleet Profile
                </button>
                <button onClick={handleLogout} className="lp-logout-btn">Logout</button>
              </>
            ) : (
              <>
                <button onClick={() => setPortalMode('landing')} className="lp-nav-link-btn">Landing</button>
                <button onClick={() => {
                  setPortalMode('landing');
                  setTimeout(() => formSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                }} className="lp-nav-link-btn">Register</button>
                <button onClick={() => setPortalMode('login')} className="lp-login-trigger-btn">Partner Sign In</button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* --- LANDING MODE --- */}
      {portalMode === 'landing' && (
        <>
          <section className="lp-hero">
            <div className="lp-section-container lp-hero-grid">
              <div className="lp-hero-text">
                <div className="lp-badge">GRID-LOCATION LOGISTICS</div>
                <h1 className="lp-hero-title">
                  Location-Based Courier. <br />
                  <span>Your City. Your Rates.</span>
                </h1>
                <p className="lp-hero-subtitle">
                  Set custom per-KM rates and choose your service radius. We automatically route orders in your city to your dashboard. Accept or decline jobs instantly.
                </p>
                <div className="lp-hero-actions">
                  <button onClick={() => formSectionRef.current?.scrollIntoView({ behavior: 'smooth' })} className="lp-btn lp-btn--primary">
                    Register Your Fleet
                  </button>
                  <button onClick={() => setPortalMode('login')} className="lp-btn lp-btn--secondary">
                    Courier Login
                  </button>
                </div>
              </div>
              
              <div className="lp-hero-visual">
                <div className="visual-card">
                  <div className="visual-badge">Active Zones</div>
                  <h3>Smart Radius Matching</h3>
                  <p>{"Ahmedabad, Surat, Mumbai logistics grids are live. Sellers assign local couriers based on real-time calculated distance."}</p>
                  <div className="visual-stats">
                    <div className="stat-item">
                      <span className="stat-num">₹10/KM</span>
                      <span className="stat-label">Custom Rates</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-num">100%</span>
                      <span className="stat-label">Local Dispatch</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Onboarding Register */}
          <section id="onboard" ref={formSectionRef} className="lp-form-section">
            <div className="lp-section-container">
              <div className="section-header">
                <h2 className="section-title">Logistics Partner Onboarding</h2>
                <p className="section-subtitle">Add your fleet specs, set custom rates per kilometer, and select your service coverage.</p>
              </div>

              <div className="form-card-wrapper">
                {!submitted ? (
                  <form className="lp-form" onSubmit={handleRegisterSubmit} noValidate>
                    {errors.apiError && (
                      <div className="form-alert-error">⚠️ {errors.apiError}</div>
                    )}
                    
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label" htmlFor="deliveryName">Fleet/Driver Name</label>
                        <input 
                          type="text" 
                          id="deliveryName"
                          className={`form-input ${errors.deliveryName ? 'form-input--error' : ''}`}
                          placeholder="e.g. Ahmedabad Express"
                          value={deliveryName}
                          onChange={(e) => setDeliveryName(e.target.value)}
                        />
                        {errors.deliveryName && <span className="form-error">{errors.deliveryName}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="phoneNumber">Mobile Number</label>
                        <input 
                          type="text" 
                          id="phoneNumber"
                          className={`form-input ${errors.phoneNumber ? 'form-input--error' : ''}`}
                          placeholder="e.g. +91 98989 89898"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                        {errors.phoneNumber && <span className="form-error">{errors.phoneNumber}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="email">Email Address</label>
                        <input 
                          type="email" 
                          id="email"
                          className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                          placeholder="e.g. partner@emahu.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                        {errors.email && <span className="form-error">{errors.email}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="password">Password</label>
                        <input 
                          type="password" 
                          id="password"
                          className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                          placeholder="Min 6 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        {errors.password && <span className="form-error">{errors.password}</span>}
                      </div>

                      {/* City Dropdown */}
                      <div className="form-group">
                        <label className="form-label" htmlFor="currentCity">Service City</label>
                        <select 
                          id="currentCity" 
                          className={`form-input ${errors.currentCity ? 'form-input--error' : ''}`}
                          value={currentCity}
                          onChange={(e) => setCurrentCity(e.target.value)}
                        >
                          <option value="Ahmedabad">Ahmedabad</option>
                          <option value="Surat">Surat</option>
                          <option value="Rajkot">Rajkot</option>
                          <option value="Vadodara">Vadodara</option>
                          <option value="Mumbai">Mumbai</option>
                          <option value="Delhi">Delhi</option>
                        </select>
                        {errors.currentCity && <span className="form-error">{errors.currentCity}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="currentArea">Service Area</label>
                        <input 
                          type="text" 
                          id="currentArea"
                          className={`form-input ${errors.currentArea ? 'form-input--error' : ''}`}
                          placeholder="e.g. Gota or Adajan"
                          value={currentArea}
                          onChange={(e) => setCurrentArea(e.target.value)}
                        />
                        {errors.currentArea && <span className="form-error">{errors.currentArea}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="pincode">Pincode</label>
                        <input 
                          type="text" 
                          id="pincode"
                          className={`form-input ${errors.pincode ? 'form-input--error' : ''}`}
                          placeholder="e.g. 380060"
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
                        />
                        {errors.pincode && <span className="form-error">{errors.pincode}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="serviceRadius">Service Radius (KM)</label>
                        <input 
                          type="number" 
                          id="serviceRadius"
                          className={`form-input ${errors.serviceRadius ? 'form-input--error' : ''}`}
                          placeholder="e.g. 20"
                          value={serviceRadius}
                          onChange={(e) => setServiceRadius(e.target.value)}
                        />
                        {errors.serviceRadius && <span className="form-error">{errors.serviceRadius}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="perItemCharge">Custom Rate Per KM (₹)</label>
                        <input 
                          type="number" 
                          id="perItemCharge"
                          className={`form-input ${errors.perItemCharge ? 'form-input--error' : ''}`}
                          placeholder="e.g. 10"
                          value={perItemCharge}
                          onChange={(e) => setPerItemCharge(e.target.value)}
                        />
                        {errors.perItemCharge && <span className="form-error">{errors.perItemCharge}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="vehicleType">Vehicle Type</label>
                        <select 
                          id="vehicleType"
                          className="form-input"
                          value={vehicleType}
                          onChange={(e) => setVehicleType(e.target.value)}
                        >
                          <option value="bike">Bike (Standard)</option>
                          <option value="scooter">Scooter</option>
                          <option value="car">Car (Express)</option>
                          <option value="truck">Truck (Heavy Payload)</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="vehicleNumber">Vehicle Number</label>
                        <input 
                          type="text" 
                          id="vehicleNumber"
                          className="form-input"
                          placeholder="e.g. GJ-01-XX-9999"
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Location Coordinates</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input 
                            type="text" 
                            className="form-input"
                            placeholder="Lat" 
                            value={latitude} 
                            onChange={(e) => setLatitude(e.target.value)} 
                          />
                          <input 
                            type="text" 
                            className="form-input"
                            placeholder="Lon" 
                            value={longitude} 
                            onChange={(e) => setLongitude(e.target.value)} 
                          />
                        </div>
                      </div>

                      <div className="form-group form-group--full">
                        <label className="form-label" htmlFor="dispatchNotes">Dispatch remarks & Route Notes</label>
                        <textarea 
                          id="dispatchNotes"
                          className="form-textarea"
                          placeholder="e.g. Standard 10% volume discount, heavy payload trucks available..."
                          value={dispatchNotes}
                          onChange={(e) => setDispatchNotes(e.target.value)}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <button type="submit" className="form-btn" disabled={loading}>
                      {loading ? 'Submitting Registration...' : 'Register Dispatch Partner'}
                    </button>
                  </form>
                ) : (
                  <div className="lp-success-card">
                    <div className="success-badge">✅</div>
                    <h2>Registration Successful!</h2>
                    <p>Redirecting you to the Partner Login screen to enter your new credentials...</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {/* --- LOGIN MODE --- */}
      {portalMode === 'login' && (
        <section className="lp-form-section" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center' }}>
          <div className="lp-section-container" style={{ maxWidth: '480px' }}>
            <div className="form-card-wrapper" style={{ padding: '40px' }}>
              <h2 className="section-title" style={{ marginBottom: '8px' }}>Partner Sign In</h2>
              <p className="section-subtitle" style={{ marginBottom: '24px' }}>Access your logistics queue and status grid.</p>
              
              {loginError && <div className="form-alert-error" style={{ marginBottom: '16px' }}>⚠️ {loginError}</div>}
              
              <form className="lp-form" onSubmit={handleLoginSubmit}>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={loginEmail} 
                    onChange={(e) => setLoginEmail(e.target.value)} 
                    placeholder="partner@emahu.com"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Password</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    value={loginPassword} 
                    onChange={(e) => setLoginPassword(e.target.value)} 
                    placeholder="••••••••"
                  />
                </div>
                <button type="submit" className="form-btn" disabled={loginLoading}>
                  {loginLoading ? 'Signing In...' : 'Access Dashboard'}
                </button>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* --- DASHBOARD MODE --- */}
      {portalMode === 'dashboard' && (
        <section className="lp-section-container" style={{ padding: '40px 24px' }}>
          
          {/* Header Stats Grid */}
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div className="benefit-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Active Status</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                <span className={`status-pill ${user?.isActivePartner ? 'status-pill--active' : 'status-pill--inactive'}`}>
                  {user?.isActivePartner ? 'Active (Ready)' : 'Inactive (Offline)'}
                </span>
                <button onClick={handleToggleActiveStatus} className="lp-btn lp-btn--secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                  Toggle
                </button>
              </div>
            </div>

            <div className="benefit-card" style={{ padding: '24px' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Assigned Jobs</span>
              <h3 style={{ fontSize: '2rem', margin: '8px 0 0 0', color: '#0f172a' }}>{stats.total}</h3>
            </div>

            <div className="benefit-card" style={{ padding: '24px' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Pending Dispatch</span>
              <h3 style={{ fontSize: '2rem', margin: '8px 0 0 0', color: '#e53e3e' }}>{stats.pending}</h3>
            </div>

            <div className="benefit-card" style={{ padding: '24px' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Earnings</span>
              <h3 style={{ fontSize: '2rem', margin: '8px 0 0 0', color: '#319795' }}>₹{stats.earnings}</h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>At rate ₹{user?.perItemCharge || 10}/KM</span>
            </div>
          </div>

          {/* Edit Profile Panel */}
          {editProfileMode && (
            <div className="form-card-wrapper" style={{ marginBottom: '32px', padding: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', color: '#0f172a' }}>Update Fleet Profile Settings</h3>
              <form onSubmit={handleUpdateProfile}>
                <div className="form-grid" style={{ marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Service City</label>
                    <input type="text" className="form-input" value={currentCity} onChange={(e) => setCurrentCity(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Service Area</label>
                    <input type="text" className="form-input" value={currentArea} onChange={(e) => setCurrentArea(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode</label>
                    <input type="text" className="form-input" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Service Radius (KM)</label>
                    <input type="number" className="form-input" value={serviceRadius} onChange={(e) => setServiceRadius(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rate per KM (₹)</label>
                    <input type="number" className="form-input" value={perItemCharge} onChange={(e) => setPerItemCharge(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle Type</label>
                    <select className="form-input" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                      <option value="bike">Bike</option>
                      <option value="scooter">Scooter</option>
                      <option value="car">Car</option>
                      <option value="truck">Truck</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle Number</label>
                    <input type="text" className="form-input" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="submit" className="lp-btn lp-btn--primary" style={{ padding: '8px 16px' }}>Save Profile</button>
                  <button type="button" onClick={() => setEditProfileMode(false)} className="lp-btn lp-btn--secondary" style={{ padding: '8px 16px' }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {profileSuccessMsg && (
            <div className="form-alert-success" style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#e6fffa', border: '1px solid #319795', color: '#234e52', borderRadius: '8px' }}>
              {profileSuccessMsg}
            </div>
          )}

          {/* Active Job Queues */}
          <div className="form-card-wrapper" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 600 }}>Your Delivery Queue</h3>
              <button onClick={() => fetchDashboardData(token)} className="lp-btn lp-btn--secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                🔄 Refresh Queue
              </button>
            </div>

            {dashLoading ? (
              <p style={{ textAlign: 'center', color: '#64748b' }}>Refreshing logistics queue...</p>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <span style={{ fontSize: '3rem' }}>📦</span>
                <h4 style={{ fontSize: '1.1rem', margin: '16px 0 8px 0', color: '#0f172a' }}>No assignments found</h4>
                <p>Ensure your status toggle is set to Active and that merchants in {user?.currentCity} have placed orders.</p>
              </div>
            ) : (
              <div className="orders-table-wrapper" style={{ overflowX: 'auto' }}>
                <table className="orders-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                      <th style={{ padding: '12px' }}>Order ID</th>
                      <th style={{ padding: '12px' }}>Addresses</th>
                      <th style={{ padding: '12px' }}>Distance</th>
                      <th style={{ padding: '12px' }}>Cost Details</th>
                      <th style={{ padding: '12px' }}>Current Status</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const cost = parseFloat(((order.distanceKm || 0) * (user?.perItemCharge || 10)).toFixed(2));
                      return (
                        <tr key={order.orderId} style={{ borderBottom: '1px solid #edf2f7', fontSize: '0.9rem' }}>
                          <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>#{order.orderId}</td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                              <strong>Pickup:</strong> {order.sellerLocation?.address || 'Seller Hub'}
                              {order.sellerLocation?.latitude && order.sellerLocation?.longitude && (
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${order.sellerLocation.latitude},${order.sellerLocation.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: '#319795', textDecoration: 'underline', marginLeft: '6px', fontSize: '0.75rem' }}
                                >
                                  📍 Map
                                </a>
                              )}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                              <strong>Delivery:</strong> {order.deliveryAddress?.address || order.buyerLocation?.address}
                              {order.buyerLocation?.latitude && order.buyerLocation?.longitude && (
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${order.buyerLocation.latitude},${order.buyerLocation.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: '#319795', textDecoration: 'underline', marginLeft: '6px', fontSize: '0.75rem' }}
                                >
                                  📍 Map
                                </a>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '12px', fontWeight: 600 }}>{order.distanceKm || 0} KM</td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: 600, color: '#319795' }}>₹{cost}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>₹{user?.perItemCharge || 10}/KM</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span className={`status-pill status-pill--${order.deliveryStatus}`}>
                              {order.deliveryStatus || order.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              {(order.deliveryStatus === 'assigned' || order.assignmentStatus === 'unassigned') && (
                                <>
                                  <button onClick={() => handleUpdateJobStatus(order.orderId, 'accepted')} className="lp-btn lp-btn--primary" style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#2b6cb0' }}>
                                    Accept
                                  </button>
                                  <button onClick={() => handleUpdateJobStatus(order.orderId, 'rejected')} className="lp-btn lp-btn--secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#e53e3e' }}>
                                    Reject
                                  </button>
                                </>
                              )}
                              {order.deliveryStatus === 'accepted' && (
                                <button onClick={() => handleUpdateJobStatus(order.orderId, 'picked_up')} className="lp-btn lp-btn--primary" style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#dd6b20' }}>
                                  Mark Picked Up
                                </button>
                              )}
                              {order.deliveryStatus === 'picked_up' && (
                                <button onClick={() => handleUpdateJobStatus(order.orderId, 'out_for_delivery')} className="lp-btn lp-btn--primary" style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#319795' }}>
                                  Mark Out For Delivery
                                </button>
                              )}
                              {order.deliveryStatus === 'out_for_delivery' && (
                                <button onClick={() => handleUpdateJobStatus(order.orderId, 'delivered')} className="lp-btn lp-btn--primary" style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#38a169' }}>
                                  Mark Delivered
                                </button>
                              )}
                              {order.deliveryStatus === 'delivered' && (
                                <span style={{ color: '#38a169', fontWeight: 600 }}>🎉 Done</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* --- FAQs --- */}
      {portalMode === 'landing' && (
        <section id="faq" className="lp-faq">
          <div className="lp-section-container">
            <div className="section-header">
              <h2 className="section-title">Logistics FAQ</h2>
            </div>
            <div className="faq-list">
              <div className={`faq-item ${faqActive === 0 ? 'faq-item--active' : ''}`} onClick={() => setFaqActive(faqActive === 0 ? null : 0)}>
                <div className="faq-question">How does city filtering work?</div>
                <div className="faq-answer">Ahmedabad orders only show Ahmedabad partners. Your Service Radius must cover the buyer location to receive jobs.</div>
              </div>
              <div className={`faq-item ${faqActive === 1 ? 'faq-item--active' : ''}`} onClick={() => setFaqActive(faqActive === 1 ? null : 1)}>
                <div className="faq-question">How is distance calculated?</div>
                <div className="faq-answer">Distance is calculated between seller shop address and buyer address. Your payout is Distance × your custom rate per KM.</div>
              </div>
            </div>
          </div>
        </section>
      )}

      <footer className="lp-footer">
        <div className="lp-section-container">
          <p>© 2026 Emahu Logistics Network. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
