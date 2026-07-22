'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { io } from 'socket.io-client';
import { registerUser, loginUser, saveAuthSession, clearAuthSession, checkIsLoggedIn, changeUserRole } from '@/utils/auth';
import { indiaStatesCities } from '@/utils/indiaStatesCities';
import './delivery.css';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '@/utils/firebase';
import API_BASE from '@/utils/config';

let localApiUrl = API_BASE;

const getDynamicApiUrl = () => {
  return API_BASE;
};

function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

export default function DeliveryPortal() {
  const formSectionRef = useRef(null);

  // --- Session State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [portalMode, setPortalMode] = useState('register'); // 'register', 'dashboard'
  const [agreeTerms, setAgreeTerms] = useState(false);

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
  const [sameAsHq, setSameAsHq] = useState(false);
  const [hasOpenedTerms, setHasOpenedTerms] = useState(false);
  const [hasOpenedTermsLogin, setHasOpenedTermsLogin] = useState(false);

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP Verification States
  const [emailOtp, setEmailOtp] = useState('');
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [isSandboxRestricted, setIsSandboxRestricted] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);

  // Geolocation terms and manual address states
  const [showLocationTermsModal, setShowLocationTermsModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [manualStreet, setManualStreet] = useState('');
  const [manualArea, setManualArea] = useState('');
  const [manualCity, setManualCity] = useState('Ahmedabad');
  const [manualState, setManualState] = useState('Gujarat');
  const [manualPincode, setManualPincode] = useState('');
  const [locationTermsError, setLocationTermsError] = useState('');

  const [draftLoaded, setDraftLoaded] = useState(false);

  // Load draft on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDraft = localStorage.getItem('emahu_delivery_register_draft');
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          if (draft.regCategory !== undefined) setRegCategory(draft.regCategory);
          if (draft.deliveryName !== undefined) setDeliveryName(draft.deliveryName);
          if (draft.ownerName !== undefined) setOwnerName(draft.ownerName);
          if (draft.fleetSize !== undefined) setFleetSize(draft.fleetSize);
          if (draft.contactName !== undefined) setContactName(draft.contactName);
          if (draft.gstNumber !== undefined) setGstNumber(draft.gstNumber);
          if (draft.email !== undefined) setEmail(draft.email);
          if (draft.phoneNumber !== undefined) setPhoneNumber(draft.phoneNumber);
          if (draft.currentCity !== undefined) setCurrentCity(draft.currentCity);
          if (draft.currentArea !== undefined) setCurrentArea(draft.currentArea);
          if (draft.pincode !== undefined) setPincode(draft.pincode);
          if (draft.serviceRadius !== undefined) setServiceRadius(draft.serviceRadius);
          if (draft.vehicleType !== undefined) setVehicleType(draft.vehicleType);
          if (draft.vehicleNumber !== undefined) setVehicleNumber(draft.vehicleNumber);
          if (draft.dispatchNotes !== undefined) setDispatchNotes(draft.dispatchNotes);
          if (draft.serviceAreaState !== undefined) setServiceAreaState(draft.serviceAreaState);
          if (draft.selectedStates !== undefined) setSelectedStates(draft.selectedStates);
          if (draft.address !== undefined) setAddress(draft.address);
          if (draft.deliveryScope !== undefined) setDeliveryScope(draft.deliveryScope);
          if (draft.coveredCities !== undefined) setCoveredCities(draft.coveredCities);
          if (draft.perKmRate !== undefined) setPerKmRate(draft.perKmRate);
        } catch (err) {
          console.error('Failed to load delivery registration draft:', err);
        }
      }
      setDraftLoaded(true);
    }
  }, []);

  // Save delivery registration draft to localStorage
  useEffect(() => {
    if (!draftLoaded) return;
    if (typeof window !== 'undefined') {
      const draft = {
        regCategory,
        deliveryName,
        ownerName,
        fleetSize,
        contactName,
        gstNumber,
        email,
        phoneNumber,
        currentCity,
        currentArea,
        pincode,
        serviceRadius,
        vehicleType,
        vehicleNumber,
        dispatchNotes,
        serviceAreaState,
        selectedStates,
        address,
        deliveryScope,
        coveredCities,
        perKmRate
      };
      localStorage.setItem('emahu_delivery_register_draft', JSON.stringify(draft));
    }
  }, [
    draftLoaded,
    regCategory,
    deliveryName,
    ownerName,
    fleetSize,
    contactName,
    gstNumber,
    email,
    phoneNumber,
    currentCity,
    currentArea,
    pincode,
    serviceRadius,
    vehicleType,
    vehicleNumber,
    dispatchNotes,
    serviceAreaState,
    selectedStates,
    address,
    deliveryScope,
    coveredCities,
    perKmRate
  ]);


  // --- Login States ---
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // --- Dashboard States ---
  const [orders, setOrders] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, earnings: 0 });
  const [dashLoading, setDashLoading] = useState(false);
  const [editProfileMode, setEditProfileMode] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [faqActive, setFaqActive] = useState(null);

  // New features states
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('new'); // 'new', 'active', 'completed', 'earnings', 'profile'

  // Simulation states
  const [simStep, setSimStep] = useState(0);
  const [simCoordinates, setSimCoordinates] = useState(null);

  // Handover confirmation states (OTP)
  const [otpSentCode, setOtpSentCode] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [uploadedPhoto, setUploadedPhoto] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [submittingOtp, setSubmittingOtp] = useState(false);

  // Handover confirmation states (Photo upload)
  const [arrivedPhoto, setArrivedPhoto] = useState('');
  const [submittingPhoto, setSubmittingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoSuccess, setPhotoSuccess] = useState('');

  // Map refs
  const activeOrderMapRef = useRef(null);
  const activeOrderMarkerRef = useRef(null);
  const activeSellerMarkerRef = useRef(null);
  const activeBuyerMarkerRef = useRef(null);
  const activePolylineRef = useRef(null);

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

  // Leaflet CDNs lazy loader
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setLeafletLoaded(true);
      document.head.appendChild(script);
    } else {
      setLeafletLoaded(true);
    }
  }, []);

  // Fetch Dashboard Orders
  const fetchDashboardData = async (userToken) => {
    if (!userToken) return;
    setDashLoading(true);
    try {
      const res = await fetch(`${getDynamicApiUrl()}/api/delivery/my-orders`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      const data = await res.json();
      if (data.success) {
        const jobs = data.orders || [];
        setOrders(jobs);
        setAvailableOrders(data.availableOrders || []);

        // Calculate Stats
        const deliveredJobs = jobs.filter(j => j.deliveryStatus === 'delivered');
        const pendingJobs = jobs.filter(j => j.deliveryStatus !== 'delivered' && j.deliveryStatus !== 'rejected');

        const totalEarnings = deliveredJobs.reduce((acc, curr) => {
          const cost = curr.deliveryCost !== undefined ? curr.deliveryCost : (curr.distanceKm || 0) * 2;
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

    const getSocketUrl = () => {
      return localApiUrl;
    };
    const socket = io(getSocketUrl());
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
  const proceedToLogin = async () => {
    setLoginLoading(true);
    setLoginError('');
    try {
      const data = await loginUser(loginEmail.trim(), loginPassword, 'delivery');
      if (data.user.role !== 'delivery' && data.user.role !== 'admin') {
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

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Please enter both email/phone and password');
      return;
    }

    // Ask for location permission
    if (navigator.geolocation) {
      const getPosLogin = () => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            setLatitude(String(position.coords.latitude.toFixed(6)));
            setLongitude(String(position.coords.longitude.toFixed(6)));
            await proceedToLogin();
          },
          async (error) => {
            console.warn('Geolocation failed during login:', error);
            if (confirm("Location permission is required to access the Delivery Portal. Try again?")) {
              getPosLogin();
            } else {
              setPendingAction('login');
              setShowLocationTermsModal(true);
            }
          }
        );
      };
      getPosLogin();
    } else {
      setPendingAction('login');
      setShowLocationTermsModal(true);
    }
  };

  const handleLogout = () => {
    clearAuthSession('delivery');
    setIsLoggedIn(false);
    setUser(null);
    setToken(null);
    setPortalMode('login');
  };

  const handleDevApprove = async () => {
    if (!user || !user._id) return;
    try {
      const apiBase = getDynamicApiUrl();
      const res = await fetch(`${apiBase}/api/auth/delivery-partners/dev-approve/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (data.success) {
        alert('🎉 Account approved successfully! Reloading...');
        const updatedUser = { ...user, status: 'approved' };
        localStorage.setItem('emahu_delivery_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        window.location.reload();
      } else {
        alert('Failed to approve account: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error updating status via dev approve API');
    }
  };



  const handleSendEmailOtp = async () => {
    if (!phoneNumber.trim()) {
      setErrors((prev) => ({ ...prev, phoneNumber: 'Phone number is required to send verification code' }));
      return;
    }
    setOtpLoading(true);
    setErrors((prev) => ({ ...prev, email: '', phoneNumber: '', general: '' }));
    setDevOtp('');
    try {
      let cleanPhone = phoneNumber.trim();
      if (cleanPhone.startsWith('+91')) {
        cleanPhone = cleanPhone.slice(3);
      } else if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
        cleanPhone = cleanPhone.slice(2);
      }

      const apiBase = getDynamicApiUrl();
      const res = await fetch(`${apiBase}/api/auth/send-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, role: 'delivery' })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP code.');
      }

      setIsEmailOtpSent(true);
      if (data.devOtp) {
        setDevOtp(data.devOtp);
        setErrors((prev) => ({ ...prev, phoneNumber: '' }));
      } else {
        setDevOtp('');
        setErrors((prev) => ({ ...prev, general: '' }));
      }
    } catch (err) {
      console.error('Send OTP Error:', err);

      // Fallback
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setDevOtp(code);
      setIsEmailOtpSent(true);
      setErrors((prev) => ({ ...prev, phoneNumber: err.message || 'Failed to send verification code. Please try again.' }));
    } finally {
      setOtpLoading(false);
    }
  };

  const proceedToRegister = async () => {
    setLoading(true);
    setErrors({});

    try {
      const payload = {
        name: deliveryName,
        email: email.trim() || `${phoneNumber.trim()}@emahu.com`,
        password,
        role: 'delivery',
        phone: phoneNumber.trim(),
        operatingLocation: deliveryScope === 'all_india' ? 'All India' : `${currentArea}, ${coveredCities[0] || currentCity}`,
        category: regCategory,
        vehicleType: regCategory === 'single_two_boy' ? vehicleType : 'other',
        vehicleNumber: regCategory === 'single_two_boy' ? vehicleNumber : `Number of Employees: ${fleetSize}`,
        currentCity: deliveryScope === 'all_india' ? 'All India' : (coveredCities[0] || currentCity),
        currentArea,
        pincode,
        serviceRadius: parseFloat(serviceRadius),
        perItemCharge: parseFloat(perKmRate),
        perKmRate: parseFloat(perKmRate),
        coveredCities: deliveryScope === 'all_india' ? ['All India'] : coveredCities,
        deliveryScope,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        gstNumber: regCategory === 'partner' ? gstNumber.trim() : undefined,
        dispatchNotes: regCategory === 'agency'
          ? `Owner: ${ownerName.trim()}\n${dispatchNotes}`
          : regCategory === 'partner'
            ? `Corporate Contact: ${contactName.trim()}\n${dispatchNotes}`
            : dispatchNotes,
        status: 'pending',
        serviceAreaState: regCategory === 'single_two_boy' ? serviceAreaState : (deliveryScope === 'all_india' ? ['All India'] : selectedStates),
        address
      };

      await registerUser(payload);

      const data = await loginUser(payload.email, payload.password, 'delivery');
      if (data.user.role !== 'delivery') {
        throw new Error('Verification failed.');
      }
      saveAuthSession(data, 'delivery');
      setUser(data.user);
      setToken(data.accessToken);
      setIsLoggedIn(true);
      setPortalMode('dashboard');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('emahu_delivery_register_draft');
      }

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

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp.trim()) {
      setErrors((prev) => ({ ...prev, otp: 'Please enter the verification code' }));
      return;
    }
    setOtpLoading(true);
    setErrors((prev) => ({ ...prev, otp: '', general: '' }));
    try {
      let cleanPhone = phoneNumber.trim();
      if (cleanPhone.startsWith('+91')) {
        cleanPhone = cleanPhone.slice(3);
      } else if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
        cleanPhone = cleanPhone.slice(2);
      }

      const apiBase = getDynamicApiUrl();
      const res = await fetch(`${apiBase}/api/auth/verify-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          otp: emailOtp.trim(),
          email: email
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify OTP.');
      }

      setIsEmailVerified(true);
      setIsEmailOtpSent(false);
      setErrors((prev) => ({ ...prev, general: '' }));
      await proceedToRegister();
    } catch (err) {
      console.error('Verify OTP Error:', err);
      setErrors((prev) => ({ ...prev, otp: err.message || 'Invalid or expired verification code.' }));
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
      if (!vehicleNumber.trim()) newErrors.vehicleNumber = 'Vehicle registration number is required';
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
      if (!fleetSize.trim() || isNaN(fleetSize) || Number(fleetSize) < 50) {
        newErrors.fleetSize = 'Delivery Partners must have at least 50 employees';
      }
    }

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Contact number is required';
    } else if (!isEmailVerified) {
      newErrors.phoneNumber = 'Please verify your mobile number via OTP first';
    }
    if (!password || password.length < 6) newErrors.password = 'Password must be >= 6 characters';
    if (!email.trim()) newErrors.email = 'Email address is required';
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
      if (deliveryScope !== 'all_india') {
        if (!selectedStates || selectedStates.length === 0) {
          newErrors.serviceAreaState = 'At least one service state is required';
        }
        if (!coveredCities || coveredCities.length === 0) {
          newErrors.coveredCities = 'At least one covered city is required';
        } else if (deliveryScope === 'local' && coveredCities.length > 2) {
          newErrors.coveredCities = 'Local partners can select a maximum of 2 cities';
        }
      }
    }
    if (!address.trim()) newErrors.address = 'Street address is required';
    if (!serviceRadius.trim() || isNaN(serviceRadius) || Number(serviceRadius) <= 0) {
      newErrors.serviceRadius = 'Enter a valid radius (KM)';
    }
    if (!perKmRate.trim() || isNaN(perKmRate) || Number(perKmRate) <= 0) {
      newErrors.perKmRate = 'Enter a valid rate per KM';
    }
    if (!dispatchNotes.trim()) newErrors.dispatchNotes = 'Remarks & SLA details are required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateFormWithoutOtp = () => {
    const newErrors = {};

    // Category-specific validations
    if (regCategory === 'single_two_boy') {
      if (!deliveryName.trim()) newErrors.deliveryName = 'Driver Name is required';
      if (!vehicleNumber.trim()) newErrors.vehicleNumber = 'Vehicle registration number is required';
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
      if (!fleetSize.trim() || isNaN(fleetSize) || Number(fleetSize) < 50) {
        newErrors.fleetSize = 'Delivery Partners must have at least 50 employees';
      }
    }

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Contact number is required';
    } else if (!/^\d{10}$/.test(phoneNumber.trim())) {
      newErrors.phoneNumber = 'Enter a valid 10-digit mobile number';
    }
    if (!password || password.length < 6) newErrors.password = 'Password must be >= 6 characters';
    if (!email.trim()) newErrors.email = 'Email address is required';
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
      if (deliveryScope !== 'all_india') {
        if (!selectedStates || selectedStates.length === 0) {
          newErrors.serviceAreaState = 'At least one service state is required';
        }
        if (!coveredCities || coveredCities.length === 0) {
          newErrors.coveredCities = 'At least one covered city is required';
        } else if (deliveryScope === 'local' && coveredCities.length > 2) {
          newErrors.coveredCities = 'Local partners can select a maximum of 2 cities';
        }
      }
    }
    if (!address.trim()) newErrors.address = 'Street address is required';
    if (!serviceRadius.trim() || isNaN(serviceRadius) || Number(serviceRadius) <= 0) {
      newErrors.serviceRadius = 'Enter a valid radius (KM)';
    }
    if (!perKmRate.trim() || isNaN(perKmRate) || Number(perKmRate) <= 0) {
      newErrors.perKmRate = 'Enter a valid rate per KM';
    }
    if (!dispatchNotes.trim()) newErrors.dispatchNotes = 'Remarks & SLA details are required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApproveLocationTerms = async () => {
    if (!termsAccepted) {
      setLocationTermsError('You must accept the terms & conditions to proceed.');
      return;
    }
    if (!manualStreet.trim() || !manualArea.trim() || !manualCity.trim() || !manualState.trim() || !manualPincode.trim()) {
      setLocationTermsError('Please fill in all address fields.');
      return;
    }

    setLocationTermsError('');
    setShowLocationTermsModal(false);

    // Save manual address values to state
    setAddress(manualStreet.trim());
    setCurrentArea(manualArea.trim());
    setCurrentCity(manualCity.trim());
    setServiceAreaState(manualState.trim());
    setPincode(manualPincode.trim());

    if (manualCity.toLowerCase() === 'ahmedabad') {
      setLatitude('23.0225');
      setLongitude('72.5714');
    } else if (manualCity.toLowerCase() === 'surat') {
      setLatitude('21.1702');
      setLongitude('72.8311');
    } else {
      setLatitude('23.0225');
      setLongitude('72.5714');
    }

    if (pendingAction === 'login') {
      await proceedToLogin();
    } else if (pendingAction === 'register') {
      if (!isEmailVerified) {
        await handleSendEmailOtp();
      } else {
        await proceedToRegister();
      }
    }
  };

  const handleRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateFormWithoutOtp()) return;

    // Ask for location permission
    if (navigator.geolocation) {
      const getPosRegister = () => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            setLatitude(String(position.coords.latitude.toFixed(6)));
            setLongitude(String(position.coords.longitude.toFixed(6)));
            if (!isEmailVerified) {
              await handleSendEmailOtp();
            } else {
              await proceedToRegister();
            }
          },
          async (error) => {
            console.warn('Geolocation failed during register:', error);
            if (confirm("Location permission is required to onboard as a Delivery Partner. Try again?")) {
              getPosRegister();
            } else {
              setPendingAction('register');
              setShowLocationTermsModal(true);
            }
          }
        );
      };
      getPosRegister();
    } else {
      setPendingAction('register');
      setShowLocationTermsModal(true);
    }
  };

  // --- Action Handlers ---
  const handleUpdateJobStatus = async (orderId, newStatus) => {
    if (!token) return;
    try {
      const res = await fetch(`${getDynamicApiUrl()}/api/delivery/status`, {
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
      const res = await fetch(`${getDynamicApiUrl()}/api/delivery/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentCity: deliveryScope === 'all_india' ? 'All India' : (coveredCities[0] || currentCity),
          currentArea,
          pincode,
          serviceRadius: parseFloat(serviceRadius),
          perItemCharge: parseFloat(perKmRate),
          perKmRate: parseFloat(perKmRate),
          coveredCities: deliveryScope === 'all_india' ? ['All India'] : coveredCities,
          deliveryScope,
          vehicleType,
          vehicleNumber,
          isActivePartner: user?.isActivePartner,
          serviceAreaState: user?.category === 'single_two_boy' ? serviceAreaState : (deliveryScope === 'all_india' ? ['All India'] : selectedStates),
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
      const res = await fetch(`${getDynamicApiUrl()}/api/delivery/profile`, {
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
        email: email.trim() || `${phoneNumber.trim()}@emahu.com`,
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
        status: 'pending', // Registration status starts as pending for verification flow
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
                onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
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

            {devOtp && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '10px', borderRadius: '8px', textAlign: 'center', marginTop: '8px' }}>
                <div style={{ fontSize: '0.75rem', marginBottom: '5px', opacity: 0.85 }}>📧 Code also shown here (check spam too):</div>
                <div
                  style={{ letterSpacing: '6px', fontSize: '1.4rem', fontWeight: '800', color: '#fff', background: 'rgba(0,0,0,0.25)', padding: '5px 12px', borderRadius: '6px', display: 'inline-block', cursor: 'pointer', userSelect: 'all' }}
                  onClick={() => setEmailOtp(devOtp)}
                  title="Click to auto-fill"
                >
                  {devOtp}
                </div>
                <div style={{ fontSize: '0.7rem', opacity: 0.65, marginTop: '4px' }}>👆 Click to auto-fill</div>
              </div>
            )}
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

  // Send live GPS tracking location updates to server
  const sendLiveLocationUpdate = async (lat, lon, orderId) => {
    if (!token) return;
    try {
      await fetch(`${getDynamicApiUrl()}/api/delivery/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon)
        })
      });
      // Synchronize state locally
      setUser(prev => prev ? { ...prev, latitude: parseFloat(lat), longitude: parseFloat(lon) } : null);
    } catch (err) {
      console.error('Failed to update live coordinates:', err);
    }
  };

  const updateDriverPosition = async (lat, lon, orderId) => {
    setSimCoordinates({ latitude: lat, longitude: lon });
    await sendLiveLocationUpdate(lat, lon, orderId);
  };

  // Cooldown countdown for resending verification OTP
  useEffect(() => {
    if (otpResendCooldown > 0) {
      const timer = setTimeout(() => setOtpResendCooldown(otpResendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpResendCooldown]);

  // Handover OTP method handlers
  const handleSendHandoverOtp = async (orderId) => {
    if (!token) return;
    setOtpError('');
    setOtpSuccess('');

    const pLat = simCoordinates?.latitude || user?.latitude;
    const pLon = simCoordinates?.longitude || user?.longitude;
    if (!pLat || !pLon) {
      setOtpError('Location error: Could not resolve your current GPS coordinates. Please click Detect Location first.');
      return;
    }

    const bLat = activeOrder?.buyerLocation?.latitude;
    const bLon = activeOrder?.buyerLocation?.longitude;
    if (bLat !== undefined && bLon !== undefined) {
      const dist = getHaversineDistance(Number(pLat), Number(pLon), Number(bLat), Number(bLon));
      if (dist > 0.1) {
        setOtpError(`GPS Proximity Verification Failed. You are ${Math.round(dist * 1000)} meters away. You must be within 100m to send OTP.`);
        return;
      }
    }

    try {
      const res = await fetch(`${getDynamicApiUrl()}/api/delivery/otp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId,
          latitude: parseFloat(pLat),
          longitude: parseFloat(pLon)
        })
      });
      const data = await res.json();
      if (data.success) {
        setOtpSentCode(true);
        setOtpResendCooldown(60);
        setOtpSuccess('Security OTP code has been sent to the buyer email.');
      } else {
        setOtpError(data.error || 'Failed to send OTP code.');
      }
    } catch (err) {
      console.error(err);
      setOtpError('Network error requesting OTP.');
    }
  };

  const handleVerifyHandoverOtp = async (orderId) => {
    if (!token) return;
    if (!enteredOtp.trim()) {
      setOtpError('Please enter the 6-digit OTP code.');
      return;
    }
    const finalPhoto = uploadedPhoto || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80';

    setOtpError('');
    setOtpSuccess('');
    setSubmittingOtp(true);

    const pLat = simCoordinates?.latitude || user?.latitude;
    const pLon = simCoordinates?.longitude || user?.longitude;

    const bLat = activeOrder?.buyerLocation?.latitude;
    const bLon = activeOrder?.buyerLocation?.longitude;
    if (bLat !== undefined && bLon !== undefined) {
      const dist = getHaversineDistance(Number(pLat), Number(pLon), Number(bLat), Number(bLon));
      if (dist > 0.1) {
        setOtpError(`GPS Proximity Verification Failed. You are ${Math.round(dist * 1000)} meters away. You must be within 100m to verify OTP.`);
        setSubmittingOtp(false);
        return;
      }
    }

    try {
      const res = await fetch(`${getDynamicApiUrl()}/api/delivery/otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId,
          otp: enteredOtp.trim(),
          deliveryPhoto: finalPhoto,
          latitude: parseFloat(pLat),
          longitude: parseFloat(pLon)
        })
      });
      const data = await res.json();
      if (data.success) {
        setOtpSuccess('Delivery confirmed and verified successfully!');
        setEnteredOtp('');
        setOtpSentCode(false);
        fetchDashboardData(token);
      } else {
        setOtpError(data.error || 'Invalid OTP code.');
      }
    } catch (err) {
      console.error(err);
      setOtpError('Network error verifying OTP.');
    } finally {
      setSubmittingOtp(false);
    }
  };

  // Handover arrival photo method handlers
  const handleUploadArrivalPhoto = async (orderId) => {
    if (!token) return;
    const finalPhoto = arrivedPhoto || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80';

    setPhotoError('');
    setPhotoSuccess('');
    setSubmittingPhoto(true);

    const pLat = simCoordinates?.latitude || user?.latitude;
    const pLon = simCoordinates?.longitude || user?.longitude;
    if (!pLat || !pLon) {
      setPhotoError('Location error: Could not resolve your current GPS coordinates. Please click Detect Location first.');
      setSubmittingPhoto(false);
      return;
    }

    const bLat = activeOrder?.buyerLocation?.latitude;
    const bLon = activeOrder?.buyerLocation?.longitude;
    if (bLat !== undefined && bLon !== undefined) {
      const dist = getHaversineDistance(Number(pLat), Number(pLon), Number(bLat), Number(bLon));
      if (dist > 0.1) {
        setPhotoError(`GPS Proximity Verification Failed. You are ${Math.round(dist * 1000)} meters away. You must be within 100m to upload arrival photo.`);
        setSubmittingPhoto(false);
        return;
      }
    }

    try {
      const res = await fetch(`${getDynamicApiUrl()}/api/delivery/photo/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId,
          deliveryPhoto: finalPhoto,
          latitude: parseFloat(pLat),
          longitude: parseFloat(pLon)
        })
      });
      const data = await res.json();
      if (data.success) {
        setPhotoSuccess('Arrival photo uploaded successfully! Waiting for buyer confirmation.');
        fetchDashboardData(token);
      } else {
        setPhotoError(data.error || 'Failed to upload photo.');
      }
    } catch (err) {
      console.error(err);
      setPhotoError('Network error uploading arrival photo.');
    } finally {
      setSubmittingPhoto(false);
    }
  };

  // Courier path routing simulation handlers
  const handleAdvanceSimulation = (order) => {
    if (!order) return;
    const nextStep = simStep + 1;
    if (nextStep > 5) return;

    setSimStep(nextStep);

    const sLat = order.sellerLocation?.latitude || 23.0225;
    const sLon = order.sellerLocation?.longitude || 72.5714;
    const bLat = order.buyerLocation?.latitude || 23.0225;
    const bLon = order.buyerLocation?.longitude || 72.5714;

    const t = nextStep / 5;
    const lat = sLat + (bLat - sLat) * t;
    const lon = sLon + (bLon - sLon) * t;

    updateDriverPosition(lat.toFixed(6), lon.toFixed(6), order.orderId);
  };

  const handleResetSimulation = (order) => {
    if (!order) return;
    setSimStep(0);
    const sLat = order.sellerLocation?.latitude || 23.0225;
    const sLon = order.sellerLocation?.longitude || 72.5714;
    updateDriverPosition(sLat.toFixed(6), sLon.toFixed(6), order.orderId);
  };

  // Auto-GPS position polling (every 8s) for active orders
  useEffect(() => {
    if (!isLoggedIn || !token || activeTab !== 'active') return;
    const activeOrder = orders.find(o => ['accepted', 'picked_up', 'in_transit', 'out_for_delivery', 'arrived'].includes(o.deliveryStatus));
    if (!activeOrder) return;

    const interval = setInterval(() => {
      if (navigator.geolocation && !simCoordinates) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude.toFixed(6);
            const lon = pos.coords.longitude.toFixed(6);
            sendLiveLocationUpdate(lat, lon, activeOrder.orderId);
          },
          (err) => console.warn('Auto-GPS watch failed:', err),
          { enableHighAccuracy: true }
        );
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [isLoggedIn, token, activeTab, orders, simCoordinates]);

  // Clean active Leaflet map instances on tab changes
  useEffect(() => {
    return () => {
      if (activeOrderMapRef.current) {
        activeOrderMapRef.current.remove();
        activeOrderMapRef.current = null;
      }
    };
  }, [activeTab]);

  // Active delivery Leaflet map drawing effect
  const activeOrder = orders.find(o => ['accepted', 'picked_up', 'in_transit', 'out_for_delivery', 'arrived'].includes(o.deliveryStatus));

  const pLat = simCoordinates?.latitude || user?.latitude;
  const pLon = simCoordinates?.longitude || user?.longitude;
  const bLat = activeOrder?.buyerLocation?.latitude;
  const bLon = activeOrder?.buyerLocation?.longitude;

  let isTooFar = false;
  let distanceToBuyerMeters = 0;
  if (activeOrder && activeOrder.deliveryStatus === 'arrived') {
    if (pLat && pLon && bLat && bLon) {
      const distKm = getHaversineDistance(Number(pLat), Number(pLon), Number(bLat), Number(bLon));
      distanceToBuyerMeters = Math.round(distKm * 1000);
      isTooFar = distKm > 0.1; // 100m
    } else {
      isTooFar = true; // Block if we don't have location
    }
  }

  useEffect(() => {
    if (!leafletLoaded || typeof window === 'undefined' || !window.L || !activeOrder || activeTab !== 'active') return;

    const mapId = 'active-delivery-map';
    const container = document.getElementById(mapId);
    if (!container) return;

    const sLat = activeOrder.sellerLocation?.latitude || 23.0225;
    const sLon = activeOrder.sellerLocation?.longitude || 72.5714;
    const bLat = activeOrder.buyerLocation?.latitude || 23.0225;
    const bLon = activeOrder.buyerLocation?.longitude || 72.5714;

    const pLat = parseFloat(simCoordinates?.latitude || user?.latitude || sLat);
    const pLon = parseFloat(simCoordinates?.longitude || user?.longitude || sLon);

    if (!activeOrderMapRef.current) {
      activeOrderMapRef.current = window.L.map(mapId).setView([pLat, pLon], 13);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(activeOrderMapRef.current);

      const sellerIcon = window.L.divIcon({
        html: '<div style="background-color:#dd6b20; width:14px; height:14px; border-radius:50%; border:3px solid white; box-shadow:0 0 5px rgba(0,0,0,0.3)"></div>',
        className: 'custom-div-icon',
        iconSize: [14, 14]
      });

      const buyerIcon = window.L.divIcon({
        html: '<div style="background-color:#e53e3e; width:14px; height:14px; border-radius:50%; border:3px solid white; box-shadow:0 0 5px rgba(0,0,0,0.3)"></div>',
        className: 'custom-div-icon',
        iconSize: [14, 14]
      });

      const partnerIcon = window.L.divIcon({
        html: '<div style="background-color:#319795; width:18px; height:18px; border-radius:50%; border:3px solid white; box-shadow:0 0 7px rgba(0,0,0,0.4)"></div>',
        className: 'custom-div-icon',
        iconSize: [18, 18]
      });

      activeSellerMarkerRef.current = window.L.marker([sLat, sLon], { icon: sellerIcon })
        .addTo(activeOrderMapRef.current)
        .bindPopup(`<strong>Merchant Pickup</strong><br/>${activeOrder.sellerLocation?.address || 'Pickup Point'}`);

      activeBuyerMarkerRef.current = window.L.marker([bLat, bLon], { icon: buyerIcon })
        .addTo(activeOrderMapRef.current)
        .bindPopup(`<strong>Customer Dropoff</strong><br/>${activeOrder.deliveryAddress?.address || 'Drop-off Point'}`);

      activeOrderMarkerRef.current = window.L.marker([pLat, pLon], { icon: partnerIcon })
        .addTo(activeOrderMapRef.current)
        .bindPopup(`<strong>Your GPS Location</strong>`);

      const isBeforePickup = activeOrder.deliveryStatus === 'accepted';
      const destLat = isBeforePickup ? sLat : bLat;
      const destLon = isBeforePickup ? sLon : bLon;

      activePolylineRef.current = window.L.polyline([[pLat, pLon], [destLat, destLon]], { color: '#319795', weight: 4, dashArray: '5, 8' })
        .addTo(activeOrderMapRef.current);

      activeOrderMapRef.current.fitBounds([[pLat, pLon], [destLat, destLon]], { padding: [40, 40] });
    } else {
      if (activeOrderMarkerRef.current) {
        activeOrderMarkerRef.current.setLatLng([pLat, pLon]);
      }
      const isBeforePickup = activeOrder.deliveryStatus === 'accepted';
      const destLat = isBeforePickup ? sLat : bLat;
      const destLon = isBeforePickup ? sLon : bLon;

      if (activePolylineRef.current) {
        activePolylineRef.current.setLatLngs([[pLat, pLon], [destLat, destLon]]);
      }
      activeOrderMapRef.current.fitBounds([[pLat, pLon], [destLat, destLon]], { padding: [40, 40] });
    }
  }, [leafletLoaded, activeOrder?._id, simCoordinates, user?.latitude, user?.longitude, activeTab]);

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
              <rect width="32" height="32" rx="10" fill="#4169e1" />
              <path d="M8 12h16M8 16h12M8 20h14" stroke="white" strokeWidth="3" strokeLinecap="round" />
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
                <button
                  onClick={() => setPortalMode(portalMode === 'register' ? 'login' : 'register')}
                  className="lp-nav-link-btn active"
                  style={{
                    background: 'linear-gradient(135deg, #319795, #2c7a7b)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    boxShadow: '0 4px 6px rgba(49, 151, 149, 0.2)'
                  }}
                >
                  {portalMode === 'register' ? '🔑 Switch to Login' : '📝 Switch to Register'}
                </button>
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
              <div className="category-tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px', background: '#f1f5f9', padding: '6px', borderRadius: '12px' }}>
                <button
                  type="button"
                  onClick={() => setRegCategory('single_two_boy')}
                  style={{
                    flex: 1,
                    minWidth: '150px',
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
                    flex: 2,
                    minWidth: '220px',
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
                  Delivery Agency / Company Area Head / Company City Head / Company State Head
                </button>
                <button
                  type="button"
                  onClick={() => setRegCategory('partner')}
                  style={{
                    flex: 1,
                    minWidth: '150px',
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

                  {/* Rectangle 1: Your Information */}
                  <div style={{
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: '16px',
                    padding: '24px',
                    background: '#ffffff',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                    marginBottom: '28px'
                  }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--slate-text)', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      👤 Your Information
                    </h3>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label" htmlFor="deliveryName">
                          {regCategory === 'single_two_boy' ? 'Driver Name' :
                            regCategory === 'agency' ? 'Agency / Area / City / State Head Name' : 'Company Name'}
                        </label>
                        <input
                          type="text"
                          id="deliveryName"
                          className={`form-input ${errors.deliveryName ? 'form-input--error' : ''}`}
                          placeholder={
                            regCategory === 'single_two_boy' ? 'e.g. Rahul Sharma' :
                              regCategory === 'agency' ? 'e.g. Express Agency / Area Head' : 'e.g. EmahuXpress Enterprise'
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
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            id="phoneNumber"
                            className={`form-input ${errors.phoneNumber ? 'form-input--error' : ''}`}
                            placeholder="e.g. 9898989898"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            readOnly={isEmailVerified}
                            required
                            style={{ flex: 1 }}
                          />
                          {!isEmailVerified && (
                            <button
                              type="button"
                              className="form-btn"
                              style={{ padding: '0 12px', height: '40px', fontSize: '0.78rem', background: '#319795', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', width: 'auto', margin: 0 }}
                              onClick={handleSendEmailOtp}
                              disabled={otpLoading}
                            >
                              {otpLoading ? '...' : isEmailOtpSent ? 'Resend' : 'Send Code'}
                            </button>
                          )}
                        </div>
                        {errors.phoneNumber && <span className="form-error">{errors.phoneNumber}</span>}

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
                                onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
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

                            {devOtp && (
                              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '10px', borderRadius: '8px', textAlign: 'center', marginTop: '8px' }}>
                                <div style={{ fontSize: '0.75rem', marginBottom: '5px', opacity: 0.85 }}>📱 Code also shown here:</div>
                                <div
                                  style={{ letterSpacing: '6px', fontSize: '1.4rem', fontWeight: '800', color: '#fff', background: 'rgba(0,0,0,0.25)', padding: '5px 12px', borderRadius: '6px', display: 'inline-block', cursor: 'pointer', userSelect: 'all' }}
                                  onClick={() => setEmailOtp(devOtp)}
                                  title="Click to auto-fill"
                                >
                                  {devOtp}
                                </div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.65, marginTop: '4px' }}>👆 Click to auto-fill</div>
                              </div>
                            )}
                          </div>
                        )}
                        {isEmailVerified && (
                          <div style={{ color: '#10b981', fontSize: '0.75rem', marginTop: '6px', fontWeight: 'bold' }}>
                            ✓ Mobile Number Verified Successfully
                          </div>
                        )}
                      </div>

                      {/* Fleet Size (Agency & Partner) */}
                      {(regCategory === 'agency' || regCategory === 'partner') && (
                        <div className="form-group">
                          <label className="form-label" htmlFor="fleetSize">
                            {regCategory === 'partner' ? 'Number of Employees (Min 50+ Required)' : 'Number of Employees'}
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            id="fleetSize"
                            className={`form-input ${errors.fleetSize ? 'form-input--error' : ''}`}
                            placeholder={regCategory === 'partner' ? "e.g. 75" : "e.g. 15"}
                            value={fleetSize}
                            onChange={(e) => setFleetSize(e.target.value.replace(/\D/g, ''))}
                          />
                          {errors.fleetSize && <span className="form-error">{errors.fleetSize}</span>}
                        </div>
                      )}

                      <div className="form-group">
                        <label className="form-label" htmlFor="password">Create a Password</label>
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
                    </div>
                  </div>

                  {/* Rectangle 2: Service Information */}
                  <div style={{
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: '16px',
                    padding: '24px',
                    background: '#ffffff',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                    marginBottom: '28px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--slate-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ⚙️ Service Information
                      </h3>

                      {regCategory === 'single_two_boy' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            id="sameAsHq"
                            checked={sameAsHq}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSameAsHq(checked);
                              if (checked) {
                                const pinMatch = address.match(/\b\d{6}\b/);
                                if (pinMatch) setPincode(pinMatch[0]);
                                setCurrentArea(address || '');
                              }
                            }}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <label htmlFor="sameAsHq" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', cursor: 'pointer', userSelect: 'none' }}>
                            Same as HQ Address
                          </label>
                        </div>
                      )}
                    </div>

                    <div className="form-grid">
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
                          <option value="all_india">All India (Nationwide) Delivery Partner</option>
                        </select>
                      </div>

                      {/* State Selector */}
                      {deliveryScope !== 'all_india' && (
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
                      )}

                      {/* City Multi-Selector */}
                      {deliveryScope !== 'all_india' && (
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
                      )}

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
                        <label className="form-label" htmlFor="serviceRadius">
                          {regCategory === 'single_two_boy' ? 'Service Radius (KM)' :
                            regCategory === 'agency' ? 'Max Service Radius (KM)' : 'Coverage Radius (KM)'}
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          id="serviceRadius"
                          className={`form-input ${errors.serviceRadius ? 'form-input--error' : ''}`}
                          placeholder="e.g. 20"
                          value={serviceRadius}
                          onChange={(e) => setServiceRadius(e.target.value.replace(/\D/g, ''))}
                        />
                        {errors.serviceRadius && <span className="form-error">{errors.serviceRadius}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="perKmRate">Rate per Kilometer (₹)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          id="perKmRate"
                          className={`form-input ${errors.perKmRate ? 'form-input--error' : ''}`}
                          placeholder="e.g. 5"
                          value={perKmRate}
                          onChange={(e) => setPerKmRate(e.target.value.replace(/\D/g, ''))}
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
                          className={`form-textarea ${errors.dispatchNotes ? 'form-input--error' : ''}`}
                          placeholder={
                            regCategory === 'single_two_boy' ? 'e.g. Available for night deliveries, personal bike...' :
                              regCategory === 'agency' ? 'e.g. Fleet of 10 bikes and 5 vans, standard billing...' :
                                'e.g. SLA guaranteed within 4 hours, regional cargo trucks available...'
                          }
                          value={dispatchNotes}
                          onChange={(e) => setDispatchNotes(e.target.value)}
                          disabled={loading}
                        />
                        {errors.dispatchNotes && <span className="form-error">{errors.dispatchNotes}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions Checkbox */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '20px 0 16px 0', padding: '0 4px' }}>
                    <input
                      id="agree-portal-terms-register"
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      disabled={!hasOpenedTerms}
                      style={{ width: '16px', height: '16px', marginTop: '2px', cursor: hasOpenedTerms ? 'pointer' : 'not-allowed' }}
                    />
                    <label htmlFor="agree-portal-terms-register" style={{ fontSize: '0.78rem', color: '#475569', lineHeight: '1.4', cursor: hasOpenedTerms ? 'pointer' : 'not-allowed', userSelect: 'none' }}>
                      <span style={{ color: hasOpenedTerms ? '#475569' : '#94a3b8' }}>
                        I agree to the <a href="#" onClick={(e) => { e.preventDefault(); setHasOpenedTerms(true); alert("EMAHU Delivery Partner Agreement & Liability Disclaimer:\n\n1. INDEPENDENT CONTRACTOR: You operate as a completely independent delivery rider/agency. You are not an employee, agent, or representative of EMAHU, and must provide your own vehicle, insurance, and licensing.\n2. NO LIABILITY: EMAHU is not liable for road accidents, vehicle damage, traffic violations, passenger/cargo loss, or injuries occurred during dispatches.\n3. EmahuSECURE DISPATCH: You must only release delivery states after verifying receipt of the buyer's 6-digit OTP code on the app. Confirming delivery without OTP or entering fake OTP codes will result in account bans, legal prosecution for theft, and withholding of commission settlements.\n4. INDEMNITY: You agree to defend and hold harmless EMAHU from all liabilities, road claims, or legal actions arising from your logistics operations."); }} style={{ color: '#319795', textDecoration: 'underline', fontWeight: 'bold' }}>Terms & Partner Conditions</a> of EMAHU Marketplace.
                      </span>
                      {!hasOpenedTerms && (
                        <span style={{ color: '#dc2626', display: 'block', fontSize: '0.72rem', marginTop: '4px', fontWeight: '600' }}>
                          ⚠️ Please click and read the Terms link first to unlock this checkbox.
                        </span>
                      )}
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="form-btn"
                    disabled={loading || !agreeTerms}
                    style={!agreeTerms ? { opacity: 0.5, cursor: 'not-allowed', background: '#4a5568' } : {}}
                  >
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

      {/* --- LOGIN MODE --- */}
      {portalMode === 'login' && (
        <section className="lp-form-section" style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div className="lp-section-container" style={{ maxWidth: '440px', width: '100%', margin: '0 auto' }}>
            <div className="section-header" style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 className="section-title">Delivery Partner Login</h2>
              <p className="section-subtitle">Access your dispatch dashboard to accept and fulfill orders.</p>
            </div>

            <div className="form-card-wrapper" style={{ padding: '32px', background: '#ffffff', border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)' }}>
              <form className="lp-form" onSubmit={handleLoginSubmit}>
                {loginError && (
                  <div className="form-alert-error" style={{ marginBottom: '16px', padding: '12px', background: 'rgba(229, 62, 62, 0.2)', border: '1px solid #e53e3e', color: '#c53030', borderRadius: '8px', fontSize: '0.85rem' }}>
                    ⚠️ {loginError}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label" htmlFor="loginEmail" style={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Email Address or Mobile Number</label>
                  <input
                    type="text"
                    id="loginEmail"
                    className="form-input"
                    placeholder="e.g. 9898989898 or partner@emahu.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    style={{ width: '100%', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', padding: '10px 12px', borderRadius: '8px' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label" htmlFor="loginPassword" style={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Password</label>
                  <input
                    type="password"
                    id="loginPassword"
                    className="form-input"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    style={{ width: '100%', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', padding: '10px 12px', borderRadius: '8px' }}
                  />
                </div>

                {/* Terms & Conditions Checkbox */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '12px 0 16px 0', padding: '0 2px' }}>
                  <input
                    id="agree-portal-terms-login"
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    disabled={!hasOpenedTermsLogin}
                    style={{ width: '16px', height: '16px', marginTop: '2px', cursor: hasOpenedTermsLogin ? 'pointer' : 'not-allowed' }}
                  />
                  <label htmlFor="agree-portal-terms-login" style={{ fontSize: '0.78rem', color: '#475569', lineHeight: '1.4', cursor: hasOpenedTermsLogin ? 'pointer' : 'not-allowed', userSelect: 'none' }}>
                    <span style={{ color: hasOpenedTermsLogin ? '#475569' : '#94a3b8' }}>
                      I agree to the <a href="#" onClick={(e) => { e.preventDefault(); setHasOpenedTermsLogin(true); alert("EMAHU Delivery Partner Agreement & Liability Disclaimer:\n\n1. INDEPENDENT CONTRACTOR: You operate as a completely independent delivery rider/agency. You are not an employee, agent, or representative of EMAHU, and must provide your own vehicle, insurance, and licensing.\n2. NO LIABILITY: EMAHU is not liable for road accidents, vehicle damage, traffic violations, passenger/cargo loss, or injuries occurred during dispatches.\n3. EmahuSECURE DISPATCH: You must only release delivery states after verifying receipt of the buyer's 6-digit OTP code on the app. Confirming delivery without OTP or entering fake OTP codes will result in account bans, legal prosecution for theft, and withholding of commission settlements.\n4. INDEMNITY: You agree to defend and hold harmless EMAHU from all liabilities, road claims, or legal actions arising from your logistics operations."); }} style={{ color: '#319795', textDecoration: 'underline', fontWeight: 'bold' }}>Terms & Partner Conditions</a> of EMAHU Marketplace.
                    </span>
                    {!hasOpenedTermsLogin && (
                      <span style={{ color: '#e53e3e', display: 'block', fontSize: '0.72rem', marginTop: '4px', fontWeight: '600' }}>
                        ⚠️ Please click and read the Terms link first to unlock this checkbox.
                      </span>
                    )}
                  </label>
                </div>

                <button
                  type="submit"
                  className="form-btn"
                  disabled={loginLoading || !agreeTerms}
                  style={{ width: '100%', background: '#319795', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', ...(!agreeTerms ? { opacity: 0.5, cursor: 'not-allowed', background: '#94a3b8' } : {}) }}
                >
                  {loginLoading ? 'Logging in...' : 'Sign In to Dashboard'}
                </button>

                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                  <div>
                    New partner?{' '}
                    <button
                      type="button"
                      onClick={() => setPortalMode('register')}
                      style={{ background: 'none', border: 'none', color: '#319795', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
                    >
                      Register here
                    </button>
                  </div>
                  <div>
                    <Link
                      href="/forgot-password?role=delivery"
                      style={{ color: '#475569', textDecoration: 'none', fontSize: '0.82rem', fontWeight: '600' }}
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* --- DASHBOARD MODE --- */}
      {portalMode === 'dashboard' && (
        <section className="lp-section-container" style={{ padding: '40px 24px' }}>

          {/* Header Stats Grid - Only visible for approved partners */}
          {user?.status === 'approved' && (
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>


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
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>At rate ₹2/KM</span>
              </div>
            </div>
          )}

          {/* Dashboard Tab Buttons - Only visible for approved partners */}
          {user?.status === 'approved' && (
            <div className="dash-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '24px', backgroundColor: '#e2e8f0', padding: '6px', borderRadius: '12px' }}>
              <button type="button" onClick={() => { setActiveTab('new'); setEditProfileMode(false); }} className={`dash-tab-btn ${activeTab === 'new' ? 'dash-tab-btn--active' : ''}`} style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'new' ? '#ffffff' : 'transparent', color: activeTab === 'new' ? '#319795' : '#475569', boxShadow: activeTab === 'new' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s ease' }}>
                🆕 New Jobs ({availableOrders.length})
              </button>
              <button type="button" onClick={() => { setActiveTab('active'); setEditProfileMode(false); }} className={`dash-tab-btn ${activeTab === 'active' ? 'dash-tab-btn--active' : ''}`} style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'active' ? '#ffffff' : 'transparent', color: activeTab === 'active' ? '#319795' : '#475569', boxShadow: activeTab === 'active' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s ease' }}>
                ⚡ Active Job {activeOrder ? '⏳' : ''}
              </button>
              <button type="button" onClick={() => { setActiveTab('completed'); setEditProfileMode(false); }} className={`dash-tab-btn ${activeTab === 'completed' ? 'dash-tab-btn--active' : ''}`} style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'completed' ? '#ffffff' : 'transparent', color: activeTab === 'completed' ? '#319795' : '#475569', boxShadow: activeTab === 'completed' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s ease' }}>
                ✅ Completed
              </button>
              <button type="button" onClick={() => { setActiveTab('earnings'); setEditProfileMode(false); }} className={`dash-tab-btn ${activeTab === 'earnings' ? 'dash-tab-btn--active' : ''}`} style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'earnings' ? '#ffffff' : 'transparent', color: activeTab === 'earnings' ? '#319795' : '#475569', boxShadow: activeTab === 'earnings' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s ease' }}>
                📊 Earnings
              </button>
            </div>
          )}

          {/* Verification Status Card - Visible if not approved and not editing profile */}
          {user?.status !== 'approved' && !editProfileMode && (
            <div style={{ maxWidth: '800px', margin: '0 auto 32px' }}>
              <div className="form-card-wrapper" style={{ padding: '40px', background: '#ffffff', border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)', textAlign: 'center' }}>
                {user?.status === 'rejected' ? (
                  <>
                    <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '16px' }}>❌</span>
                    <h2 style={{ fontSize: '1.6rem', color: '#ef4444', fontWeight: '800', marginBottom: '12px' }}>Application Rejected</h2>
                    <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '20px' }}>
                      Your logistics partner application has been rejected by the EMAHU admin team.
                    </p>
                    {user?.verificationFeedback && (
                      <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'left', marginBottom: '24px' }}>
                        <strong>Admin Reason / Feedback:</strong> {user.verificationFeedback}
                      </div>
                    )}
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                      Please review the feedback. You can update your details by clicking the <strong>Edit Fleet Profile</strong> button in the navigation bar, or contact support for help.
                    </p>
                  </>
                ) : user?.status === 'more_info_requested' ? (
                  <>
                    <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '16px' }}>⚠️</span>
                    <h2 style={{ fontSize: '1.6rem', color: '#dd6b20', fontWeight: '800', marginBottom: '12px' }}>More Information Requested</h2>
                    <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '20px' }}>
                      Our compliance team has reviewed your documents and requires additional information before approving your profile.
                    </p>
                    {user?.verificationFeedback && (
                      <div style={{ padding: '16px', background: '#fffaf0', border: '1px solid #fbd38d', color: '#c05621', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'left', marginBottom: '24px' }}>
                        <strong>Compliance Request / Feedback:</strong> {user.verificationFeedback}
                      </div>
                    )}
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                      Please click the <strong>Edit Fleet Profile</strong> button in the navigation bar to update your settings and resubmit your application.
                    </p>
                  </>
                ) : (
                  <>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(49, 151, 149, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid rgba(49, 151, 149, 0.2)' }}>
                      <span style={{ fontSize: '2rem' }}>⏳</span>
                    </div>
                    <h2 style={{ fontSize: '1.6rem', color: '#319795', fontWeight: '800', marginBottom: '12px' }}>Account Pending Verification</h2>
                    <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 auto 16px', maxWidth: '560px' }}>
                      Thank you for onboarding with Emahu Logistics Network! Your driver credentials, covered cities, and fleet rates are currently undergoing verification by our compliance administrators.
                    </p>
                    <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 auto 24px', maxWidth: '560px' }}>
                      Once approved, your availability toggle will be unlocked and you will be automatically assigned pending shipments in your service coverage areas.
                    </p>
                    <div style={{ padding: '12px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', color: '#475569', display: 'inline-block' }}>
                      Registered Name: <strong>{user?.name}</strong> &nbsp;|&nbsp; City: <strong>{user?.currentCity}</strong> &nbsp;|&nbsp; Category: <strong>{user?.category === 'single_two_boy' ? 'Single/Two Boy' : user?.category === 'agency' ? 'Agency / Area / City / State Head' : 'Enterprise Partner'}</strong>
                    </div>

                    <div style={{ marginTop: '24px' }}>
                      <button
                        type="button"
                        onClick={handleDevApprove}
                        style={{
                          background: 'linear-gradient(135deg, #319795 0%, #2c7a7b 100%)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(49, 151, 149, 0.2)'
                        }}
                      >
                        ⚡ Simulator: Approve Application (Dev Mode)
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

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
                      <option value="all_india">All India (Nationwide) Delivery Partner</option>
                    </select>
                  </div>

                  {/* State Selector */}
                  {deliveryScope !== 'all_india' && (
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
                  )}

                  {/* City Selector */}
                  {deliveryScope !== 'all_india' && (
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
                  )}

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
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-input"
                      value={serviceRadius}
                      onChange={(e) => setServiceRadius(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rate per Kilometer (₹)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-input"
                      value={perKmRate}
                      onChange={(e) => setPerKmRate(e.target.value.replace(/\D/g, ''))}
                    />
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

          {/* TAB: NEW JOBS */}
          {activeTab === 'new' && !editProfileMode && user?.status === 'approved' && (() => {
            const assignedRequests = orders.filter(o => o.deliveryStatus === 'assigned' || o.assignmentStatus === 'assigned');
            const activeOrder = orders.find(o => ['accepted', 'picked_up', 'in_transit', 'out_for_delivery', 'arrived'].includes(o.deliveryStatus));
            return (
              <div className="form-card-wrapper" style={{ padding: '32px' }}>
                {activeOrder && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1.5px dashed rgba(239, 68, 68, 0.3)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    marginBottom: '20px',
                    fontSize: '0.85rem',
                    color: '#dc2626',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    ⚠️ Active Job Limit: You currently have an active delivery in progress (Order #{activeOrder.orderId}). Complete your current active delivery before you can accept new jobs.
                  </div>
                )}
                {/* Direct requests panel */}
                {assignedRequests.length > 0 && (
                  <div style={{ marginBottom: '28px', padding: '20px', background: 'rgba(49, 151, 149, 0.08)', border: '1.5px solid #319795', borderRadius: '12px' }}>
                    <h4 style={{ fontSize: '1.1rem', color: '#319795', fontWeight: 800, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🔔 Direct Job Requests ({assignedRequests.length})
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0 0 16px 0' }}>
                      These orders have been assigned directly to you by the merchant. Please Accept or Decline them.
                    </p>
                    <div className="orders-table-wrapper" style={{ overflowX: 'auto' }}>
                      <table className="orders-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                            <th style={{ padding: '12px' }}>Order ID</th>
                            <th style={{ padding: '12px' }}>Addresses</th>
                            <th style={{ padding: '12px' }}>Distance</th>
                            <th style={{ padding: '12px' }}>Payout</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignedRequests.map((order) => {
                            const payout = order.deliveryCharge || parseFloat(((order.distanceKm || 0) * 2).toFixed(2));
                            return (
                              <tr key={order.orderId} style={{ borderBottom: '1px solid #edf2f7', fontSize: '0.9rem' }}>
                                <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>#{order.orderId}</td>
                                <td style={{ padding: '12px' }}>
                                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                    <strong>Pickup:</strong> {order.sellerLocation?.address || 'Seller Hub'}
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                                    <strong>Dropoff:</strong> {order.deliveryAddress?.address || order.buyerLocation?.address}
                                  </div>
                                </td>
                                <td style={{ padding: '12px', fontWeight: 600 }}>{order.distanceKm || 0} KM</td>
                                <td style={{ padding: '12px', fontWeight: 700, color: '#319795' }}>₹{payout}</td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                    <button
                                      onClick={() => handleUpdateJobStatus(order.orderId, 'accepted')}
                                      className="lp-btn lp-btn--primary"
                                      disabled={!!activeOrder}
                                      style={{
                                        padding: '6px 14px',
                                        fontSize: '0.8rem',
                                        backgroundColor: activeOrder ? '#94a3b8' : '#319795',
                                        border: 'none',
                                        color: '#fff',
                                        borderRadius: '6px',
                                        fontWeight: 'bold',
                                        cursor: activeOrder ? 'not-allowed' : 'pointer',
                                        opacity: activeOrder ? 0.6 : 1
                                      }}
                                    >
                                      Accept
                                    </button>
                                    <button onClick={() => handleUpdateJobStatus(order.orderId, 'rejected')} className="lp-btn" style={{ padding: '6px 14px', fontSize: '0.8rem', backgroundColor: '#ef4444', border: 'none', color: '#fff', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                                      Decline
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 600 }}>Available Jobs in {user?.currentCity}</h3>
                  <button onClick={() => fetchDashboardData(token)} className="lp-btn lp-btn--secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    🔄 Refresh Jobs
                  </button>
                </div>
                {dashLoading ? (
                  <p style={{ textAlign: 'center', color: '#64748b' }}>Refreshing available jobs...</p>
                ) : availableOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <span style={{ fontSize: '3rem' }}>📭</span>
                    <h4 style={{ fontSize: '1.1rem', margin: '16px 0 8px 0', color: '#0f172a' }}>No new jobs available</h4>
                    <p>There are no unassigned orders in {user?.currentCity || 'your city'} right now. New jobs will appear here when buyers place orders.</p>
                  </div>
                ) : (
                  <div className="orders-table-wrapper" style={{ overflowX: 'auto' }}>
                    <table className="orders-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                          <th style={{ padding: '12px' }}>Order ID</th>
                          <th style={{ padding: '12px' }}>Addresses</th>
                          <th style={{ padding: '12px' }}>Distance</th>
                          <th style={{ padding: '12px' }}>Payout Charge</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableOrders.map((order) => {
                          const payout = parseFloat(((order.distanceKm || 0) * 2).toFixed(2));
                          return (
                            <tr key={order.orderId} style={{ borderBottom: '1px solid #edf2f7', fontSize: '0.9rem' }}>
                              <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>#{order.orderId}</td>
                              <td style={{ padding: '12px' }}>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                  <strong>Pickup:</strong> {order.sellerLocation?.address || 'Seller Hub'}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                                  <strong>Dropoff:</strong> {order.deliveryAddress?.address || order.buyerLocation?.address}
                                </div>
                              </td>
                              <td style={{ padding: '12px', fontWeight: 600 }}>{order.distanceKm || 0} KM</td>
                              <td style={{ padding: '12px', fontWeight: 700, color: '#319795' }}>₹{payout}</td>
                              <td style={{ padding: '12px', textAlign: 'right' }}>
                                <button
                                  onClick={() => handleUpdateJobStatus(order.orderId, 'accepted')}
                                  className="lp-btn lp-btn--primary"
                                  disabled={!!activeOrder}
                                  style={{
                                    padding: '6px 14px',
                                    fontSize: '0.8rem',
                                    backgroundColor: activeOrder ? '#94a3b8' : '#319795',
                                    border: 'none',
                                    color: '#fff',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    cursor: activeOrder ? 'not-allowed' : 'pointer',
                                    opacity: activeOrder ? 0.6 : 1
                                  }}
                                >
                                  Accept Job
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB: ACTIVE DELIVERY */}
          {activeTab === 'active' && !editProfileMode && user?.status === 'approved' && (
            <div className="form-card-wrapper" style={{ padding: '32px' }}>
              {!activeOrder ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <span style={{ fontSize: '3rem' }}>🏍️</span>
                  <h4 style={{ fontSize: '1.1rem', margin: '16px 0 8px 0', color: '#0f172a' }}>No active delivery job</h4>
                  <p>Go to the <strong>New Jobs</strong> tab to accept a delivery assignment.</p>
                </div>
              ) : (
                <div>
                  {/* Active job header */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ACTIVE ASSIGNMENT</span>
                      <h3 style={{ fontSize: '1.5rem', color: '#0f172a', fontWeight: '800', margin: '4px 0 0 0' }}>Order #{activeOrder.orderId}</h3>
                    </div>
                    <span className={`status-pill status-pill--${activeOrder.deliveryStatus}`}>
                      {activeOrder.deliveryStatus === 'accepted' ? 'Accepted' :
                        activeOrder.deliveryStatus === 'picked_up' ? 'Picked Up' :
                          activeOrder.deliveryStatus === 'in_transit' ? 'In Transit' :
                            activeOrder.deliveryStatus === 'out_for_delivery' ? 'Out For Delivery' :
                              activeOrder.deliveryStatus === 'arrived' ? 'Arrived' : activeOrder.deliveryStatus}
                    </span>
                  </div>



                  {/* Active Order Leaflet Map */}
                  <div id="active-delivery-map" style={{ height: '350px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1', marginBottom: '20px' }}></div>

                  {/* Delivery Locations details & Contact buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '20px', textAlign: 'left' }}>
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #edf2f7' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', marginBottom: '8px' }}>PICKUP ADDRESS (MERCHANT)</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>{activeOrder.sellerLocation?.shopName || 'Merchant'}</div>
                      <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>{activeOrder.sellerLocation?.address || 'N/A'}</div>
                      {activeOrder.sellerPhone && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          <a href={`tel:${activeOrder.sellerPhone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#2563eb', color: '#fff', fontSize: '0.75rem', fontWeight: '700', borderRadius: '6px', textDecoration: 'none' }}>
                            📞 Call Merchant
                          </a>
                          <a href={`https://wa.me/${activeOrder.sellerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello, I am your delivery agent for Emahu order #${activeOrder.orderId}.`)}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#25d366', color: '#fff', fontSize: '0.75rem', fontWeight: '700', borderRadius: '6px', textDecoration: 'none' }}>
                            💬 WhatsApp
                          </a>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #edf2f7' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', marginBottom: '8px' }}>DELIVERY ADDRESS (CUSTOMER)</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>{activeOrder.deliveryAddress?.fullName || 'Customer'}</div>
                      <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>{activeOrder.deliveryAddress?.address || 'N/A'}</div>
                      {activeOrder.deliveryAddress?.phone && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          <a href={`tel:${activeOrder.deliveryAddress.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#7c3aed', color: '#fff', fontSize: '0.75rem', fontWeight: '700', borderRadius: '6px', textDecoration: 'none' }}>
                            📞 Call Customer
                          </a>
                          <a href={`https://wa.me/${activeOrder.deliveryAddress.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello, I am your delivery partner for Emahu order #${activeOrder.orderId}. I am on my way to deliver your package.`)}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#10b981', color: '#fff', fontSize: '0.75rem', fontWeight: '700', borderRadius: '6px', textDecoration: 'none' }}>
                            💬 WhatsApp
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step Transitions / Control Buttons */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
                    {activeOrder.deliveryStatus === 'accepted' && (
                      <button onClick={() => handleUpdateJobStatus(activeOrder.orderId, 'picked_up')} className="lp-btn" style={{ flex: 1, padding: '12px', fontSize: '0.85rem', fontWeight: '700', backgroundColor: '#dd6b20', color: '#fff' }}>
                        📦 Confirm Pickup from Merchant
                      </button>
                    )}
                    {activeOrder.deliveryStatus === 'picked_up' && (
                      <button onClick={() => handleUpdateJobStatus(activeOrder.orderId, 'in_transit')} className="lp-btn" style={{ flex: 1, padding: '12px', fontSize: '0.85rem', fontWeight: '700', backgroundColor: '#3182ce', color: '#fff' }}>
                        🚚 Mark In Transit
                      </button>
                    )}
                    {activeOrder.deliveryStatus === 'in_transit' && (
                      <button onClick={() => handleUpdateJobStatus(activeOrder.orderId, 'out_for_delivery')} className="lp-btn" style={{ flex: 1, padding: '12px', fontSize: '0.85rem', fontWeight: '700', backgroundColor: '#319795', color: '#fff' }}>
                        🏍️ Mark Out for Delivery
                      </button>
                    )}
                    {activeOrder.deliveryStatus === 'out_for_delivery' && (
                      <button onClick={() => handleUpdateJobStatus(activeOrder.orderId, 'arrived')} className="lp-btn" style={{ flex: 1, padding: '12px', fontSize: '0.85rem', fontWeight: '700', backgroundColor: '#2b6cb0', color: '#fff' }}>
                        📍 Mark Arrived at Destination
                      </button>
                    )}
                  </div>

                  {/* HANDOVER CONFIRMATION PANEL (Only visible when status is arrived) */}
                  {activeOrder.deliveryStatus === 'arrived' && (
                    <div style={{ border: '2px solid #319795', borderRadius: '16px', overflow: 'hidden', marginTop: '24px' }}>
                      <div style={{ background: '#319795', padding: '12px 20px', color: '#fff', fontWeight: '800', fontSize: '0.9rem', textAlign: 'left' }}>
                        🔐 SECURE HANDOVER VERIFICATION REQUIRED
                      </div>

                      <div style={{ padding: '24px', background: '#ffffff', textAlign: 'left' }}>
                        <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 20px 0' }}>
                          To complete the delivery, you must prove GPS proximity (within 100 meters) and verify the secure <strong>6-digit OTP code</strong> provided by the buyer.
                        </p>

                        {isTooFar && (
                          <div style={{ backgroundColor: '#fff5f5', border: '1px solid #feb2b2', color: '#c53030', padding: '14px 18px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.82rem', lineHeight: '1.5', textAlign: 'left' }}>
                            <strong style={{ display: 'block', fontSize: '0.88rem', marginBottom: '4px' }}>⚠️ GPS Proximity Lock Active (Distance: {distanceToBuyerMeters}m)</strong>
                            <span>You are currently {distanceToBuyerMeters} meters away from the customer&apos;s drop-off coordinates. Handover verification actions (OTP requests and photo uploads) are disabled until you are within the 100-meter threshold. Please use the simulation panel to advance closer or update your physical location.</span>
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>

                          {/* OTP Code Verification */}
                          <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', backgroundColor: '#fcfcfd' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: '700', color: '#0f172a' }}>🔒 OTP Handover Verification</h4>
                            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 12px 0' }}>
                              Request a 6-digit OTP to be sent to the buyer&apos;s email, then type it below along with a confirmation photo to complete the delivery.
                            </p>

                            {otpError && <div className="form-alert-error" style={{ fontSize: '0.8rem', padding: '8px 12px' }}>⚠️ {otpError}</div>}
                            {otpSuccess && <div className="form-alert-success" style={{ fontSize: '0.8rem', padding: '8px 12px' }}>✓ {otpSuccess}</div>}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                              <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.7rem' }}>ENTER 6-DIGIT OTP</label>
                                <input
                                  type="text"
                                  maxLength={6}
                                  className="form-input"
                                  placeholder="e.g. 123456"
                                  value={enteredOtp}
                                  onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                  style={{ padding: '8px 12px', fontSize: '0.9rem', height: '38px', maxWidth: '200px' }}
                                />
                              </div>

                              <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.7rem' }}>DELIVERED PHOTO (CAMERA CAPTURE REQUIRED)</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      id="delivery-photo-capture"
                                      style={{ display: 'none' }}
                                      onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            setUploadedPhoto(reader.result);
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => document.getElementById('delivery-photo-capture').click()}
                                      className="lp-btn"
                                      style={{
                                        padding: '8px 16px',
                                        fontSize: '0.78rem',
                                        background: '#319795',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontWeight: 'bold',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                      }}
                                    >
                                      📸 Take Photo with Camera
                                    </button>
                                    {uploadedPhoto && (
                                      <button
                                        type="button"
                                        onClick={() => setUploadedPhoto('')}
                                        className="lp-btn"
                                        style={{
                                          padding: '8px 16px',
                                          fontSize: '0.78rem',
                                          background: '#e53e3e',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '8px',
                                          cursor: 'pointer',
                                          fontWeight: 'bold'
                                        }}
                                      >
                                        ✕ Clear Photo
                                      </button>
                                    )}
                                  </div>

                                  {uploadedPhoto && (
                                    <div style={{
                                      border: '1.5px solid #e2e8f0',
                                      borderRadius: '10px',
                                      overflow: 'hidden',
                                      padding: '8px',
                                      background: '#f8fafc',
                                      maxWidth: '320px',
                                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                                    }}>
                                      {uploadedPhoto.startsWith('data:') ? (
                                        <img
                                          src={uploadedPhoto}
                                          alt="Captured package preview"
                                          style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '6px' }}
                                        />
                                      ) : (
                                        <div style={{ fontSize: '0.75rem', wordBreak: 'break-all', color: '#475569', padding: '4px' }}>
                                          Selected: {uploadedPhoto}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleVerifyHandoverOtp(activeOrder.orderId)}
                                  disabled={submittingOtp || isTooFar}
                                  className="lp-btn"
                                  style={{ padding: '10px 16px', fontSize: '0.8rem', background: isTooFar ? '#cbd5e1' : '#38a169', color: isTooFar ? '#64748b' : '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', opacity: isTooFar ? 0.6 : 1, cursor: isTooFar ? 'not-allowed' : 'pointer' }}
                                >
                                  {submittingOtp ? 'Verifying OTP...' : 'Verify OTP & Complete Delivery'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSendHandoverOtp(activeOrder.orderId)}
                                  disabled={otpResendCooldown > 0 || isTooFar}
                                  className="lp-btn"
                                  style={{ padding: '10px 16px', fontSize: '0.8rem', background: isTooFar ? '#cbd5e1' : '#319795', color: isTooFar ? '#64748b' : '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', opacity: (otpResendCooldown > 0 || isTooFar) ? 0.6 : 1, cursor: isTooFar ? 'not-allowed' : 'pointer' }}
                                >
                                  {otpResendCooldown > 0 ? `Resend in ${otpResendCooldown}s` : 'Resend OTP to Buyer'}
                                </button>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: COMPLETED DELIVERIES */}
          {activeTab === 'completed' && !editProfileMode && user?.status === 'approved' && (
            <div className="form-card-wrapper" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 600, marginBottom: '20px', textAlign: 'left' }}>Completed Deliveries</h3>
              {orders.filter(o => o.deliveryStatus === 'delivered').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <span style={{ fontSize: '3rem' }}>🏁</span>
                  <h4 style={{ fontSize: '1.1rem', margin: '16px 0 8px 0', color: '#0f172a' }}>No completed jobs yet</h4>
                  <p>Delivered assignments will appear here as part of your shipment history.</p>
                </div>
              ) : (
                <div className="orders-table-wrapper" style={{ overflowX: 'auto' }}>
                  <table className="orders-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                        <th style={{ padding: '12px' }}>Order ID</th>
                        <th style={{ padding: '12px' }}>Addresses</th>
                        <th style={{ padding: '12px' }}>Distance</th>
                        <th style={{ padding: '12px' }}>Earnings</th>
                        <th style={{ padding: '12px' }}>Completed Date</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.filter(o => o.deliveryStatus === 'delivered').map((order) => {
                        const cost = order.deliveryCost !== undefined ? order.deliveryCost : parseFloat(((order.distanceKm || 0) * 2).toFixed(2));
                        const dateObj = order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : order.date;
                        return (
                          <tr key={order.orderId} style={{ borderBottom: '1px solid #edf2f7', fontSize: '0.9rem' }}>
                            <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>#{order.orderId}</td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                <strong>Pickup:</strong> {order.sellerLocation?.address || 'Seller Hub'}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                                <strong>Dropoff:</strong> {order.deliveryAddress?.address || order.buyerLocation?.address}
                              </div>
                            </td>
                            <td style={{ padding: '12px', fontWeight: 600 }}>{order.distanceKm || 0} KM</td>
                            <td style={{ padding: '12px', fontWeight: 700, color: '#2f855a' }}>₹{cost}</td>
                            <td style={{ padding: '12px', color: '#475569' }}>{dateObj}</td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              <span className="status-pill status-pill--delivered">Delivered</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: EARNINGS REPORTS */}
          {activeTab === 'earnings' && !editProfileMode && user?.status === 'approved' && (
            <div className="form-card-wrapper" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 600, marginBottom: '20px', textAlign: 'left' }}>Earnings Dashboard & Reports</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', textAlign: 'left' }}>
                <div style={{ padding: '20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: '700' }}>TOTAL INCOME</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#16a34a', marginTop: '6px' }}>₹{stats.earnings}</div>
                  <p style={{ fontSize: '0.75rem', color: '#16a34a', margin: '4px 0 0 0' }}>Flat ₹2 per KM rate applied on deliveries.</p>
                </div>
                <div style={{ padding: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '700' }}>JOBS DELIVERED</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#0f172a', marginTop: '6px' }}>
                    {orders.filter(o => o.deliveryStatus === 'delivered').length}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '4px 0 0 0' }}>Out of {stats.total} total assigned jobs.</p>
                </div>
              </div>

              <h4 style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '700', marginBottom: '12px', textAlign: 'left' }}>Income Report Table</h4>
              {orders.filter(o => o.deliveryStatus === 'delivered').length === 0 ? (
                <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No income report history available yet.</p>
              ) : (
                <div className="orders-table-wrapper" style={{ overflowX: 'auto' }}>
                  <table className="orders-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                        <th style={{ padding: '12px' }}>Order</th>
                        <th style={{ padding: '12px' }}>Distance</th>
                        <th style={{ padding: '12px' }}>Delivery Rate</th>
                        <th style={{ padding: '12px' }}>Earnings Payout</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.filter(o => o.deliveryStatus === 'delivered').map((order) => {
                        const cost = order.deliveryCost !== undefined ? order.deliveryCost : parseFloat(((order.distanceKm || 0) * 2).toFixed(2));
                        return (
                          <tr key={order.orderId} style={{ borderBottom: '1px solid #edf2f7', fontSize: '0.88rem' }}>
                            <td style={{ padding: '12px', fontWeight: 600 }}>#{order.orderId}</td>
                            <td style={{ padding: '12px' }}>{order.distanceKm || 0} KM</td>
                            <td style={{ padding: '12px' }}>₹2/KM</td>
                            <td style={{ padding: '12px', fontWeight: 700, color: '#16a34a' }}>₹{cost}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

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
      {/* Invisible Recaptcha Container for Firebase Phone Auth */}
      <div id="recaptcha-container" />

      {isEmailOtpSent && !isEmailVerified && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '420px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'rgba(49, 151, 149, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#319795" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
              {otpLoading ? 'Sending Verification Code...' : 'Confirm Your Mobile Number'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: '1.5', marginBottom: '24px' }}>
              {otpLoading
                ? 'We are generating and sending a secure verification code...'
                : <>We sent a 6-digit verification code to <strong style={{ color: '#0f172a' }}>{phoneNumber}</strong>. Please enter it below.</>
              }
            </p>

            {devOtp && (
              <div style={{
                background: 'rgba(49, 151, 149, 0.08)',
                border: '1px solid rgba(49, 151, 149, 0.15)',
                color: '#319795',
                padding: '12px',
                borderRadius: '8px',
                textAlign: 'center',
                marginTop: '8px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '0.75rem', marginBottom: '5px', opacity: 0.85 }}>🔑 simulated code (check console too):</div>
                <div
                  style={{ letterSpacing: '6px', fontSize: '1.4rem', fontWeight: '800', color: '#319795', background: 'rgba(0,0,0,0.04)', padding: '5px 12px', borderRadius: '6px', display: 'inline-block', cursor: 'pointer', userSelect: 'all' }}
                  onClick={() => setEmailOtp(devOtp)}
                  title="Click to auto-fill"
                >
                  {devOtp}
                </div>
                <div style={{ fontSize: '0.7rem', opacity: 0.65, marginTop: '4px' }}>👆 Click to auto-fill</div>
              </div>
            )}

            {errors.otp && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                marginBottom: '16px',
                textAlign: 'left'
              }}>
                {errors.otp}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                maxLength="6"
                placeholder="000000"
                value={emailOtp}
                onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{
                  width: '100%',
                  height: '50px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  color: '#0f172a',
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  textAlign: 'center',
                  letterSpacing: '8px',
                  outline: 'none'
                }}
                disabled={otpLoading}
              />
              <button
                type="button"
                className="lp-nav-link-btn"
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '8px',
                  backgroundColor: '#319795',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: otpLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: otpLoading ? 0.7 : 1,
                  margin: 0
                }}
                onClick={handleVerifyEmailOtp}
                disabled={otpLoading}
              >
                {otpLoading ? 'Verifying...' : 'Verify & Register'}
              </button>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  marginTop: '8px'
                }}
                onClick={() => setIsEmailOtpSent(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showLocationTermsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            textAlign: 'left',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0f172a', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              Emahu Delivery Terms & Location Service
            </h3>

            <div style={{ marginBottom: '20px', fontSize: '0.85rem', color: '#475569', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '10px', fontWeight: '600', color: '#0f172a' }}>
                Location Permission Rejected/Unavailable:
              </p>
              <p style={{ marginBottom: '16px' }}>
                Since GPS access is required to auto-match routes but was not granted, you must manually confirm your operating details and accept the terms of service below.
              </p>
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '8px', marginBottom: '20px' }}>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '6px' }}>Delivery Partner Agreement:</strong>
                <ul style={{ paddingLeft: '20px', margin: 0 }}>
                  <li>You agree to provide accurate, real-time status updates during all dispatches.</li>
                  <li>You agree to keep the manually provided address accurate for logistics matching.</li>
                  <li>You consent to share live route coordinates when active orders are in transit.</li>
                </ul>
              </div>
            </div>

            {locationTermsError && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                marginBottom: '16px'
              }}>
                {locationTermsError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#334155' }}>Street Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 101, Galaxy Complex"
                    value={manualStreet}
                    onChange={(e) => setManualStreet(e.target.value)}
                    style={{ height: '38px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#334155' }}>Area / Neighborhood</label>
                  <input
                    type="text"
                    placeholder="e.g. Gota"
                    value={manualArea}
                    onChange={(e) => setManualArea(e.target.value)}
                    style={{ height: '38px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#334155' }}>City</label>
                  <select
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                    style={{ height: '38px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
                  >
                    <option value="Ahmedabad">Ahmedabad</option>
                    <option value="Surat">Surat</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#334155' }}>State</label>
                  <input
                    type="text"
                    placeholder="e.g. Gujarat"
                    value={manualState}
                    onChange={(e) => setManualState(e.target.value)}
                    style={{ height: '38px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#334155' }}>Pincode</label>
                  <input
                    type="text"
                    placeholder="e.g. 382481"
                    maxLength="6"
                    value={manualPincode}
                    onChange={(e) => setManualPincode(e.target.value.replace(/\D/g, ''))}
                    style={{ height: '38px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: '#334155', marginTop: '10px' }}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <span>I accept all the terms and conditions for delivery services and confirm the address is correct.</span>
              </label>

              <button
                type="button"
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '8px',
                  backgroundColor: '#319795',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: '10px'
                }}
                onClick={handleApproveLocationTerms}
              >
                Approve & Continue
              </button>

              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  alignSelf: 'center',
                  marginTop: '4px'
                }}
                onClick={() => setShowLocationTermsModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
