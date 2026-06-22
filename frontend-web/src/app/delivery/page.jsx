'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { io } from 'socket.io-client';
import { registerUser, loginUser, saveAuthSession, clearAuthSession, checkIsLoggedIn } from '@/utils/auth';
import { indiaStatesCities } from '@/utils/indiaStatesCities';
import './delivery.css';

export default function DeliveryPortal() {
  const formSectionRef = useRef(null);

  // --- Session State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [portalMode, setPortalMode] = useState('register'); // 'register', 'dashboard'

  // --- Registration / Onboarding States ---
  const [regCategory, setRegCategory] = useState('single_two_boy'); // 'single_two_boy', 'agency', 'partner'
  const [deliveryName, setDeliveryName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [fleetSize, setFleetSize] = useState('');
  const [contactName, setContactName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [currentCity, setCurrentCity] = useState('Ahmedabad');
  const [currentArea, setCurrentArea] = useState('Gota');
  const [pincode, setPincode] = useState('382481');
  const [serviceRadius, setServiceRadius] = useState('20');
  const [perItemCharge, setPerItemCharge] = useState('10'); // Rate per 2KM
  const [vehicleType, setVehicleType] = useState('bike');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [latitude, setLatitude] = useState('23.0225');
  const [longitude, setLongitude] = useState('72.5714');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [serviceAreaState, setServiceAreaState] = useState('');
  const [selectedStates, setSelectedStates] = useState([]);
  const [address, setAddress] = useState('');
  const [deliveryScope, setDeliveryScope] = useState('local');
  const [coveredCities, setCoveredCities] = useState([]);
  const [perKmRate, setPerKmRate] = useState('5');

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP Verification States
  const [emailOtp, setEmailOtp] = useState('');
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');

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

  useEffect(() => {
    if (user) {
      setCurrentCity(user.currentCity || user.city || 'Ahmedabad');
      setCurrentArea(user.currentArea || user.address || 'Gota');
      setPincode(user.pincode || '382481');
      setServiceRadius(String(user.serviceRadius || '20'));
      setPerItemCharge(String(user.perItemCharge || '10'));
      setVehicleType(user.vehicleType || 'bike');
      setVehicleNumber(user.vehicleNumber || '');
      if (user.serviceAreaState) {
        if (Array.isArray(user.serviceAreaState)) {
          setServiceAreaState(user.serviceAreaState[0] || '');
          setSelectedStates(user.serviceAreaState);
        } else {
          setServiceAreaState(user.serviceAreaState);
          setSelectedStates([user.serviceAreaState]);
        }
      } else {
        setServiceAreaState('');
        setSelectedStates([]);
      }
      setAddress(user.address || '');
      setDeliveryScope(user.deliveryScope || 'local');
      setCoveredCities(user.coveredCities || []);
      setPerKmRate(String(user.perKmRate || user.perItemCharge || '5'));
    }
  }, [user, editProfileMode]);

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
          const rate = user?.perKmRate || user?.perItemCharge || 5;
          const cost = curr.deliveryCost !== undefined ? curr.deliveryCost : (curr.distanceKm || 0) * rate;
          return acc + cost;
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
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
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
    setPortalMode('login');
  };

  const handleSendEmailOtp = async () => {
    if (!email.trim()) {
      setErrors((prev) => ({ ...prev, email: 'Email address is required to send OTP' }));
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrors((prev) => ({ ...prev, email: 'Enter a valid email address' }));
      return;
    }
    setOtpLoading(true);
    setErrors((prev) => ({ ...prev, email: '', general: '' }));
    setDevOtp('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email })
      });
      const data = await res.json();
      if (data.success) {
        setIsEmailOtpSent(true);
        if (data.devOtp) {
          setDevOtp(data.devOtp);
        }
        setErrors((prev) => ({ ...prev, general: '' }));
      } else {
        setErrors((prev) => ({ ...prev, email: data.error || 'Failed to send OTP' }));
      }
    } catch (err) {
      console.error(err);
      setErrors((prev) => ({ ...prev, email: 'Network error sending OTP code.' }));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp.trim()) {
      setErrors((prev) => ({ ...prev, otp: 'Please enter the verification code' }));
      return;
    }
    setOtpLoading(true);
    setErrors((prev) => ({ ...prev, otp: '', general: '' }));
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email, otp: emailOtp })
      });
      const data = await res.json();
      if (data.success) {
        setIsEmailVerified(true);
        setErrors((prev) => ({ ...prev, general: '' }));
      } else {
        setErrors((prev) => ({ ...prev, otp: data.error || 'Invalid OTP code' }));
      }
    } catch (err) {
      console.error(err);
      setErrors((prev) => ({ ...prev, otp: 'Network error verifying OTP code.' }));
    } finally {
      setOtpLoading(false);
    }
  };

  // Form Validation
  const validateForm = () => {
    const newErrors = {};

    // Category-specific validations
    if (regCategory === 'single_two_boy') {
      if (!deliveryName.trim()) newErrors.deliveryName = 'Driver Name is required';
    } else if (regCategory === 'agency') {
      if (!deliveryName.trim()) newErrors.deliveryName = 'Agency Name is required';
      if (!ownerName.trim()) newErrors.ownerName = 'Owner/Manager Name is required';
      if (!fleetSize.trim() || isNaN(fleetSize) || Number(fleetSize) <= 0) {
        newErrors.fleetSize = 'Enter a valid number of employees';
      }
    } else if (regCategory === 'partner') {
      if (!deliveryName.trim()) newErrors.deliveryName = 'Company Name is required';
      if (!contactName.trim()) newErrors.contactName = 'Corporate Contact Name is required';
      if (!gstNumber.trim()) newErrors.gstNumber = 'GSTIN is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isEmailVerified) {
      newErrors.email = 'Please verify your email address via OTP first';
    }
    if (!password || password.length < 6) newErrors.password = 'Password must be >= 6 chars';
    if (!phoneNumber.trim()) newErrors.phoneNumber = 'Contact number is required';
    if (!currentArea.trim()) newErrors.currentArea = 'Area is required';
    if (!pincode.trim()) newErrors.pincode = 'Pincode is required';
    if (regCategory === 'single_two_boy') {
      if (!serviceAreaState) newErrors.serviceAreaState = 'Service state is required';
      if (!coveredCities || coveredCities.length === 0) {
        newErrors.coveredCities = 'Covered city is required';
      } else if (coveredCities.length > 1) {
        newErrors.coveredCities = 'Single/Two Boy category can only select 1 city';
      }
    } else {
      if (!selectedStates || selectedStates.length === 0) {
        newErrors.serviceAreaState = 'At least one service state is required';
      }
      if (!coveredCities || coveredCities.length === 0) {
        newErrors.coveredCities = 'At least one covered city is required';
      } else if (deliveryScope === 'local' && coveredCities.length > 2) {
        newErrors.coveredCities = 'Local partners can select a maximum of 2 cities';
      }
    }
    if (!address.trim()) newErrors.address = 'Street address is required';
    if (!serviceRadius.trim() || isNaN(serviceRadius)) newErrors.serviceRadius = 'Enter valid radius (KM)';
    if (!perKmRate.trim() || isNaN(perKmRate)) newErrors.perKmRate = 'Enter rate per KM';

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
        operatingLocation: `${currentArea}, ${coveredCities[0] || currentCity}`,
        category: regCategory,
        vehicleType: regCategory === 'single_two_boy' ? vehicleType : 'other',
        vehicleNumber: regCategory === 'single_two_boy' ? vehicleNumber : regCategory === 'agency' ? `Number of Employees: ${fleetSize}` : 'N/A',
        currentCity: coveredCities[0] || currentCity,
        currentArea,
        pincode,
        serviceRadius: parseFloat(serviceRadius),
        perItemCharge: parseFloat(perKmRate),
        perKmRate: parseFloat(perKmRate),
        coveredCities,
        deliveryScope,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        gstNumber: regCategory === 'partner' ? gstNumber.trim() : undefined,
        dispatchNotes: regCategory === 'agency'
          ? `Owner: ${ownerName.trim()}\n${dispatchNotes}`
          : regCategory === 'partner'
            ? `Corporate Contact: ${contactName.trim()}\n${dispatchNotes}`
            : dispatchNotes,
        status: 'approved', // Auto approve for instant testing flow
        serviceAreaState: regCategory === 'single_two_boy' ? serviceAreaState : selectedStates,
        address
      };

      await registerUser(payload);

      // Auto login returning user details and token
      const data = await loginUser(payload.email, payload.password);
      if (data.user.role !== 'delivery') {
        throw new Error('Verification failed.');
      }
      saveAuthSession(data, 'delivery');
      setUser(data.user);
      setToken(data.accessToken);
      setIsLoggedIn(true);
      setPortalMode('dashboard');

      setLoading(false);
      setSubmitted(true);
      setTimeout(() => {
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
          currentCity: coveredCities[0] || currentCity,
          currentArea,
          pincode,
          serviceRadius: parseFloat(serviceRadius),
          perItemCharge: parseFloat(perKmRate),
          perKmRate: parseFloat(perKmRate),
          coveredCities,
          deliveryScope,
          vehicleType,
          vehicleNumber,
          isActivePartner: user?.isActivePartner,
          serviceAreaState: user?.category === 'single_two_boy' ? serviceAreaState : selectedStates,
          address
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

  const handleRegisterSubmitForCategory = async (e, category) => {
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
        category: category,
        vehicleType: category === 'single_two_boy' ? vehicleType : 'other',
        vehicleNumber: category === 'single_two_boy' ? vehicleNumber : category === 'agency' ? `Number of Employees: ${fleetSize}` : 'N/A',
        currentCity,
        currentArea,
        pincode,
        serviceRadius: parseFloat(serviceRadius),
        perItemCharge: parseFloat(perItemCharge),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        gstNumber: category === 'partner' ? gstNumber.trim() : undefined,
        dispatchNotes: category === 'agency'
          ? `Owner: ${ownerName.trim()}\n${dispatchNotes}`
          : category === 'partner'
            ? `Corporate Contact: ${contactName.trim()}\n${dispatchNotes}`
            : dispatchNotes,
        status: 'approved', // Auto approve for instant testing flow
        serviceAreaState,
        address
      };

      await registerUser(payload);

      // Auto login returning user details and token
      const data = await loginUser(payload.email, payload.password);
      if (data.user.role !== 'delivery') {
        throw new Error('Verification failed.');
      }
      saveAuthSession(data, 'delivery');
      setUser(data.user);
      setToken(data.accessToken);
      setIsLoggedIn(true);
      setPortalMode('dashboard');

      setLoading(false);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
      }, 3000);
    } catch (err) {
      setLoading(false);
      setErrors({ apiError: err.message || 'Registration failed' });
    }
  };

  const renderEmailVerificationField = () => {
    return (
      <div className="form-group">
        <label className="form-label" htmlFor="email">Email Address</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="email"
            id="email"
            className={`form-input ${errors.email ? 'form-input--error' : ''}`}
            placeholder="e.g. partner@emahu.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={isEmailVerified}
            style={{ flex: 1 }}
          />
          {!isEmailVerified && (
            <button
              type="button"
              className="form-btn"
              style={{ padding: '0 12px', height: '40px', fontSize: '0.78rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', width: 'auto', margin: 0 }}
              onClick={handleSendEmailOtp}
              disabled={otpLoading}
            >
              {otpLoading ? '...' : isEmailOtpSent ? 'Resend' : 'Send Code'}
            </button>
          )}
        </div>
        {errors.email && <span className="form-error">{errors.email}</span>}

        {/* OTP Input UI */}
        {isEmailOtpSent && !isEmailVerified && (
          <div style={{ marginTop: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '10px', borderRadius: '8px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Verification Code</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Enter 6-digit OTP"
                value={emailOtp}
                onChange={(e) => setEmailOtp(e.target.value)}
                style={{ flex: 1, height: '36px', fontSize: '0.85rem' }}
              />
              <button
                type="button"
                className="form-btn"
                style={{ padding: '0 12px', height: '36px', fontSize: '0.78rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', width: 'auto', margin: 0 }}
                onClick={handleVerifyEmailOtp}
                disabled={otpLoading}
              >
                Verify
              </button>
            </div>
            {errors.otp && <span className="form-error" style={{ display: 'block', marginTop: '4px' }}>{errors.otp}</span>}

          </div>
        )}

        {isEmailVerified && (
          <div style={{ color: '#10b981', fontSize: '0.75rem', marginTop: '6px', fontWeight: 'bold' }}>
            ✓ Email Address Verified Successfully
          </div>
        )}
      </div>
    );
  };

  const renderCityField = () => {
    return (
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
    );
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
                <span className="lp-nav-link-btn active">Onboarding Portal</span>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* --- REGISTER MODE --- */}
      {portalMode === 'register' && (
        <section id="onboard" ref={formSectionRef} className="lp-form-section">
          <div className="lp-section-container">
            <div className="section-header">
              <h2 className="section-title">Logistics Partner Onboarding</h2>
              <p className="section-subtitle">Add your fleet specs, set custom rates, and select your service coverage.</p>
            </div>

            <div className="form-card-wrapper">
              {/* Category tabs */}
              <div className="category-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: '#f1f5f9', padding: '6px', borderRadius: '12px' }}>
                <button
                  type="button"
                  onClick={() => setRegCategory('single_two_boy')}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: regCategory === 'single_two_boy' ? '#ffffff' : 'transparent',
                    color: regCategory === 'single_two_boy' ? '#319795' : '#475569',
                    boxShadow: regCategory === 'single_two_boy' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Single/Two Boy Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setRegCategory('agency')}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: regCategory === 'agency' ? '#ffffff' : 'transparent',
                    color: regCategory === 'agency' ? '#319795' : '#475569',
                    boxShadow: regCategory === 'agency' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Delivery Agency
                </button>
                <button
                  type="button"
                  onClick={() => setRegCategory('partner')}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: regCategory === 'partner' ? '#ffffff' : 'transparent',
                    color: regCategory === 'partner' ? '#319795' : '#475569',
                    boxShadow: regCategory === 'partner' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Delivery Partner
                </button>
              </div>

              {!submitted ? (
                <form className="lp-form" onSubmit={handleRegisterSubmit} noValidate>
                  {errors.apiError && (
                    <div className="form-alert-error">⚠️ {errors.apiError}</div>
                  )}

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label" htmlFor="deliveryName">
                        {regCategory === 'single_two_boy' ? 'Driver Name' :
                          regCategory === 'agency' ? 'Agency Name' : 'Company Name'}
                      </label>
                      <input
                        type="text"
                        id="deliveryName"
                        className={`form-input ${errors.deliveryName ? 'form-input--error' : ''}`}
                        placeholder={
                          regCategory === 'single_two_boy' ? 'e.g. Rahul Sharma' :
                            regCategory === 'agency' ? 'e.g. Ahmedabad Express' : 'e.g. EmahuXpress Enterprise'
                        }
                        value={deliveryName}
                        onChange={(e) => setDeliveryName(e.target.value)}
                      />
                      {errors.deliveryName && <span className="form-error">{errors.deliveryName}</span>}
                    </div>

                    {/* Owner Name (Agency only) */}
                    {regCategory === 'agency' && (
                      <div className="form-group">
                        <label className="form-label" htmlFor="ownerName">Owner / Manager Name</label>
                        <input
                          type="text"
                          id="ownerName"
                          className={`form-input ${errors.ownerName ? 'form-input--error' : ''}`}
                          placeholder="e.g. Rajesh Patel"
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                        />
                        {errors.ownerName && <span className="form-error">{errors.ownerName}</span>}
                      </div>
                    )}

                    {/* Corporate Contact Name (Partner only) */}
                    {regCategory === 'partner' && (
                      <div className="form-group">
                        <label className="form-label" htmlFor="contactName">Corporate Contact Name</label>
                        <input
                          type="text"
                          id="contactName"
                          className={`form-input ${errors.contactName ? 'form-input--error' : ''}`}
                          placeholder="e.g. Sandeep Mehta"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                        />
                        {errors.contactName && <span className="form-error">{errors.contactName}</span>}
                      </div>
                    )}

                    {/* GSTIN (Partner only) */}
                    {regCategory === 'partner' && (
                      <div className="form-group">
                        <label className="form-label" htmlFor="gstNumber">GSTIN / Business Reg Number</label>
                        <input
                          type="text"
                          id="gstNumber"
                          className={`form-input ${errors.gstNumber ? 'form-input--error' : ''}`}
                          placeholder="e.g. 24AAAXX1234A1Z5"
                          value={gstNumber}
                          onChange={(e) => setGstNumber(e.target.value)}
                        />
                        {errors.gstNumber && <span className="form-error">{errors.gstNumber}</span>}
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label" htmlFor="phoneNumber">
                        {regCategory === 'single_two_boy' ? 'Mobile Number' :
                          regCategory === 'agency' ? 'Contact Mobile Number' : 'Corporate Mobile Number'}
                      </label>
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

                    {/* Fleet Size (Agency only) */}
                    {regCategory === 'agency' && (
                      <div className="form-group">
                        <label className="form-label" htmlFor="fleetSize">Number of Employees</label>
                        <input
                          type="number"
                          id="fleetSize"
                          className={`form-input ${errors.fleetSize ? 'form-input--error' : ''}`}
                          placeholder="e.g. 15"
                          value={fleetSize}
                          onChange={(e) => setFleetSize(e.target.value)}
                        />
                        {errors.fleetSize && <span className="form-error">{errors.fleetSize}</span>}
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label" htmlFor="email">Email Address</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="email"
                          id="email"
                          className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                          placeholder="e.g. partner@emahu.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          readOnly={isEmailVerified}
                          style={{ flex: 1 }}
                        />
                        {!isEmailVerified && (
                          <button
                            type="button"
                            className="form-btn"
                            style={{ padding: '0 12px', height: '40px', fontSize: '0.78rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', width: 'auto', margin: 0 }}
                            onClick={handleSendEmailOtp}
                            disabled={otpLoading}
                          >
                            {otpLoading ? '...' : isEmailOtpSent ? 'Resend' : 'Send Code'}
                          </button>
                        )}
                      </div>
                      {errors.email && <span className="form-error">{errors.email}</span>}

                      {/* OTP Input UI */}
                      {isEmailOtpSent && !isEmailVerified && (
                        <div style={{ marginTop: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '10px', borderRadius: '8px' }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Verification Code</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Enter 6-digit OTP"
                              value={emailOtp}
                              onChange={(e) => setEmailOtp(e.target.value)}
                              style={{ flex: 1, height: '36px', fontSize: '0.85rem' }}
                            />
                            <button
                              type="button"
                              className="form-btn"
                              style={{ padding: '0 12px', height: '36px', fontSize: '0.78rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', width: 'auto', margin: 0 }}
                              onClick={handleVerifyEmailOtp}
                              disabled={otpLoading}
                            >
                              Verify
                            </button>
                          </div>
                          {errors.otp && <span className="form-error" style={{ display: 'block', marginTop: '4px' }}>{errors.otp}</span>}

                        </div>
                      )}

                      {isEmailVerified && (
                        <div style={{ color: '#10b981', fontSize: '0.75rem', marginTop: '6px', fontWeight: 'bold' }}>
                          ✓ Email Address Verified Successfully
                        </div>
                      )}
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

                    {/* Category Selector */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="deliveryScope">Delivery Partner Category</label>
                      <select 
                        id="deliveryScope" 
                        className="form-input" 
                        value={deliveryScope}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDeliveryScope(val);
                          if (val === 'local' && coveredCities.length > 2) {
                            setCoveredCities(coveredCities.slice(0, 2));
                          }
                        }}
                      >
                        <option value="local">Local Delivery Partner</option>
                        <option value="intercity">Intercity Delivery Partner</option>
                      </select>
                    </div>

                    {/* State Selector */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="serviceAreaState">
                        {regCategory === 'single_two_boy' ? 'Service State' : 'Service States (Select Multiple)'}
                      </label>
                      {regCategory === 'single_two_boy' ? (
                        <select 
                          id="serviceAreaState" 
                          className={`form-input ${errors.serviceAreaState ? 'form-input--error' : ''}`}
                          value={serviceAreaState}
                          onChange={(e) => {
                            setServiceAreaState(e.target.value);
                            setCoveredCities([]); // Clear cities when state changes
                          }}
                        >
                          <option value="">Select State</option>
                          {Object.keys(indiaStatesCities).map((stateName) => (
                            <option key={stateName} value={stateName}>{stateName}</option>
                          ))}
                        </select>
                      ) : (
                        <select 
                          id="serviceAreaState" 
                          className={`form-input ${errors.serviceAreaState ? 'form-input--error' : ''}`}
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            if (!selectedStates.includes(val)) {
                              setSelectedStates([...selectedStates, val]);
                            }
                          }}
                        >
                          <option value="">Select State to Add</option>
                          {Object.keys(indiaStatesCities).map((stateName) => (
                            <option key={stateName} value={stateName}>{stateName}</option>
                          ))}
                        </select>
                      )}
                      {errors.serviceAreaState && <span className="form-error">{errors.serviceAreaState}</span>}
                      
                      {regCategory !== 'single_two_boy' && selectedStates.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                          {selectedStates.map((st) => (
                            <span key={st} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#4a5568', color: '#fff', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {st}
                              <button 
                                type="button" 
                                onClick={() => {
                                  const updatedStates = selectedStates.filter(s => s !== st);
                                  setSelectedStates(updatedStates);
                                  const citiesOfState = indiaStatesCities[st] || [];
                                  setCoveredCities(coveredCities.filter(c => !citiesOfState.includes(c)));
                                }}
                                style={{ border: 'none', background: 'transparent', color: '#feb2b2', cursor: 'pointer', fontSize: '0.75rem', padding: 0, marginLeft: '2px', fontWeight: 'bold' }}
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* City Multi-Selector */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="citySelect">
                        {regCategory === 'single_two_boy' ? 'Service City' : 'Covered Cities'}
                      </label>
                      {regCategory === 'single_two_boy' ? (
                        <select 
                          id="citySelect" 
                          className={`form-input ${errors.coveredCities ? 'form-input--error' : ''}`}
                          value={coveredCities[0] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              setCoveredCities([val]);
                            } else {
                              setCoveredCities([]);
                            }
                          }}
                          disabled={!serviceAreaState}
                        >
                          <option value="">{serviceAreaState ? "Select City" : "First Select a State"}</option>
                          {serviceAreaState && (indiaStatesCities[serviceAreaState] || []).map((cityName) => (
                            <option key={cityName} value={cityName}>{cityName}</option>
                          ))}
                        </select>
                      ) : (
                        <select 
                          id="citySelect" 
                          className={`form-input ${errors.coveredCities ? 'form-input--error' : ''}`}
                          value=""
                          onChange={(e) => {
                            const selectedCity = e.target.value;
                            if (!selectedCity) return;
                            
                            if (deliveryScope === 'local' && coveredCities.length >= 2) {
                              alert('Local Delivery Partners can select a maximum of 2 cities.');
                              return;
                            }
                            
                            if (coveredCities.includes(selectedCity)) {
                              return;
                            }
                            
                            setCoveredCities([...coveredCities, selectedCity]);
                          }}
                          disabled={selectedStates.length === 0}
                        >
                          <option value="">{selectedStates.length > 0 ? "Select City to Add" : "First Select at Least One State"}</option>
                          {selectedStates.flatMap(st => (indiaStatesCities[st] || []).map(cityName => ({ state: st, city: cityName })))
                            .map(({ state, city }) => (
                              <option key={`${state}-${city}`} value={city}>{city} ({state})</option>
                            ))
                          }
                        </select>
                      )}
                      {errors.coveredCities && <span className="form-error">{errors.coveredCities}</span>}
                      
                      {regCategory !== 'single_two_boy' && coveredCities.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                          {coveredCities.map((city) => (
                            <span key={city} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#319795', color: '#fff', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {city}
                              <button 
                                type="button" 
                                onClick={() => setCoveredCities(coveredCities.filter(c => c !== city))}
                                style={{ border: 'none', background: 'transparent', color: '#feb2b2', cursor: 'pointer', fontSize: '0.75rem', padding: 0, marginLeft: '2px', fontWeight: 'bold' }}
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
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

                    <div className="form-group form-group--full">
                      <label className="form-label" htmlFor="address">Street Address (HQ / Office)</label>
                      <input
                        type="text"
                        id="address"
                        className={`form-input ${errors.address ? 'form-input--error' : ''}`}
                        placeholder="e.g. 101, Business Hub, SG Highway"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                      {errors.address && <span className="form-error">{errors.address}</span>}
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="serviceRadius">
                        {regCategory === 'single_two_boy' ? 'Service Radius (KM)' :
                          regCategory === 'agency' ? 'Max Service Radius (KM)' : 'Coverage Radius (KM)'}
                      </label>
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
                      <label className="form-label" htmlFor="perKmRate">Rate per Kilometer (₹)</label>
                      <input
                        type="number"
                        id="perKmRate"
                        className={`form-input ${errors.perKmRate ? 'form-input--error' : ''}`}
                        placeholder="e.g. 5"
                        value={perKmRate}
                        onChange={(e) => setPerKmRate(e.target.value)}
                      />
                      {errors.perKmRate && <span className="form-error">{errors.perKmRate}</span>}
                    </div>



                    {/* Remarks/Notes */}
                    <div className="form-group form-group--full">
                      <label className="form-label" htmlFor="dispatchNotes">
                        {regCategory === 'single_two_boy' ? 'Driver Remarks & Route Notes' :
                          regCategory === 'agency' ? 'Agency Remarks & Capacity Notes' : 'Corporate Remarks & SLA Notes'}
                      </label>
                      <textarea
                        id="dispatchNotes"
                        className="form-textarea"
                        placeholder={
                          regCategory === 'single_two_boy' ? 'e.g. Available for night deliveries, personal bike...' :
                            regCategory === 'agency' ? 'e.g. Fleet of 10 bikes and 5 vans, standard billing...' :
                              'e.g. SLA guaranteed within 4 hours, regional cargo trucks available...'
                        }
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
                  <p>Logging you in to your delivery dashboard...</p>
                </div>
              )}
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
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>At rate ₹{user?.perKmRate || user?.perItemCharge || 5}/KM</span>
            </div>
          </div>

          {/* Edit Profile Panel */}
          {editProfileMode && (
            <div className="form-card-wrapper" style={{ marginBottom: '32px', padding: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', color: '#0f172a' }}>Update Fleet Profile Settings</h3>
              <form onSubmit={handleUpdateProfile}>
                <div className="form-grid" style={{ marginBottom: '16px' }}>
                  {/* Delivery Scope / Category Select */}
                  <div className="form-group">
                    <label className="form-label">Delivery Scope / Category</label>
                    <select 
                      className="form-input" 
                      value={deliveryScope}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDeliveryScope(val);
                        if (val === 'local' && coveredCities.length > 2) {
                          setCoveredCities(coveredCities.slice(0, 2));
                        }
                      }}
                    >
                      <option value="local">Local Delivery Partner</option>
                      <option value="intercity">Intercity Delivery Partner</option>
                    </select>
                  </div>

                  {/* State Selector */}
                  <div className="form-group">
                    <label className="form-label">
                      {user?.category === 'single_two_boy' ? 'Service State' : 'Service States (Select Multiple)'}
                    </label>
                    {user?.category === 'single_two_boy' ? (
                      <select 
                        className="form-input"
                        value={serviceAreaState}
                        onChange={(e) => {
                          setServiceAreaState(e.target.value);
                          setCoveredCities([]); // Clear cities when state changes
                        }}
                      >
                        <option value="">Select State</option>
                        {Object.keys(indiaStatesCities).map((stateName) => (
                          <option key={stateName} value={stateName}>{stateName}</option>
                        ))}
                      </select>
                    ) : (
                      <select 
                        className="form-input"
                        value=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          if (!selectedStates.includes(val)) {
                            setSelectedStates([...selectedStates, val]);
                          }
                        }}
                      >
                        <option value="">Select State to Add</option>
                        {Object.keys(indiaStatesCities).map((stateName) => (
                          <option key={stateName} value={stateName}>{stateName}</option>
                        ))}
                      </select>
                    )}
                    
                    {user?.category !== 'single_two_boy' && selectedStates.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                        {selectedStates.map((st) => (
                          <span key={st} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#4a5568', color: '#fff', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {st}
                            <button 
                              type="button" 
                              onClick={() => {
                                const updatedStates = selectedStates.filter(s => s !== st);
                                setSelectedStates(updatedStates);
                                const citiesOfState = indiaStatesCities[st] || [];
                                setCoveredCities(coveredCities.filter(c => !citiesOfState.includes(c)));
                              }}
                              style={{ border: 'none', background: 'transparent', color: '#feb2b2', cursor: 'pointer', fontSize: '0.75rem', padding: 0, marginLeft: '2px', fontWeight: 'bold' }}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* City Selector */}
                  <div className="form-group">
                    <label className="form-label">
                      {user?.category === 'single_two_boy' ? 'Service City' : 'Covered Cities'}
                    </label>
                    {user?.category === 'single_two_boy' ? (
                      <select 
                        className="form-input"
                        value={coveredCities[0] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            setCoveredCities([val]);
                          } else {
                            setCoveredCities([]);
                          }
                        }}
                        disabled={!serviceAreaState}
                      >
                        <option value="">{serviceAreaState ? "Select City" : "First Select a State"}</option>
                        {serviceAreaState && (indiaStatesCities[serviceAreaState] || []).map((cityName) => (
                          <option key={cityName} value={cityName}>{cityName}</option>
                        ))}
                      </select>
                    ) : (
                      <select 
                        className="form-input"
                        value=""
                        onChange={(e) => {
                          const selectedCity = e.target.value;
                          if (!selectedCity) return;
                          
                          if (deliveryScope === 'local' && coveredCities.length >= 2) {
                            alert('Local Delivery Partners can select a maximum of 2 cities.');
                            return;
                          }
                          
                          if (coveredCities.includes(selectedCity)) {
                            return;
                          }
                          
                          setCoveredCities([...coveredCities, selectedCity]);
                        }}
                        disabled={selectedStates.length === 0}
                      >
                        <option value="">{selectedStates.length > 0 ? "Select City to Add" : "First Select at Least One State"}</option>
                        {selectedStates.flatMap(st => (indiaStatesCities[st] || []).map(cityName => ({ state: st, city: cityName })))
                          .map(({ state, city }) => (
                            <option key={`${state}-${city}`} value={city}>{city} ({state})</option>
                          ))
                        }
                      </select>
                    )}
                    
                    {user?.category !== 'single_two_boy' && coveredCities.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                        {coveredCities.map((city) => (
                          <span key={city} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#319795', color: '#fff', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {city}
                            <button 
                              type="button" 
                              onClick={() => setCoveredCities(coveredCities.filter(c => c !== city))}
                              style={{ border: 'none', background: 'transparent', color: '#feb2b2', cursor: 'pointer', fontSize: '0.75rem', padding: 0, marginLeft: '2px', fontWeight: 'bold' }}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Service Area</label>
                    <input type="text" className="form-input" value={currentArea} onChange={(e) => setCurrentArea(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode</label>
                    <input type="text" className="form-input" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                  </div>
                  <div className="form-group form-group--full">
                    <label className="form-label">Street Address</label>
                    <input type="text" className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Service Radius (KM)</label>
                    <input type="number" className="form-input" value={serviceRadius} onChange={(e) => setServiceRadius(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rate per Kilometer (₹)</label>
                    <input type="number" className="form-input" value={perKmRate} onChange={(e) => setPerKmRate(e.target.value)} />
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
                      const cost = order.deliveryCost !== undefined ? order.deliveryCost : parseFloat(((order.distanceKm || 0) * (user?.perKmRate || user?.perItemCharge || 5)).toFixed(2));
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
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>₹{user?.perKmRate || user?.perItemCharge || 5}/KM</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span className={`status-pill status-pill--${order.deliveryStatus}`}>
                              {order.deliveryStatus || order.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              {order.deliveryStatus !== 'delivered' && (
                                <div style={{ display: 'flex', gap: '6px', marginRight: '10px' }}>
                                  {order.sellerPhone && (
                                    <>
                                      <a
                                        href={`tel:${order.sellerPhone}`}
                                        title={`Call Seller: ${order.sellerName || ''}`}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '4px',
                                          padding: '6px 10px',
                                          borderRadius: '6px',
                                          backgroundColor: '#2563eb',
                                          color: '#fff',
                                          fontSize: '0.75rem',
                                          fontWeight: '700',
                                          textDecoration: 'none'
                                        }}
                                      >
                                        📞 Call Seller
                                      </a>
                                      <a
                                        href={`https://wa.me/${order.sellerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${order.sellerName || 'Merchant'}, I am your delivery partner for Emahu order #${order.orderId}. I am on my way to pick up the package.`)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="WhatsApp Seller"
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '4px',
                                          padding: '6px 10px',
                                          borderRadius: '6px',
                                          backgroundColor: '#25d366',
                                          color: '#fff',
                                          fontSize: '0.75rem',
                                          fontWeight: '700',
                                          textDecoration: 'none'
                                        }}
                                      >
                                        💬 Msg Seller
                                      </a>
                                    </>
                                  )}
                                  {order.deliveryAddress?.phone && (
                                    <>
                                      <a
                                        href={`tel:${order.deliveryAddress.phone}`}
                                        title={`Call Buyer: ${order.deliveryAddress.fullName || ''}`}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '4px',
                                          padding: '6px 10px',
                                          borderRadius: '6px',
                                          backgroundColor: '#7c3aed',
                                          color: '#fff',
                                          fontSize: '0.75rem',
                                          fontWeight: '700',
                                          textDecoration: 'none'
                                        }}
                                      >
                                        📱 Call Buyer
                                      </a>
                                      <a
                                        href={`https://wa.me/${order.deliveryAddress.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${order.deliveryAddress.fullName || 'Customer'}, I am your delivery partner for Emahu order #${order.orderId}. I am on my way to deliver your package.`)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="WhatsApp Buyer"
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '4px',
                                          padding: '6px 10px',
                                          borderRadius: '6px',
                                          backgroundColor: '#10b981',
                                          color: '#fff',
                                          fontSize: '0.75rem',
                                          fontWeight: '700',
                                          textDecoration: 'none'
                                        }}
                                      >
                                        💬 Msg Buyer
                                      </a>
                                    </>
                                  )}
                                </div>
                              )}

                              {order.deliveryStatus === 'assigned' && (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button onClick={() => handleUpdateJobStatus(order.orderId, 'accepted')} className="lp-btn lp-btn--primary" style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#38a169' }}>
                                    Accept
                                  </button>
                                  <button onClick={() => handleUpdateJobStatus(order.orderId, 'rejected')} className="lp-btn lp-btn--primary" style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#e53e3e' }}>
                                    Reject
                                  </button>
                                </div>
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
      {!isLoggedIn && (
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
