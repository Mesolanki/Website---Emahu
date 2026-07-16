'use client';

import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './dashboard.css';
import { logoutUser, clearAuthSession } from '@/utils/auth';
import { indiaStatesCities } from '@/utils/indiaStatesCities';
let toastIdCounter = 0;

const resolveDocUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();
  if (clean.startsWith('data:')) {
    return clean;
  }
  let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
  apiUrl = apiUrl.replace(/\/api\/auth$/, '').replace(/\/api$/, '').replace(/\/$/, '');
  clean = clean.replace(/^http:\/\/(localhost|127\.0\.0\.1):5000/, apiUrl);
  return clean;
};

const cleanImageUrl = (img) => {
  if (!img || typeof img !== 'string') return '';
  let clean = img.trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }
  if (clean.startsWith('[') && clean.endsWith(']')) {
    try {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return cleanImageUrl(parsed[0]);
      }
    } catch (e) {
      clean = clean.slice(1, -1).trim();
      if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
        clean = clean.slice(1, -1).trim();
      }
    }
  }
  return resolveDocUrl(clean);
};

const isRealImage = (img) => {
  const clean = cleanImageUrl(img);
  if (clean.toLowerCase().endsWith('.pdf')) return false;
  return clean.startsWith('http') || clean.startsWith('data:image');
};

const openDocInNewTab = (url) => {
  if (!url) return;
  const clean = resolveDocUrl(url);
  if (clean.startsWith('data:')) {
    const newTab = window.open();
    if (newTab) {
      newTab.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>View Submitted Document</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; background: #0f172a; height: 100vh; overflow: hidden; }
              img, embed { max-width: 100%; max-height: 100%; object-fit: contain; }
            </style>
          </head>
          <body>
            ${clean.startsWith('data:application/pdf') ?
          '<embed src="' + clean + '" type="application/pdf" width="100%" height="100%" />' :
          '<img src="' + clean + '" alt="Document Preview" />'
        }
          </body>
        </html>
      `);
      newTab.document.close();
    }
  } else {
    window.open(clean, '_blank');
  }
};

const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (base64.length % 4)) % 4;
    const padded = base64 + '='.repeat(padLen);
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Safe JWT Decode Error:', e);
    return null;
  }
};

export default function AdminDashboard() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState('sellers');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // Track which tabs have already been fetched to avoid redundant API calls
  const [fetchedTabs, setFetchedTabs] = useState(new Set());
  const [serverWaking, setServerWaking] = useState(false);

  // Restore active tab from localStorage on mount (client-side only to avoid hydration mismatches)
  useEffect(() => {
    const saved = localStorage.getItem('emahu_admin_active_tab');
    if (saved) {
      setActiveTab(saved);
    }
  }, []);

  // Persist active tab changes to localStorage
  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('emahu_admin_active_tab', activeTab);
    }
  }, [activeTab]);

  // Payout states
  const [payoutReceiptFile, setPayoutReceiptFile] = useState('');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [adminPenaltyAmount, setAdminPenaltyAmount] = useState('0');
  const [adminPenaltyReason, setAdminPenaltyReason] = useState('');

  // Emahu commission settings state
  const [platformFeePercent, setPlatformFeePercent] = useState(4);
  const [platformFeeName, setPlatformFeeName] = useState('Emahu Platform Fee');
  const [loadingPlatformSettings, setLoadingPlatformSettings] = useState(false);
  const [savingPlatformSettings, setSavingPlatformSettings] = useState(false);

  // Sellers and Products State
  const [sellers, setSellers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [sellersError, setSellersError] = useState(false);
  const [productsError, setProductsError] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [toasts, setToasts] = useState([]);

  // Delivery Partners State
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [loadingDeliveryPartners, setLoadingDeliveryPartners] = useState(false);
  const [deliveryPartnersError, setDeliveryPartnersError] = useState(false);
  const [selectedDetailPartner, setSelectedDetailPartner] = useState(null);

  // Delivery Settings states
  const [deliverySettings, setDeliverySettings] = useState({ slabs: [] });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [newSlabFrom, setNewSlabFrom] = useState('');
  const [newSlabTo, setNewSlabTo] = useState('');
  const [newSlabCharge, setNewSlabCharge] = useState('');

  // Add Partner form states
  const [isAddPartnerOpen, setIsAddPartnerOpen] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerPhone, setNewPartnerPhone] = useState('');
  const [newPartnerOperatingLocation, setNewPartnerOperatingLocation] = useState('');
  const [newPartnerSalaryRequirement, setNewPartnerSalaryRequirement] = useState('');
  const [newPartnerServiceAreaCountry, setNewPartnerServiceAreaCountry] = useState('India');
  const [newPartnerServiceAreaRegion, setNewPartnerServiceAreaRegion] = useState('');
  const [newPartnerServiceAreaDistrict, setNewPartnerServiceAreaDistrict] = useState('');
  const [newPartnerServiceAreaState, setNewPartnerServiceAreaState] = useState('');
  const [newPartnerServiceAreaCity, setNewPartnerServiceAreaCity] = useState('');
  const [newPartnerAddress, setNewPartnerAddress] = useState('');
  const [newPartnerRate, setNewPartnerRate] = useState('10');
  const [newPartnerVehicleType, setNewPartnerVehicleType] = useState('bike');
  const [newPartnerLat, setNewPartnerLat] = useState('23.0225');
  const [newPartnerLon, setNewPartnerLon] = useState('72.5714');
  const [newPartnerLoading, setNewPartnerLoading] = useState(false);

  // Edit Partner states inside detail modal
  const [editPartnerRate, setEditPartnerRate] = useState('');
  const [editPartnerRadius, setEditPartnerRadius] = useState('999');
  const [editPartnerVehicleType, setEditPartnerVehicleType] = useState('bike');
  const [editPartnerIsActive, setEditPartnerIsActive] = useState(true);
  const [editPartnerOperatingLocation, setEditPartnerOperatingLocation] = useState('');
  const [editPartnerSalaryRequirement, setEditPartnerSalaryRequirement] = useState('');
  const [editPartnerServiceAreaCountry, setEditPartnerServiceAreaCountry] = useState('India');
  const [editPartnerServiceAreaRegion, setEditPartnerServiceAreaRegion] = useState('');
  const [editPartnerServiceAreaDistrict, setEditPartnerServiceAreaDistrict] = useState('');
  const [editPartnerServiceAreaState, setEditPartnerServiceAreaState] = useState('');
  const [editPartnerServiceAreaCity, setEditPartnerServiceAreaCity] = useState('');
  const [editPartnerAddress, setEditPartnerAddress] = useState('');

  const [newPartnerCategory, setNewPartnerCategory] = useState('single_two_boy');
  const [newPartnerDeliveryScope, setNewPartnerDeliveryScope] = useState('local');
  const [newPartnerSelectedStates, setNewPartnerSelectedStates] = useState([]);
  const [newPartnerCoveredCities, setNewPartnerCoveredCities] = useState([]);
  const [newPartnerPerKmRate, setNewPartnerPerKmRate] = useState('5');

  const [editPartnerCategory, setEditPartnerCategory] = useState('single_two_boy');
  const [editPartnerDeliveryScope, setEditPartnerDeliveryScope] = useState('local');
  const [editPartnerSelectedStates, setEditPartnerSelectedStates] = useState([]);
  const [editPartnerCoveredCities, setEditPartnerCoveredCities] = useState([]);
  const [editPartnerPerKmRate, setEditPartnerPerKmRate] = useState('5');

  // Notifications states
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState(false);

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
  const [sellerOrders, setSellerOrders] = useState([]);
  const [loadingSellerOrders, setLoadingSellerOrders] = useState(false);
  const [sellerOrdersError, setSellerOrdersError] = useState(false);
  const [releasingOrderId, setReleasingOrderId] = useState('');
  const [releasedReceipt, setReleasedReceipt] = useState(null);
  const [orderPenalties, setOrderPenalties] = useState({}); // { [orderId]: { amount: '', reason: '' } }

  // Release Fund Panel (multi-step: bank → payment → confirm)
  const [releasePanel, setReleasePanel] = useState(null); // { order, seller, penalty }
  const [releasePanelStep, setReleasePanelStep] = useState('bank'); // 'bank' | 'payment' | 'confirm'

  // Inline custom SKUs map
  const [customSkus, setCustomSkus] = useState({});

  // Category filter state for rejected products tab
  const [selectedRejectedCategory, setSelectedRejectedCategory] = useState('All');

  // Sub-tab state for unified Products Hub tab
  const [productsHubSubTab, setProductsHubSubTab] = useState('queue'); // 'queue' | 'live' | 'rejected'

  // Category Hub states
  const [adminCategories, setAdminCategories] = useState([]);
  const [loadingAdminCategories, setLoadingAdminCategories] = useState(false);
  const [adminCategoriesError, setAdminCategoriesError] = useState(false);
  const [selectedAdminCategory, setSelectedAdminCategory] = useState(null);
  const [isCategoryFormSaving, setIsCategoryFormSaving] = useState(false);
  const [categoryHubSearchQuery, setCategoryHubSearchQuery] = useState('');

  // Category form fields state
  const [catFormName, setCatFormName] = useState('');
  const [catFormParentId, setCatFormParentId] = useState('');
  const [catFormBrands, setCatFormBrands] = useState('');
  const [catFormAttributes, setCatFormAttributes] = useState([]);
  const [catFormSpecifications, setCatFormSpecifications] = useState([]);
  const [catFormValidationRules, setCatFormValidationRules] = useState({ minImages: 1, brandRequired: false, variantRequired: false });
  const [catFormIcon, setCatFormIcon] = useState('');
  const [catFormImage, setCatFormImage] = useState('');
  const [catFormOrder, setCatFormOrder] = useState(0);
  const [catFormIsEnabled, setCatFormIsEnabled] = useState(true);

  // Orders states
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [selectedDetailOrder, setSelectedDetailOrder] = useState(null);
  const [actionLoadingOrder, setActionLoadingOrder] = useState({});

  // Tracking form states
  const [carrier, setCarrier] = useState('Delhivery');
  const [trackingId, setTrackingId] = useState('');
  const [packageWeight, setPackageWeight] = useState('');
  const [deliveryCost, setDeliveryCost] = useState('');
  const [estDays, setEstDays] = useState('');

  const handleCarrierChange = (selectedCarrier) => {
    setCarrier(selectedCarrier);
    let defaults = { trackingId: '', packageWeight: '', deliveryCost: '', estDays: '' };
    if (selectedCarrier === 'Delhivery') {
      defaults = {
        trackingId: `DLV${Math.floor(100000000 + Math.random() * 900000000)}`,
        packageWeight: '1.2 kg',
        deliveryCost: '120',
        estDays: '3-5 Days'
      };
    } else if (selectedCarrier === 'Blue Dart') {
      defaults = {
        trackingId: `BD${Math.floor(100000000 + Math.random() * 900000000)}`,
        packageWeight: '1.5 kg',
        deliveryCost: '180',
        estDays: '1-2 Days'
      };
    } else if (selectedCarrier === 'EmahuXpress') {
      defaults = {
        trackingId: `EMH-TRK-${Math.floor(100 + Math.random() * 900)}`,
        packageWeight: '0.8 kg',
        deliveryCost: '80',
        estDays: '2-4 Days'
      };
    } else if (selectedCarrier === 'FedEx') {
      defaults = {
        trackingId: `FDX${Math.floor(100000000 + Math.random() * 900000000)}`,
        packageWeight: '2.0 kg',
        deliveryCost: '250',
        estDays: '2-3 Days'
      };
    }
    setTrackingId(defaults.trackingId);
    setPackageWeight(defaults.packageWeight);
    setDeliveryCost(defaults.deliveryCost);
    setEstDays(defaults.estDays);
  };

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
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
    const token = localStorage.getItem('emahu_admin_token');

    let isTokenExpired = false;
    if (token) {
      const payload = decodeToken(token);
      if (!payload) {
        isTokenExpired = true;
      } else if (payload.exp && payload.exp * 1000 < Date.now()) {
        isTokenExpired = true;
      }
    } else {
      isTokenExpired = true;
    }

    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }

    if (isTokenExpired) {
      clearAuthSession('admin');
      router.replace('/login?expired=true');
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

  // Fetch Sellers List with Auto-Retry for Render Cold Starts
  const fetchSellers = async (retryCount = 0) => {
    setLoadingSellers(true);
    setSellersError(false);
    try {
      const token = localStorage.getItem('emahu_admin_token');
      if (!token) return;

      const res = await fetch(`/api/auth/admin/sellers`, {
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
        const sortedSellers = (data.sellers || [])
          .map(s => ({ ...s, status: s.status || 'approved' }))
          .sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (timeA !== timeB) return timeB - timeA;
            return String(b._id || '').localeCompare(String(a._id || ''));
          });
        setSellers(sortedSellers);
        setSellersError(false);
      } else {
        if (retryCount < 3) {
          console.warn(`Sellers fetch failed, retrying in 3s... (attempt ${retryCount + 1})`);
          setTimeout(() => fetchSellers(retryCount + 1), 3000);
        } else {
          setSellersError(true);
          triggerToast('Error', data.error || 'Failed to fetch sellers list.', 'danger');
        }
      }
    } catch (err) {
      console.error(err);
      if (retryCount < 3) {
        console.warn(`Sellers fetch error, retrying in 3s... (attempt ${retryCount + 1})`);
        setTimeout(() => fetchSellers(retryCount + 1), 3000);
      } else {
        setSellersError(true);
        triggerToast('Error', 'Network error fetching sellers.', 'danger');
      }
    } finally {
      if (retryCount === 0 || retryCount >= 3) {
        setLoadingSellers(false);
      }
    }
  };

  // Fetch Products List with Auto-Retry for Render Cold Starts
  const fetchProducts = async (retryCount = 0) => {
    setLoadingProducts(true);
    setProductsError(false);
    try {
      const token = localStorage.getItem('emahu_admin_token');
      if (!token) return;

      const res = await fetch(`/api/products/admin/all`, {
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
        setProductsError(false);
      } else {
        if (retryCount < 3) {
          console.warn(`Products fetch failed, retrying in 3s... (attempt ${retryCount + 1})`);
          setTimeout(() => fetchProducts(retryCount + 1), 3000);
        } else {
          setProductsError(true);
          triggerToast('Error', data.error || 'Failed to fetch products list.', 'danger');
        }
      }
    } catch (err) {
      console.error(err);
      if (retryCount < 3) {
        console.warn(`Products fetch error, retrying in 3s... (attempt ${retryCount + 1})`);
        setTimeout(() => fetchProducts(retryCount + 1), 3000);
      } else {
        setProductsError(true);
        triggerToast('Error', 'Network error fetching products.', 'danger');
      }
    } finally {
      if (retryCount === 0 || retryCount >= 3) {
        setLoadingProducts(false);
      }
    }
  };

  // Fetch Categories Tree
  const fetchCategories = async () => {
    setLoadingAdminCategories(true);
    setAdminCategoriesError(false);
    try {
      const res = await fetch(`/api/categories?status=all`);
      const data = await res.json();
      if (data.success) {
        setAdminCategories(data.data || []);
      } else {
        setAdminCategoriesError(true);
        triggerToast('Error', data.error || 'Failed to fetch categories.', 'danger');
      }
    } catch (err) {
      console.error(err);
      setAdminCategoriesError(true);
      triggerToast('Error', 'Network error fetching categories.', 'danger');
    } finally {
      setLoadingAdminCategories(false);
    }
  };

  const handleSelectCategory = (cat) => {
    setSelectedAdminCategory(cat);
    if (!cat) return;
    setCatFormName(cat.name || '');
    setCatFormParentId(cat.parentId || '');
    setCatFormBrands(cat.brands ? cat.brands.join(', ') : '');
    setCatFormAttributes(cat.attributes || []);
    setCatFormSpecifications(cat.specifications || []);
    setCatFormValidationRules(cat.validationRules || { minImages: 1, brandRequired: false, variantRequired: false });
    setCatFormIcon(cat.icon || '');
    setCatFormImage(cat.image || '');
    setCatFormOrder(cat.order || 0);
    setCatFormIsEnabled(cat.isEnabled !== undefined ? cat.isEnabled : true);
  };

  const handleCreateCategoryInit = (defaultParentId = '') => {
    setSelectedAdminCategory({ id: 'new' });
    setCatFormName('');
    setCatFormParentId(defaultParentId);
    setCatFormBrands('');
    setCatFormAttributes([]);
    setCatFormSpecifications([]);
    setCatFormValidationRules({ minImages: 1, brandRequired: false, variantRequired: false });
    setCatFormIcon('');
    setCatFormImage('');
    setCatFormOrder(0);
    setCatFormIsEnabled(true);
  };
  const addAttributeField = () => {
    setCatFormAttributes([...catFormAttributes, { name: '', type: 'text', options: '', isRequired: false, isVariant: false }]);
  };
  const updateAttributeField = (index, key, val) => {
    const updated = [...catFormAttributes];
    updated[index][key] = val;
    setCatFormAttributes(updated);
  };
  const removeAttributeField = (index) => {
    setCatFormAttributes(catFormAttributes.filter((_, i) => i !== index));
  };

  const addSpecificationField = () => {
    setCatFormSpecifications([...catFormSpecifications, { name: '', isRequired: false }]);
  };
  const updateSpecificationField = (index, key, val) => {
    const updated = [...catFormSpecifications];
    updated[index][key] = val;
    setCatFormSpecifications(updated);
  };
  const removeSpecificationField = (index) => {
    setCatFormSpecifications(catFormSpecifications.filter((_, i) => i !== index));
  };

  const handleSaveCategory = async (e) => {
    if (e) e.preventDefault();
    if (!catFormName.trim()) {
      triggerToast('Validation Error', 'Category name is required', 'warning');
      return;
    }
    setIsCategoryFormSaving(true);
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const isNew = !selectedAdminCategory || selectedAdminCategory.id === 'new';

      const payload = {
        name: catFormName.trim(),
        parentId: catFormParentId || null,
        brands: catFormBrands.split(',').map(b => b.trim()).filter(Boolean),
        attributes: catFormAttributes,
        specifications: catFormSpecifications,
        validationRules: catFormValidationRules,
        icon: catFormIcon.trim(),
        image: catFormImage.trim(),
        order: Number(catFormOrder || 0),
        isEnabled: catFormIsEnabled
      };

      const url = isNew
        ? `/api/categories`
        : `/api/categories/${selectedAdminCategory.id || selectedAdminCategory._id}`;

      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        triggerToast('Success', isNew ? 'Category created successfully!' : 'Category updated successfully!', 'success');
        fetchCategories();
        if (isNew) {
          handleSelectCategory(data.data);
        } else {
          // Refresh local state object
          setSelectedAdminCategory(data.data);
        }
      } else {
        triggerToast('Error', data.error || 'Failed to save category configuration.', 'danger');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Network error saving category configuration.', 'danger');
    } finally {
      setIsCategoryFormSaving(false);
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('Are you sure you want to permanently delete this category? Any children subcategories will be unnested.')) return;
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const res = await fetch(`/api/categories/${catId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        triggerToast('Success', 'Category removed successfully.', 'success');
        setSelectedAdminCategory(null);
        fetchCategories();
      } else {
        triggerToast('Error', data.error || 'Failed to delete category.', 'danger');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Network error deleting category.', 'danger');
    }
  };

  // Fetch Orders List with Auto-Retry for Render Cold Starts
  const fetchOrders = async (retryCount = 0) => {
    setLoadingOrders(true);
    setOrdersError(false);
    try {
      const token = localStorage.getItem('emahu_admin_token');
      if (!token) return;

      const res = await fetch(`/api/orders/admin/all`, {
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
        setOrders(data.orders || []);
        setOrdersError(false);
      } else {
        if (retryCount < 3) {
          console.warn(`Orders fetch failed, retrying in 3s... (attempt ${retryCount + 1})`);
          setTimeout(() => fetchOrders(retryCount + 1), 3000);
        } else {
          setOrdersError(true);
          triggerToast('Error', data.error || 'Failed to fetch orders list.', 'danger');
        }
      }
    } catch (err) {
      console.error(err);
      if (retryCount < 3) {
        console.warn(`Orders fetch error, retrying in 3s... (attempt ${retryCount + 1})`);
        setTimeout(() => fetchOrders(retryCount + 1), 3000);
      } else {
        setOrdersError(true);
        triggerToast('Error', 'Network error fetching orders.', 'danger');
      }
    } finally {
      if (retryCount === 0 || retryCount >= 3) {
        setLoadingOrders(false);
      }
    }
  };

  // Fetch Delivery Partners List
  const fetchDeliveryPartners = async () => {
    setLoadingDeliveryPartners(true);
    setDeliveryPartnersError(false);
    try {
      const token = localStorage.getItem('emahu_admin_token');
      if (!token) return;

      const res = await fetch(`/api/auth/admin/delivery-partners`, {
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
        setDeliveryPartners(data.deliveryPartners || []);
        setDeliveryPartnersError(false);
      } else {
        setDeliveryPartnersError(true);
        triggerToast('Error', data.error || 'Failed to fetch delivery partners.', 'danger');
      }
    } catch (err) {
      console.error(err);
      setDeliveryPartnersError(true);
      triggerToast('Error', 'Network error fetching delivery partners.', 'danger');
    } finally {
      setLoadingDeliveryPartners(false);
    }
  };

  // Update Order (tracking and status)
  const handleUpdateOrder = async (orderId, updateData, successMsg = 'Order updated successfully') => {
    setActionLoadingOrder(prev => ({ ...prev, [orderId]: true }));
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success) {
        setOrders(prev => prev.map(o => o.orderId === orderId ? data.order : o));
        if (selectedDetailOrder && selectedDetailOrder.orderId === orderId) {
          setSelectedDetailOrder(data.order);
        }
        triggerToast('Order Updated', successMsg, 'success');
      } else {
        triggerToast('Error', data.error || 'Failed to update order.', 'danger');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Network error updating order.', 'danger');
    } finally {
      setActionLoadingOrder(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handlePayoutFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPayoutReceiptFile(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const submitMerchantPayout = async (orderId) => {
    if (!payoutReceiptFile) {
      triggerToast('Error', 'Please attach a transaction receipt file.', 'danger');
      return;
    }
    setPayoutSubmitting(true);
    try {
      const token = localStorage.getItem('emahu_admin_token');

      const orderTotal = selectedDetailOrder.total || 0;
      const productAmount = selectedDetailOrder.productAmount || orderTotal;
      const feePercent = selectedDetailOrder.platformFeePercent !== undefined ? selectedDetailOrder.platformFeePercent : platformFeePercent;
      const feeAmount = parseFloat(((productAmount * feePercent) / 100).toFixed(2));
      const penaltyAmt = parseFloat(adminPenaltyAmount) || 0;
      const netPayout = parseFloat((productAmount - feeAmount - penaltyAmt).toFixed(2));

      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentStatus: 'paid',
          transactionFile: payoutReceiptFile,
          transactionDate: new Date(),
          penaltyAmount: penaltyAmt,
          penaltyReason: adminPenaltyReason || '',
          platformFeePercent: feePercent,
          platformFeeAmount: feeAmount,
          sellerNetPayout: netPayout,
          paymentReleased: true,
          paymentReleasedAt: new Date()
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast('Success', 'Merchant payout confirmed and receipt saved.', 'success');
        // Update the orders state list
        setOrders(prev => prev.map(o => o.orderId === orderId ? data.order : o));
        // Update the selected order details state
        setSelectedDetailOrder(data.order);
        setPayoutReceiptFile('');
        setAdminPenaltyAmount('0');
        setAdminPenaltyReason('');
      } else {
        triggerToast('Error', data.error || 'Failed to update payout status.', 'danger');
      }
    } catch (err) {
      console.error('Error submitting payout:', err);
      triggerToast('Error', 'Network error confirming merchant payout.', 'danger');
    } finally {
      setPayoutSubmitting(false);
    }
  };

  const handleOrderFulfillmentAction = async (order, actionType, customTrackingData = null) => {
    const orderId = order.orderId;
    let nextStatus = order.status;
    let successMsg = 'Order status updated successfully';
    const timeline = [...(order.timeline || [])];
    const updateData = {};

    const formatTimestamp = () => {
      return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    if (actionType === 'ASSIGN_CARRIER') {
      const carrierName = customTrackingData?.carrier || carrier || 'Delhivery';
      const trkId = customTrackingData?.trackingId || trackingId || '';
      const weight = customTrackingData?.packageWeight || packageWeight || '';
      const cost = Number(customTrackingData?.deliveryCost || deliveryCost || 0);
      const est = customTrackingData?.estDays || estDays || '';

      nextStatus = 'LABEL_GENERATED'; // transition directly to label generated as in seller dashboard

      const filtered1 = timeline.filter(t => t.status !== 'DELIVERY_ASSIGNED');
      filtered1.push({
        status: 'DELIVERY_ASSIGNED',
        label: 'Delivery Assigned (Admin)',
        desc: `🚚 Assigned to ${carrierName}. Tracking ID: ${trkId}`,
        date: formatTimestamp()
      });

      const filtered2 = filtered1.filter(t => t.status !== 'LABEL_GENERATED');
      filtered2.push({
        status: 'LABEL_GENERATED',
        label: 'Shipping Label Generated (Admin)',
        desc: `📄 Shipping label has been generated successfully by administrator.`,
        date: formatTimestamp()
      });

      updateData.carrier = carrierName;
      updateData.trackingId = trkId;
      updateData.packageWeight = weight;
      updateData.deliveryCost = cost;
      updateData.estDays = est;
      updateData.shipmentId = order.shipmentId || `EMH-SHIP-${Math.floor(100000 + Math.random() * 900000)}`;
      updateData.status = nextStatus;
      updateData.timeline = filtered2;
      successMsg = `Courier Assigned and label generated for Order #${orderId}.`;

    } else if (actionType === 'UPDATE_TRACKING_INFO') {
      updateData.carrier = carrier;
      updateData.trackingId = trackingId;
      updateData.packageWeight = packageWeight;
      updateData.deliveryCost = Number(deliveryCost);
      updateData.estDays = estDays;
      successMsg = `Tracking details updated for Order #${orderId}.`;

    } else if (actionType === 'MARK_READY') {
      nextStatus = 'READY_FOR_PICKUP';
      const filtered = timeline.filter(t => t.status !== 'READY_FOR_PICKUP');
      filtered.push({
        status: 'READY_FOR_PICKUP',
        label: 'Ready for Pickup (Admin)',
        desc: `📦 Package packed and ready for carrier pickup (Admin verified).`,
        date: formatTimestamp()
      });
      updateData.status = nextStatus;
      updateData.timeline = filtered;
      successMsg = `Order #${orderId} marked ready for pickup.`;

    } else if (actionType === 'SHIP') {
      nextStatus = 'PICKED_UP';
      const filtered = timeline.filter(t => t.status !== 'PICKED_UP');
      filtered.push({
        status: 'PICKED_UP',
        label: 'Shipment Picked Up (Admin)',
        desc: `📦 Courier partner ${order.carrier || 'Delhivery'} has picked up the package.`,
        date: formatTimestamp()
      });
      updateData.status = nextStatus;
      updateData.timeline = filtered;
      successMsg = `Order #${orderId} has been shipped.`;

    } else if (actionType === 'IN_TRANSIT') {
      nextStatus = 'IN_TRANSIT';
      const filtered = timeline.filter(t => t.status !== 'IN_TRANSIT');
      filtered.push({
        status: 'IN_TRANSIT',
        label: 'In Transit (Admin)',
        desc: `🚚 Order package is in transit via EV corridor.`,
        date: formatTimestamp()
      });
      updateData.status = nextStatus;
      updateData.timeline = filtered;
      successMsg = `Order #${orderId} marked as in transit.`;

    } else if (actionType === 'OUT_FOR_DELIVERY') {
      nextStatus = 'OUT_FOR_DELIVERY';
      const filtered = timeline.filter(t => t.status !== 'OUT_FOR_DELIVERY');
      filtered.push({
        status: 'OUT_FOR_DELIVERY',
        label: 'Out For Delivery (Admin)',
        desc: `🛵 Package is out for delivery with local dispatch rider.`,
        date: formatTimestamp()
      });
      updateData.status = nextStatus;
      updateData.timeline = filtered;
      successMsg = `Order #${orderId} is out for delivery.`;

    } else if (actionType === 'DELIVER') {
      nextStatus = 'COMPLETED';
      const filtered = timeline.filter(t => t.status !== 'DELIVERED');
      filtered.push({
        status: 'DELIVERED',
        label: 'Delivered (Admin)',
        desc: `✅ Order delivered successfully by administrator.`,
        date: formatTimestamp()
      });
      updateData.status = nextStatus;
      updateData.sellerConfirmed = true;
      updateData.timeline = filtered;
      successMsg = `Order #${orderId} marked as completed/delivered.`;
    }

    await handleUpdateOrder(orderId, updateData, successMsg);
  };

  // Fetch Notifications
  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    setNotificationsError(false);
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const res = await fetch(`/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setNotificationsError(false);
      } else {
        setNotificationsError(true);
      }
    } catch (err) {
      console.error(err);
      setNotificationsError(true);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Mark all notifications read
  // Mark all notifications read in parallel
  const markAllNotificationsRead = async () => {
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const unread = notifications.filter(n => !n.isRead);
      const promises = unread.map(n =>
        fetch(`/api/notifications/${n._id}/read`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => {
          if (res.status === 401) {
            handleSessionExpired();
            throw new Error('session_expired');
          }
        })
      );
      if (unread.length > 0) {
        await Promise.all(promises);
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
      const res = await fetch(`/api/auth/admin/sellers/${sellerId}/documents`, {
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

  // Fetch seller orders for payout settlements tab
  const fetchSellerOrders = async (sellerId) => {
    setLoadingSellerOrders(true);
    setSellerOrdersError(false);
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const res = await fetch(`/api/orders?sellerId=${sellerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success) {
        setSellerOrders(data.orders || []);
      } else {
        setSellerOrdersError(true);
        triggerToast('Error', data.error || 'Failed to fetch seller orders', 'danger');
      }
    } catch (err) {
      console.error(err);
      setSellerOrdersError(true);
      triggerToast('Error', 'Network error fetching seller orders', 'danger');
    } finally {
      setLoadingSellerOrders(false);
    }
  };

  // Release payment helper
  const handleReleasePayment = async (orderId, penaltyAmount, penaltyReason) => {
    setReleasingOrderId(orderId);
    setReleasedReceipt(null);
    try {
      const token = localStorage.getItem('emahu_admin_token');

      // 1. If penaltyAmount is > 0, first save it to the order
      if (parseFloat(penaltyAmount) > 0) {
        const orderRes = await fetch(`/api/orders/${orderId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            penaltyAmount: parseFloat(penaltyAmount),
            penaltyReason: penaltyReason || 'Admin Penalty Deduction'
          })
        });
        const orderData = await orderRes.json();
        if (!orderData.success) {
          triggerToast('Error', orderData.error || 'Failed to apply penalty to order', 'danger');
          setReleasingOrderId('');
          return;
        }
      }

      // 2. Call the release endpoint
      const releaseRes = await fetch(`/api/payment/release/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (releaseRes.status === 401) {
        handleSessionExpired();
        return;
      }
      const releaseData = await releaseRes.json();
      if (releaseData.success) {
        triggerToast('Success', `Payment for Order #${orderId} has been successfully released!`, 'success');

        // Show receipt dialog
        setReleasedReceipt({
          orderId: releaseData.orderId,
          productAmount: releaseData.productAmount,
          platformFeePercent: releaseData.platformFeePercent,
          platformFeeAmount: releaseData.platformFeeAmount,
          penaltyAmount: parseFloat(penaltyAmount) || 0,
          penaltyReason: penaltyReason || 'None',
          sellerNetPayout: releaseData.sellerNetPayout
        });

        // Re-fetch orders list for this seller
        if (selectedDetailSeller) {
          fetchSellerOrders(selectedDetailSeller._id);
          fetchSellers(); // refresh seller stats / total orders
        }
      } else {
        triggerToast('Error', releaseData.error || 'Failed to release payment', 'danger');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Network error releasing payment', 'danger');
    } finally {
      setReleasingOrderId('');
    }
  };

  // Verify a single document
  const handleVerifySellerDocument = async (sellerId, docId, status, feedback = '') => {
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const res = await fetch(`/api/auth/admin/sellers/${sellerId}/documents/${docId}`, {
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
      const res = await fetch(`/api/auth/admin/2fa/setup`, {
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
      const res = await fetch(`/api/auth/admin/2fa/verify`, {
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
      const res = await fetch(`/api/auth/admin/2fa/disable`, {
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

  const fetchPlatformSettings = async () => {
    setLoadingPlatformSettings(true);
    try {
      const res = await fetch(`/api/payment/settings`);
      const data = await res.json();
      if (data.success) {
        setPlatformFeePercent(data.platformFeePercent);
        setPlatformFeeName(data.platformFeeName || 'Emahu Platform Fee');
      }
    } catch (err) {
      console.error('fetchPlatformSettings error:', err);
      triggerToast('Error', 'Failed to fetch platform commission settings', 'danger');
    } finally {
      setLoadingPlatformSettings(false);
    }
  };

  const handleSavePlatformSettings = async () => {
    if (platformFeePercent < 0 || platformFeePercent > 100) {
      triggerToast('Validation Error', 'Commission percentage must be between 0 and 100.', 'warning');
      return;
    }
    setSavingPlatformSettings(true);
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const res = await fetch(`/api/payment/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          platformFeePercent: Number(platformFeePercent),
          platformFeeName
        })
      });
      const data = await res.json();
      if (data.success) {
        setPlatformFeePercent(data.platformFeePercent);
        setPlatformFeeName(data.platformFeeName);
        triggerToast('Success', `Platform commission updated to ${data.platformFeePercent}%`, 'success');
      } else {
        triggerToast('Error', data.error || 'Failed to update commission settings', 'danger');
      }
    } catch (err) {
      console.error('handleSavePlatformSettings error:', err);
      triggerToast('Error', 'Failed to update commission settings', 'danger');
    } finally {
      setSavingPlatformSettings(false);
    }
  };

  const fetchDeliverySettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch('/api/delivery/settings');
      const data = await res.json();
      if (data.success) {
        setDeliverySettings(data.settings || { slabs: [] });
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Failed to fetch delivery settings', 'danger');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveDeliverySettings = async (updatedSettings) => {
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const res = await fetch('/api/delivery/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedSettings)
      });
      const data = await res.json();
      if (data.success) {
        setDeliverySettings(data.settings);
        triggerToast('Success', 'Delivery settings updated successfully', 'success');
      } else {
        triggerToast('Error', data.error || 'Failed to update settings', 'danger');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Failed to update delivery settings', 'danger');
    }
  };

  // Lazy tab-based data loading — only fetch what's needed for the current tab.
  // Uses fetchedTabs Set to avoid redundant re-fetches on tab re-visits.
  useEffect(() => {
    if (!isAuthorized) return;

    // Pre-warm the Render backend to avoid cold-start delay
    let wakeTimer = setTimeout(() => setServerWaking(true), 1500);

    const doFetch = async (tab) => {
      try {
        // Always fetch notifications (lightweight, needed everywhere)
        if (!fetchedTabs.has('notifications')) {
          fetchNotifications();
        }

        if (tab === 'sellers' || tab === 'new-sellers') {
          if (!fetchedTabs.has('sellers')) {
            await fetchSellers();
          }
        } else if (tab === 'products-hub') {
          if (!fetchedTabs.has('products')) {
            await fetchProducts();
          }
        } else if (tab === 'stats') {
          const promises = [];
          if (!fetchedTabs.has('sellers')) promises.push(fetchSellers());
          if (!fetchedTabs.has('products')) promises.push(fetchProducts());
          if (!fetchedTabs.has('orders')) promises.push(fetchOrders());
          if (promises.length) await Promise.all(promises);
        } else if (tab === 'orders') {
          if (!fetchedTabs.has('orders')) {
            await fetchOrders();
          }
        } else if (tab === 'delivery-partners') {
          if (!fetchedTabs.has('delivery')) {
            await fetchDeliveryPartners();
          }
        } else if (tab === 'settings') {
          if (!fetchedTabs.has('settings')) {
            fetchDeliverySettings();
            fetchPlatformSettings();
          }
        } else if (tab === 'categories-hub') {
          if (!fetchedTabs.has('categories')) {
            await fetchCategories();
          }
        }

        // Mark this tab group as fetched
        setFetchedTabs(prev => {
          const next = new Set(prev);
          next.add('notifications');
          if (tab === 'sellers' || tab === 'new-sellers') next.add('sellers');
          else if (tab === 'products-hub') next.add('products');
          else if (tab === 'stats') { next.add('sellers'); next.add('products'); next.add('orders'); }
          else if (tab === 'orders') next.add('orders');
          else if (tab === 'delivery-partners') next.add('delivery');
          else if (tab === 'settings') next.add('settings');
          else if (tab === 'categories-hub') next.add('categories');
          return next;
        });
      } catch (err) {
        console.error('Error during admin tab data pre-warming:', err);
      } finally {
        clearTimeout(wakeTimer);
        setServerWaking(false);
      }
    };

    doFetch(activeTab);

    return () => clearTimeout(wakeTimer);
  }, [isAuthorized]);

  // Refresh tab data when changing tabs (lazy: only fetch if not yet cached)
  useEffect(() => {
    if (!isAuthorized) return;
    const tab = activeTab;

    const fetchIfNeeded = async () => {
      if (tab === 'sellers' || tab === 'new-sellers') {
        if (!fetchedTabs.has('sellers')) {
          await fetchSellers();
          setFetchedTabs(prev => { const n = new Set(prev); n.add('sellers'); return n; });
        } else {
          // Always refresh sellers list when switching to it (ensures fresh data)
          fetchSellers();
        }
      } else if (tab === 'products-hub') {
        if (!fetchedTabs.has('products')) {
          await fetchProducts();
          setFetchedTabs(prev => { const n = new Set(prev); n.add('products'); return n; });
        }
      } else if (tab === 'stats') {
        const promises = [];
        if (!fetchedTabs.has('sellers')) { promises.push(fetchSellers()); }
        if (!fetchedTabs.has('products')) { promises.push(fetchProducts()); }
        if (!fetchedTabs.has('orders')) { promises.push(fetchOrders()); }
        if (promises.length) {
          await Promise.all(promises);
          setFetchedTabs(prev => { const n = new Set(prev); n.add('sellers'); n.add('products'); n.add('orders'); return n; });
        }
      } else if (tab === 'orders') {
        if (!fetchedTabs.has('orders')) {
          await fetchOrders();
          setFetchedTabs(prev => { const n = new Set(prev); n.add('orders'); return n; });
        } else {
          fetchOrders();
        }
      } else if (tab === 'delivery-partners') {
        if (!fetchedTabs.has('delivery')) {
          await fetchDeliveryPartners();
          setFetchedTabs(prev => { const n = new Set(prev); n.add('delivery'); return n; });
        }
      } else if (tab === 'settings') {
        if (!fetchedTabs.has('settings')) {
          fetchDeliverySettings();
          fetchPlatformSettings();
          setFetchedTabs(prev => { const n = new Set(prev); n.add('settings'); return n; });
        }
      } else if (tab === 'notifications') {
        fetchNotifications();
      } else if (tab === 'categories-hub') {
        if (!fetchedTabs.has('categories')) {
          await fetchCategories();
          setFetchedTabs(prev => { const n = new Set(prev); n.add('categories'); return n; });
        }
      }
    };

    fetchIfNeeded();
  }, [activeTab]);

  useEffect(() => {
    setTimeout(() => {
      if (newPartnerServiceAreaCity.toLowerCase() === 'ahmedabad') {
        setNewPartnerLat('23.0225');
        setNewPartnerLon('72.5714');
      } else if (newPartnerServiceAreaCity.toLowerCase() === 'surat') {
        setNewPartnerLat('21.1702');
        setNewPartnerLon('72.8311');
      }
    }, 0);
  }, [newPartnerServiceAreaCity]);

  useEffect(() => {
    if (selectedDetailPartner) {
      setTimeout(() => {
        setEditPartnerRate(selectedDetailPartner.perItemCharge || '10');
        setEditPartnerRadius(selectedDetailPartner.serviceRadius || '999');
        setEditPartnerVehicleType(selectedDetailPartner.vehicleType || 'bike');
        setEditPartnerIsActive(selectedDetailPartner.isActivePartner !== false);
        setEditPartnerOperatingLocation(selectedDetailPartner.operatingLocation || '');
        setEditPartnerSalaryRequirement(selectedDetailPartner.salaryRequirement || '');
        setEditPartnerServiceAreaCountry(selectedDetailPartner.serviceAreaCountry || 'India');
        setEditPartnerServiceAreaRegion(selectedDetailPartner.serviceAreaRegion || selectedDetailPartner.currentArea || '');
        setEditPartnerServiceAreaDistrict(selectedDetailPartner.serviceAreaDistrict || '');
        setEditPartnerServiceAreaState(selectedDetailPartner.serviceAreaState || '');
        setEditPartnerServiceAreaCity(selectedDetailPartner.serviceAreaCity || '');
        setEditPartnerAddress(selectedDetailPartner.address || '');

        const cat = selectedDetailPartner.category || 'single_two_boy';
        setEditPartnerCategory(cat);
        setEditPartnerDeliveryScope(selectedDetailPartner.deliveryScope || 'local');
        setEditPartnerPerKmRate(String(selectedDetailPartner.perKmRate || selectedDetailPartner.perItemCharge || '5'));
        setEditPartnerCoveredCities(selectedDetailPartner.coveredCities || []);

        if (selectedDetailPartner.serviceAreaState) {
          if (Array.isArray(selectedDetailPartner.serviceAreaState)) {
            setEditPartnerServiceAreaState(selectedDetailPartner.serviceAreaState[0] || '');
            setEditPartnerSelectedStates(selectedDetailPartner.serviceAreaState);
          } else {
            setEditPartnerServiceAreaState(selectedDetailPartner.serviceAreaState);
            setEditPartnerSelectedStates([selectedDetailPartner.serviceAreaState]);
          }
        } else {
          setEditPartnerServiceAreaState('');
          setEditPartnerSelectedStates([]);
        }
      }, 0);
    }
  }, [selectedDetailPartner]);


  const handleAddSlab = () => {
    if (!newSlabFrom || !newSlabTo || !newSlabCharge) {
      alert('Please fill out all slab fields');
      return;
    }
    const updatedSlabs = [...(deliverySettings.slabs || []), {
      fromKm: Number(newSlabFrom),
      toKm: Number(newSlabTo),
      charge: Number(newSlabCharge)
    }];
    const updatedSettings = { ...deliverySettings, slabs: updatedSlabs };
    handleSaveDeliverySettings(updatedSettings);
    setNewSlabFrom('');
    setNewSlabTo('');
    setNewSlabCharge('');
  };

  const handleDeleteSlab = (indexToDelete) => {
    const updatedSlabs = (deliverySettings.slabs || []).filter((_, idx) => idx !== indexToDelete);
    const updatedSettings = { ...deliverySettings, slabs: updatedSlabs };
    handleSaveDeliverySettings(updatedSettings);
  };

  const handleAddPartnerSubmit = async (e) => {
    e.preventDefault();
    if (!newPartnerName || !newPartnerPhone) {
      alert('Please fill Name and Mobile Number');
      return;
    }
    if (newPartnerCategory === 'single_two_boy') {
      if (!newPartnerServiceAreaState) {
        alert('Service State is required');
        return;
      }
      if (!newPartnerCoveredCities || newPartnerCoveredCities.length === 0) {
        alert('Covered City is required');
        return;
      }
      if (newPartnerCoveredCities.length > 1) {
        alert('Single/Two Boy category can only select 1 city');
        return;
      }
    } else {
      if (!newPartnerSelectedStates || newPartnerSelectedStates.length === 0) {
        alert('At least one Service State is required');
        return;
      }
      if (!newPartnerCoveredCities || newPartnerCoveredCities.length === 0) {
        alert('At least one Covered City is required');
        return;
      }
      if (newPartnerDeliveryScope === 'local' && newPartnerCoveredCities.length > 2) {
        alert('Local Delivery Partners can select a maximum of 2 cities');
        return;
      }
    }
    if (!newPartnerPerKmRate || isNaN(newPartnerPerKmRate)) {
      alert('Please enter a valid rate per KM');
      return;
    }

    setNewPartnerLoading(true);
    const generatedEmail = `delivery_${newPartnerPhone.trim().replace(/[^0-9]/g, '') || Date.now()}_${Math.floor(1000 + Math.random() * 9000)}@emahu.com`;
    const generatedPassword = 'default_delivery_pass_123';
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const res = await fetch('/api/delivery/partners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newPartnerName,
          email: generatedEmail,
          password: generatedPassword,
          phone: newPartnerPhone,
          operatingLocation: newPartnerOperatingLocation,
          currentCity: newPartnerCoveredCities[0] || newPartnerServiceAreaCity,
          currentArea: newPartnerServiceAreaRegion,
          pincode: '382481',
          serviceRadius: 999,
          perItemCharge: parseFloat(newPartnerPerKmRate),
          perKmRate: parseFloat(newPartnerPerKmRate),
          vehicleType: newPartnerVehicleType,
          vehicleNumber: 'N/A',
          latitude: parseFloat(newPartnerLat),
          longitude: parseFloat(newPartnerLon),
          salaryRequirement: newPartnerSalaryRequirement,
          serviceAreaCountry: newPartnerServiceAreaCountry,
          serviceAreaRegion: newPartnerServiceAreaRegion,
          serviceAreaDistrict: newPartnerServiceAreaDistrict,
          serviceAreaState: newPartnerCategory === 'single_two_boy' ? newPartnerServiceAreaState : newPartnerSelectedStates,
          serviceAreaCity: newPartnerCoveredCities[0] || newPartnerServiceAreaCity,
          address: newPartnerAddress,
          coveredCities: newPartnerCoveredCities,
          deliveryScope: newPartnerDeliveryScope,
          category: newPartnerCategory
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast('Success', 'Delivery partner added successfully', 'success');
        setIsAddPartnerOpen(false);
        setNewPartnerName('');
        setNewPartnerPhone('');
        setNewPartnerOperatingLocation('');
        setNewPartnerSalaryRequirement('');
        setNewPartnerServiceAreaRegion('');
        setNewPartnerServiceAreaDistrict('');
        setNewPartnerServiceAreaState('');
        setNewPartnerServiceAreaCity('');
        setNewPartnerAddress('');
        setNewPartnerSelectedStates([]);
        setNewPartnerCoveredCities([]);
        fetchDeliveryPartners();
      } else {
        triggerToast('Error', data.error || 'Failed to create partner', 'danger');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Failed to add delivery partner', 'danger');
    } finally {
      setNewPartnerLoading(false);
    }
  };

  const handleSavePartnerChanges = async (partnerId) => {
    if (editPartnerCategory === 'single_two_boy') {
      if (!editPartnerServiceAreaState) {
        alert('Service State is required');
        return;
      }
      if (!editPartnerCoveredCities || editPartnerCoveredCities.length === 0) {
        alert('Covered City is required');
        return;
      }
      if (editPartnerCoveredCities.length > 1) {
        alert('Single/Two Boy category can only select 1 city');
        return;
      }
    } else {
      if (!editPartnerSelectedStates || editPartnerSelectedStates.length === 0) {
        alert('At least one Service State is required');
        return;
      }
      if (!editPartnerCoveredCities || editPartnerCoveredCities.length === 0) {
        alert('At least one Covered City is required');
        return;
      }
      if (editPartnerDeliveryScope === 'local' && editPartnerCoveredCities.length > 2) {
        alert('Local Delivery Partners can select a maximum of 2 cities');
        return;
      }
    }
    if (!editPartnerPerKmRate || isNaN(editPartnerPerKmRate)) {
      alert('Please enter a valid rate per KM');
      return;
    }

    try {
      const token = localStorage.getItem('emahu_admin_token');
      const res = await fetch(`/api/delivery/partners/${partnerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          perItemCharge: parseFloat(editPartnerPerKmRate),
          perKmRate: parseFloat(editPartnerPerKmRate),
          serviceRadius: parseFloat(editPartnerRadius),
          currentCity: editPartnerCoveredCities[0] || editPartnerServiceAreaCity,
          currentArea: editPartnerServiceAreaRegion,
          pincode: '382481',
          vehicleType: editPartnerVehicleType,
          vehicleNumber: 'N/A',
          isActivePartner: editPartnerIsActive,
          operatingLocation: editPartnerOperatingLocation,
          salaryRequirement: editPartnerSalaryRequirement,
          serviceAreaCountry: editPartnerServiceAreaCountry,
          serviceAreaRegion: editPartnerServiceAreaRegion,
          serviceAreaDistrict: editPartnerServiceAreaDistrict,
          serviceAreaState: editPartnerCategory === 'single_two_boy' ? editPartnerServiceAreaState : editPartnerSelectedStates,
          serviceAreaCity: editPartnerCoveredCities[0] || editPartnerServiceAreaCity,
          address: editPartnerAddress,
          coveredCities: editPartnerCoveredCities,
          deliveryScope: editPartnerDeliveryScope,
          category: editPartnerCategory
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast('Success', 'Partner details updated successfully', 'success');
        setSelectedDetailPartner(null);
        fetchDeliveryPartners();
      } else {
        triggerToast('Error', data.error || 'Failed to update partner', 'danger');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Failed to update partner details', 'danger');
    }
  };

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
      const res = await fetch(`/api/auth/admin/sellers/${id}/decision`, {
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
        setSelectedDetailSeller(null);
        setSellers(prev => prev.map(s => s._id === id ? data.seller : s));
        triggerToast('Seller Updated', `Seller account status changed to '${decision}' successfully.`, 'success');
      } else {
        triggerToast('Error', data.error || 'Failed to update seller.', 'danger');
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // Admin Delivery Partner Account Decision
  const handleDeliveryPartnerDecision = async (id, decision, feedback = '') => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const res = await fetch(`/api/auth/admin/delivery-partners/${id}/decision`, {
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
        setSelectedDetailPartner(null);
        setDeliveryPartners(prev => prev.map(p => p._id === id ? data.deliveryPartner : p));
        triggerToast('Partner Updated', `Delivery partner status updated to '${decision}' successfully.`, 'success');
      } else {
        triggerToast('Error', data.error || 'Failed to update delivery partner.', 'danger');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Network error updating delivery partner status.', 'danger');
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // Admin Product Listing Decision
  const handleProductDecision = async (id, decision, reason = '', sku = '') => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const token = localStorage.getItem('emahu_admin_token');
      const res = await fetch(`/api/products/${id}/admin-decision`, {
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
        setSelectedDetailProduct(null);
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
    setFeedbackText(
      decision === 'more_info_requested'
        ? 'Please provide additional details or verify your uploaded documents.'
        : ''
    );
    setIsFeedbackModalOpen(true);
  };

  const submitFeedback = () => {
    setIsFeedbackModalOpen(false);
    if (feedbackType === 'product') {
      handleProductDecision(feedbackTargetId, feedbackDecision, feedbackText);
    } else if (feedbackType === 'delivery') {
      handleDeliveryPartnerDecision(feedbackTargetId, feedbackDecision, feedbackText);
    } else {
      handleSellerDecision(feedbackTargetId, feedbackDecision, feedbackText);
    }
  };

  if (!isAuthorized) {
    return (
      <div suppressHydrationWarning={true} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0a0b10', color: '#fff' }}>
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
      {/* Server wake-up banner — shows only during Render cold start */}
      {serverWaking && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 20px',
          background: 'linear-gradient(90deg, #1e1b4b, #1e3a5f)',
          borderBottom: '1px solid rgba(99,102,241,0.3)',
          fontSize: '0.82rem', color: '#c7d2fe', fontWeight: 500,
        }} role="status" aria-live="polite">
          <span style={{
            width: 14, height: 14, borderRadius: '50%',
            border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#818cf8',
            animation: 'spin 0.8s linear infinite', display: 'inline-block', flexShrink: 0
          }} />
          <span>Connecting to server… warming up (first load may take a few seconds)</span>
        </div>
      )}

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

      {/* Add Partner Modal */}
      {isAddPartnerOpen && (
        <div className="ad-modal-overlay" onClick={() => setIsAddPartnerOpen(false)}>
          <div className="ad-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="ad-detail-close" onClick={() => setIsAddPartnerOpen(false)}>✕</button>
            <div className="ad-detail-header-block">
              <div className="ad-detail-title-section">
                <h3 className="ad-detail-store-name">Add New Delivery Partner</h3>
                <div className="ad-detail-store-meta">
                  <span>Register a new dispatch carrier in the platform.</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleAddPartnerSubmit} style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', minHeight: '120px', display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
              <div className="ad-detail-info-grid">
                <div className="ad-detail-info-section">
                  <h4>Carrier Credentials & Specs</h4>

                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>Name / Driver Name</label>
                    <input
                      type="text"
                      required
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem' }}
                      value={newPartnerName}
                      onChange={(e) => setNewPartnerName(e.target.value)}
                    />
                  </div>

                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>Mobile Number</label>
                    <input
                      type="text"
                      required
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem' }}
                      value={newPartnerPhone}
                      onChange={(e) => setNewPartnerPhone(e.target.value)}
                    />
                  </div>

                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>Operating Location / City Hub</label>
                    <input
                      type="text"
                      required
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem' }}
                      value={newPartnerOperatingLocation}
                      onChange={(e) => setNewPartnerOperatingLocation(e.target.value)}
                    />
                  </div>

                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>Salary Requirement</label>
                    <input
                      type="text"
                      required
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem' }}
                      value={newPartnerSalaryRequirement}
                      onChange={(e) => setNewPartnerSalaryRequirement(e.target.value)}
                    />
                  </div>

                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>Street Address</label>
                    <input
                      type="text"
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem' }}
                      value={newPartnerAddress}
                      onChange={(e) => setNewPartnerAddress(e.target.value)}
                    />
                  </div>

                  {/* Category Selector */}
                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>Category</label>
                    <select
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem', backgroundColor: '#18181b', color: '#fff' }}
                      value={newPartnerCategory}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewPartnerCategory(val);
                        if (val === 'single_two_boy') {
                          setNewPartnerDeliveryScope('local');
                        }
                        setNewPartnerCoveredCities([]);
                        setNewPartnerSelectedStates([]);
                      }}
                    >
                      <option value="single_two_boy">Single/Two Boy Delivery</option>
                      <option value="agency">Delivery Agency</option>
                      <option value="partner">Delivery Partner</option>
                    </select>
                  </div>

                  {/* Delivery Scope Selector */}
                  {newPartnerCategory !== 'single_two_boy' && (
                    <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>Delivery Scope</label>
                      <select
                        className="ad-modal-input"
                        style={{ margin: 0, height: '36px', fontSize: '0.85rem', backgroundColor: '#18181b', color: '#fff' }}
                        value={newPartnerDeliveryScope}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewPartnerDeliveryScope(val);
                          if (val === 'local' && newPartnerCoveredCities.length > 2) {
                            setNewPartnerCoveredCities(newPartnerCoveredCities.slice(0, 2));
                          }
                        }}
                      >
                        <option value="local">Local Delivery Partner</option>
                        <option value="intercity">Intercity Delivery Partner</option>
                      </select>
                    </div>
                  )}

                  {/* State Selector */}
                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>
                      {newPartnerCategory === 'single_two_boy' ? 'Service State' : 'Service States (Select Multiple)'}
                    </label>
                    {newPartnerCategory === 'single_two_boy' ? (
                      <select
                        className="ad-modal-input"
                        style={{ margin: 0, height: '36px', fontSize: '0.85rem', backgroundColor: '#18181b', color: '#fff' }}
                        value={newPartnerServiceAreaState}
                        onChange={(e) => {
                          setNewPartnerServiceAreaState(e.target.value);
                          setNewPartnerCoveredCities([]);
                        }}
                      >
                        <option value="">Select State</option>
                        {Object.keys(indiaStatesCities).map((stateName) => (
                          <option key={stateName} value={stateName}>{stateName}</option>
                        ))}
                      </select>
                    ) : (
                      <select
                        className="ad-modal-input"
                        style={{ margin: 0, height: '36px', fontSize: '0.85rem', backgroundColor: '#18181b', color: '#fff' }}
                        value=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          if (!newPartnerSelectedStates.includes(val)) {
                            setNewPartnerSelectedStates([...newPartnerSelectedStates, val]);
                          }
                        }}
                      >
                        <option value="">Select State to Add</option>
                        {Object.keys(indiaStatesCities).map((stateName) => (
                          <option key={stateName} value={stateName}>{stateName}</option>
                        ))}
                      </select>
                    )}

                    {newPartnerCategory !== 'single_two_boy' && newPartnerSelectedStates.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                        {newPartnerSelectedStates.map((st) => (
                          <span key={st} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#3f3f46', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                            {st}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = newPartnerSelectedStates.filter(s => s !== st);
                                setNewPartnerSelectedStates(updated);
                                const citiesOfState = indiaStatesCities[st] || [];
                                setNewPartnerCoveredCities(newPartnerCoveredCities.filter(c => !citiesOfState.includes(c)));
                              }}
                              style={{ border: 'none', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem', padding: 0, marginLeft: '2px', fontWeight: 'bold' }}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* City Selector */}
                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>
                      {newPartnerCategory === 'single_two_boy' ? 'Service City' : 'Covered Cities'}
                    </label>
                    {newPartnerCategory === 'single_two_boy' ? (
                      <select
                        className="ad-modal-input"
                        style={{ margin: 0, height: '36px', fontSize: '0.85rem', backgroundColor: '#18181b', color: '#fff' }}
                        value={newPartnerCoveredCities[0] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            setNewPartnerCoveredCities([val]);
                          } else {
                            setNewPartnerCoveredCities([]);
                          }
                        }}
                        disabled={!newPartnerServiceAreaState}
                      >
                        <option value="">{newPartnerServiceAreaState ? "Select City" : "First Select a State"}</option>
                        {newPartnerServiceAreaState && (indiaStatesCities[newPartnerServiceAreaState] || []).map((cityName) => (
                          <option key={cityName} value={cityName}>{cityName}</option>
                        ))}
                      </select>
                    ) : (
                      <select
                        className="ad-modal-input"
                        style={{ margin: 0, height: '36px', fontSize: '0.85rem', backgroundColor: '#18181b', color: '#fff' }}
                        value=""
                        onChange={(e) => {
                          const selectedCity = e.target.value;
                          if (!selectedCity) return;

                          if (newPartnerDeliveryScope === 'local' && newPartnerCoveredCities.length >= 2) {
                            alert('Local Delivery Partners can select a maximum of 2 cities.');
                            return;
                          }

                          if (newPartnerCoveredCities.includes(selectedCity)) {
                            return;
                          }

                          setNewPartnerCoveredCities([...newPartnerCoveredCities, selectedCity]);
                        }}
                        disabled={newPartnerSelectedStates.length === 0}
                      >
                        <option value="">{newPartnerSelectedStates.length > 0 ? "Select City to Add" : "First Select at Least One State"}</option>
                        {newPartnerSelectedStates.flatMap(st => (indiaStatesCities[st] || []).map(cityName => ({ state: st, city: cityName })))
                          .map(({ state, city }) => (
                            <option key={`${state}-${city}`} value={city}>{city} ({state})</option>
                          ))
                        }
                      </select>
                    )}

                    {newPartnerCategory !== 'single_two_boy' && newPartnerCoveredCities.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                        {newPartnerCoveredCities.map((city) => (
                          <span key={city} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0d9488', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                            {city}
                            <button
                              type="button"
                              onClick={() => setNewPartnerCoveredCities(newPartnerCoveredCities.filter(c => c !== city))}
                              style={{ border: 'none', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem', padding: 0, marginLeft: '2px', fontWeight: 'bold' }}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rate per Kilometer */}
                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>Rate Per KM (₹)</label>
                    <input
                      type="number"
                      required
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem' }}
                      value={newPartnerPerKmRate}
                      onChange={(e) => setNewPartnerPerKmRate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="ad-detail-info-section">
                  <h4>Service Territory Hierarchy</h4>

                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>Country</label>
                    <input
                      type="text"
                      required
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem' }}
                      value={newPartnerServiceAreaCountry}
                      onChange={(e) => setNewPartnerServiceAreaCountry(e.target.value)}
                    />
                  </div>

                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>Region</label>
                    <input
                      type="text"
                      required
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem' }}
                      value={newPartnerServiceAreaRegion}
                      onChange={(e) => setNewPartnerServiceAreaRegion(e.target.value)}
                    />
                  </div>

                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>District</label>
                    <input
                      type="text"
                      required
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem' }}
                      value={newPartnerServiceAreaDistrict}
                      onChange={(e) => setNewPartnerServiceAreaDistrict(e.target.value)}
                    />
                  </div>

                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>State</label>
                    <input
                      type="text"
                      required
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem' }}
                      value={newPartnerServiceAreaState}
                      onChange={(e) => setNewPartnerServiceAreaState(e.target.value)}
                    />
                  </div>

                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>City</label>
                    <select
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem', backgroundColor: '#18181b', color: '#fff' }}
                      value={newPartnerServiceAreaCity}
                      onChange={(e) => setNewPartnerServiceAreaCity(e.target.value)}
                    >
                      <option value="">Select City</option>
                      <option value="Ahmedabad">Ahmedabad</option>
                      <option value="Surat">Surat</option>
                      <option value="Rajkot">Rajkot</option>
                      <option value="Vadodara">Vadodara</option>
                      <option value="Mumbai">Mumbai</option>
                      <option value="Delhi">Delhi</option>
                      <option value="All">All Cities</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="ad-detail-decision-bar" style={{ marginTop: '20px' }}>
                <button
                  type="submit"
                  className="ad-btn-action approve"
                  style={{ height: '42px', padding: '0 24px', fontSize: '0.9rem' }}
                  disabled={newPartnerLoading}
                >
                  {newPartnerLoading ? 'Adding Partner...' : 'Create Partner Account'}
                </button>
                <button
                  type="button"
                  className="ad-btn-sec"
                  style={{ height: '42px', padding: '0 20px', fontSize: '0.9rem' }}
                  onClick={() => setIsAddPartnerOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {isFeedbackModalOpen && (
        <div className="ad-modal-overlay ad-feedback-overlay">
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
      {/* Premium Delivery Partner Detail Drawer/Modal */}
      {selectedDetailPartner && (
        <div className="ad-modal-overlay" onClick={() => setSelectedDetailPartner(null)}>
          <div className="ad-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="ad-detail-close" onClick={() => setSelectedDetailPartner(null)}>✕</button>

            <div className="ad-detail-header-block">
              <div className="ad-detail-title-section">
                <h3 className="ad-detail-store-name">{selectedDetailPartner.name || 'Delivery Partner'}</h3>
                <div className="ad-detail-store-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  <span>📍 Hub: {selectedDetailPartner.operatingLocation || 'Unspecified Hub'}</span>
                  <span>•</span>
                  <span>📞 Phone: {selectedDetailPartner.phone || 'N/A'}</span>
                  <span>•</span>
                  <span>📧 Email: {selectedDetailPartner.email || 'N/A'}</span>
                </div>
                {selectedDetailPartner.address && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-admin-muted)', marginTop: '4px' }}>
                    🏢 HQ Address: {selectedDetailPartner.address}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '2px' }}>
                  {selectedDetailPartner.vehicleNumber && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-admin-muted)' }}>
                      ⚙️ Fleet Number: {selectedDetailPartner.vehicleNumber}
                    </span>
                  )}
                  {selectedDetailPartner.vehicleType && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-admin-muted)' }}>
                      • 🏍️ Type: {selectedDetailPartner.vehicleType.toUpperCase()}
                    </span>
                  )}
                  {selectedDetailPartner.pincode && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-admin-muted)' }}>
                      • 📮 Pincode: {selectedDetailPartner.pincode}
                    </span>
                  )}
                </div>
              </div>
              <span className={`ad-status-badge ${selectedDetailPartner.status}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                {selectedDetailPartner.status?.toUpperCase()}
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', minHeight: '120px', display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
              <div className="ad-detail-info-grid">
                <div className="ad-detail-info-section">
                  <h4>Edit Fleet Parameters</h4>

                  {/* Category Selector */}
                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>Category</label>
                    <select
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem', backgroundColor: '#18181b', color: '#fff' }}
                      value={editPartnerCategory}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditPartnerCategory(val);
                        if (val === 'single_two_boy') {
                          setEditPartnerDeliveryScope('local');
                        }
                        setEditPartnerCoveredCities([]);
                        setEditPartnerSelectedStates([]);
                      }}
                    >
                      <option value="single_two_boy">Single/Two Boy Delivery</option>
                      <option value="agency">Delivery Agency</option>
                      <option value="partner">Delivery Partner</option>
                    </select>
                  </div>

                  {/* Delivery Scope Selector */}
                  {editPartnerCategory !== 'single_two_boy' && (
                    <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>Delivery Scope</label>
                      <select
                        className="ad-modal-input"
                        style={{ margin: 0, height: '36px', fontSize: '0.85rem', backgroundColor: '#18181b', color: '#fff' }}
                        value={editPartnerDeliveryScope}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditPartnerDeliveryScope(val);
                          if (val === 'local' && editPartnerCoveredCities.length > 2) {
                            setEditPartnerCoveredCities(editPartnerCoveredCities.slice(0, 2));
                          }
                        }}
                      >
                        <option value="local">Local Delivery Partner</option>
                        <option value="intercity">Intercity Delivery Partner</option>
                      </select>
                    </div>
                  )}

                  {/* State Selector */}
                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>
                      {editPartnerCategory === 'single_two_boy' ? 'Service State' : 'Service States (Select Multiple)'}
                    </label>
                    {editPartnerCategory === 'single_two_boy' ? (
                      <select
                        className="ad-modal-input"
                        style={{ margin: 0, height: '36px', fontSize: '0.85rem', backgroundColor: '#18181b', color: '#fff' }}
                        value={editPartnerServiceAreaState}
                        onChange={(e) => {
                          setEditPartnerServiceAreaState(e.target.value);
                          setEditPartnerCoveredCities([]);
                        }}
                      >
                        <option value="">Select State</option>
                        {Object.keys(indiaStatesCities).map((stateName) => (
                          <option key={stateName} value={stateName}>{stateName}</option>
                        ))}
                      </select>
                    ) : (
                      <select
                        className="ad-modal-input"
                        style={{ margin: 0, height: '36px', fontSize: '0.85rem', backgroundColor: '#18181b', color: '#fff' }}
                        value=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          if (!editPartnerSelectedStates.includes(val)) {
                            setEditPartnerSelectedStates([...editPartnerSelectedStates, val]);
                          }
                        }}
                      >
                        <option value="">Select State to Add</option>
                        {Object.keys(indiaStatesCities).map((stateName) => (
                          <option key={stateName} value={stateName}>{stateName}</option>
                        ))}
                      </select>
                    )}

                    {editPartnerCategory !== 'single_two_boy' && editPartnerSelectedStates.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                        {editPartnerSelectedStates.map((st) => (
                          <span key={st} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#3f3f46', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                            {st}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = editPartnerSelectedStates.filter(s => s !== st);
                                setEditPartnerSelectedStates(updated);
                                const citiesOfState = indiaStatesCities[st] || [];
                                setEditPartnerCoveredCities(editPartnerCoveredCities.filter(c => !citiesOfState.includes(c)));
                              }}
                              style={{ border: 'none', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem', padding: 0, marginLeft: '2px', fontWeight: 'bold' }}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* City Selector */}
                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>
                      {editPartnerCategory === 'single_two_boy' ? 'Service City' : 'Covered Cities'}
                    </label>
                    {editPartnerCategory === 'single_two_boy' ? (
                      <select
                        className="ad-modal-input"
                        style={{ margin: 0, height: '36px', fontSize: '0.85rem', backgroundColor: '#18181b', color: '#fff' }}
                        value={editPartnerCoveredCities[0] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            setEditPartnerCoveredCities([val]);
                          } else {
                            setEditPartnerCoveredCities([]);
                          }
                        }}
                        disabled={!editPartnerServiceAreaState}
                      >
                        <option value="">{editPartnerServiceAreaState ? "Select City" : "First Select a State"}</option>
                        {editPartnerServiceAreaState && (indiaStatesCities[editPartnerServiceAreaState] || []).map((cityName) => (
                          <option key={cityName} value={cityName}>{cityName}</option>
                        ))}
                      </select>
                    ) : (
                      <select
                        className="ad-modal-input"
                        style={{ margin: 0, height: '36px', fontSize: '0.85rem', backgroundColor: '#18181b', color: '#fff' }}
                        value=""
                        onChange={(e) => {
                          const selectedCity = e.target.value;
                          if (!selectedCity) return;

                          if (editPartnerDeliveryScope === 'local' && editPartnerCoveredCities.length >= 2) {
                            alert('Local Delivery Partners can select a maximum of 2 cities.');
                            return;
                          }

                          if (editPartnerCoveredCities.includes(selectedCity)) {
                            return;
                          }

                          setEditPartnerCoveredCities([...editPartnerCoveredCities, selectedCity]);
                        }}
                        disabled={editPartnerSelectedStates.length === 0}
                      >
                        <option value="">{editPartnerSelectedStates.length > 0 ? "Select City to Add" : "First Select at Least One State"}</option>
                        {editPartnerSelectedStates.flatMap(st => (indiaStatesCities[st] || []).map(cityName => ({ state: st, city: cityName })))
                          .map(({ state, city }) => (
                            <option key={`${state}-${city}`} value={city}>{city} ({state})</option>
                          ))
                        }
                      </select>
                    )}

                    {editPartnerCategory !== 'single_two_boy' && editPartnerCoveredCities.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                        {editPartnerCoveredCities.map((city) => (
                          <span key={city} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0d9488', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                            {city}
                            <button
                              type="button"
                              onClick={() => setEditPartnerCoveredCities(editPartnerCoveredCities.filter(c => c !== city))}
                              style={{ border: 'none', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem', padding: 0, marginLeft: '2px', fontWeight: 'bold' }}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rate per Kilometer */}
                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>Rate Per KM (₹)</label>
                    <input
                      type="number"
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem' }}
                      value={editPartnerPerKmRate}
                      onChange={(e) => setEditPartnerPerKmRate(e.target.value)}
                    />
                  </div>

                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>Operating Location / City Hub</label>
                    <input
                      type="text"
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem' }}
                      value={editPartnerOperatingLocation}
                      onChange={(e) => setEditPartnerOperatingLocation(e.target.value)}
                    />
                  </div>

                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>Salary Requirement</label>
                    <input
                      type="text"
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem' }}
                      value={editPartnerSalaryRequirement}
                      onChange={(e) => setEditPartnerSalaryRequirement(e.target.value)}
                    />
                  </div>

                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>Street Address</label>
                    <input
                      type="text"
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem' }}
                      value={editPartnerAddress}
                      onChange={(e) => setEditPartnerAddress(e.target.value)}
                    />
                  </div>
                </div>

                <div className="ad-detail-info-section">
                  <h4>Edit Service Territory Hierarchy</h4>

                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>Country</label>
                    <input
                      type="text"
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem' }}
                      value={editPartnerServiceAreaCountry}
                      onChange={(e) => setEditPartnerServiceAreaCountry(e.target.value)}
                    />
                  </div>

                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>Region</label>
                    <input
                      type="text"
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem' }}
                      value={editPartnerServiceAreaRegion}
                      onChange={(e) => setEditPartnerServiceAreaRegion(e.target.value)}
                    />
                  </div>

                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>District</label>
                    <input
                      type="text"
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem' }}
                      value={editPartnerServiceAreaDistrict}
                      onChange={(e) => setEditPartnerServiceAreaDistrict(e.target.value)}
                    />
                  </div>

                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>State</label>
                    <input
                      type="text"
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem' }}
                      value={editPartnerServiceAreaState}
                      onChange={(e) => setEditPartnerServiceAreaState(e.target.value)}
                    />
                  </div>

                  <div className="ad-detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>City</label>
                    <select
                      className="ad-modal-input"
                      style={{ margin: 0, height: '36px', fontSize: '0.85rem', backgroundColor: '#18181b', color: '#fff' }}
                      value={editPartnerServiceAreaCity}
                      onChange={(e) => setEditPartnerServiceAreaCity(e.target.value)}
                    >
                      <option value="Ahmedabad">Ahmedabad</option>
                      <option value="Surat">Surat</option>
                      <option value="Rajkot">Rajkot</option>
                      <option value="Vadodara">Vadodara</option>
                      <option value="Mumbai">Mumbai</option>
                      <option value="Delhi">Delhi</option>
                      <option value="All">All Cities</option>
                    </select>
                  </div>

                  <div className="ad-detail-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                    <input
                      type="checkbox"
                      id="editPartnerIsActive"
                      checked={editPartnerIsActive}
                      onChange={(e) => setEditPartnerIsActive(e.target.checked)}
                    />
                    <label htmlFor="editPartnerIsActive" style={{ fontSize: '0.85rem', color: '#fff', cursor: 'pointer' }}>
                      Carrier Active & Available for Orders
                    </label>
                  </div>
                </div>
              </div>

              {selectedDetailPartner.dispatchNotes && (
                <div className="ad-detail-info-section" style={{ width: '100%' }}>
                  <h4>Dispatch Remarks & Route Notes</h4>
                  <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-admin-border)', margin: '6px 0 0 0' }}>
                    {selectedDetailPartner.dispatchNotes}
                  </p>
                </div>
              )}
            </div>

            <div className="ad-detail-decision-bar" style={{ marginTop: '20px' }}>
              <button
                className="ad-btn-action approve"
                style={{ height: '42px', padding: '0 24px', fontSize: '0.9rem' }}
                onClick={() => handleSavePartnerChanges(selectedDetailPartner._id)}
              >
                Save Settings Changes
              </button>

              {selectedDetailPartner.status === 'pending' ? (
                <>
                  <button
                    className="ad-btn-action approve"
                    style={{ height: '42px', padding: '0 24px', fontSize: '0.9rem', background: '#3182ce' }}
                    onClick={() => {
                      handleDeliveryPartnerDecision(selectedDetailPartner._id, 'approve');
                    }}
                    disabled={actionLoading[selectedDetailPartner._id]}
                  >
                    {actionLoading[selectedDetailPartner._id] ? 'Updating...' : 'Approve Profile'}
                  </button>
                  <button
                    className="ad-btn-action reject"
                    style={{ height: '42px', padding: '0 24px', fontSize: '0.9rem' }}
                    onClick={() => {
                      openFeedbackModal('delivery', selectedDetailPartner._id, 'reject');
                    }}
                    disabled={actionLoading[selectedDetailPartner._id]}
                  >
                    Reject Application
                  </button>
                </>
              ) : selectedDetailPartner.status === 'approved' ? (
                <button
                  className="ad-btn-danger"
                  style={{ height: '42px', padding: '0 24px', fontSize: '0.9rem' }}
                  onClick={() => {
                    openFeedbackModal('delivery', selectedDetailPartner._id, 'reject');
                  }}
                  disabled={actionLoading[selectedDetailPartner._id]}
                >
                  Block/Suspend Partner
                </button>
              ) : (
                <button
                  className="ad-btn-action approve"
                  style={{ height: '42px', padding: '0 24px', fontSize: '0.9rem' }}
                  onClick={() => {
                    handleDeliveryPartnerDecision(selectedDetailPartner._id, 'approve');
                  }}
                  disabled={actionLoading[selectedDetailPartner._id]}
                >
                  Re-Approve Partner
                </button>
              )}
              <button className="ad-btn-sec" style={{ height: '42px', padding: '0 20px', fontSize: '0.9rem' }} onClick={() => setSelectedDetailPartner(null)}>
                Cancel
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
              <button
                className={`ad-detail-tab-trigger ${detailTab === 'settlement' ? 'active' : ''}`}
                onClick={() => {
                  setDetailTab('settlement');
                  fetchSellerOrders(selectedDetailSeller._id);
                }}
              >
                Payment Integration
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', minHeight: '120px' }}>
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

                  <div className="ad-detail-info-section">
                    <h4>Geographic Location</h4>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Shop Address</span>
                      <span className="ad-detail-row-val">{selectedDetailSeller.address || 'Not Set'}</span>
                    </div>
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">City &amp; State</span>
                      <span className="ad-detail-row-val">
                        {[selectedDetailSeller.city, selectedDetailSeller.state].filter(Boolean).join(', ') || 'Not Set'}
                      </span>
                    </div>
                    {selectedDetailSeller.latitude !== undefined && selectedDetailSeller.longitude !== undefined && (
                      <>
                        <div className="ad-detail-row">
                          <span className="ad-detail-row-label">GPS Coordinates</span>
                          <span className="ad-detail-row-val" style={{ fontFamily: 'monospace' }}>
                            {selectedDetailSeller.latitude.toFixed(6)}, {selectedDetailSeller.longitude.toFixed(6)}
                          </span>
                        </div>
                        <div style={{ marginTop: '10px' }}>
                          <a
                            href={`https://www.google.com/maps?q=${selectedDetailSeller.latitude},${selectedDetailSeller.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              background: 'rgba(65, 105, 225, 0.1)',
                              color: '#4169e1',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: '700',
                              textDecoration: 'none',
                              width: '100%',
                              textAlign: 'center'
                            }}
                          >
                            🗺️ View Shop on Google Maps
                          </a>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Documents Section directly on profile tab for immediate approval */}
                  <div className="ad-detail-info-section" style={{ marginTop: '24px' }}>
                    <h4 style={{ marginBottom: '14px' }}>Uploaded Compliance Documents (Immediate Audit)</h4>
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
                              <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); openDocInNewTab(doc.fileUrl); }}
                                className="ad-detail-doc-link"
                                style={{ display: 'inline-block', marginBottom: '8px' }}
                              >
                                🔗 Open Document File Reference
                              </a>
                              {isRealImage(doc.fileUrl) ? (
                                <div style={{
                                  marginTop: '8px',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  border: '1px solid var(--color-admin-border)',
                                  maxWidth: '100%',
                                  maxHeight: '240px',
                                  background: 'rgba(0,0,0,0.2)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <img
                                    src={cleanImageUrl(doc.fileUrl)}
                                    alt={doc.documentType}
                                    style={{ maxWidth: '100%', maxHeight: '240px', objectFit: 'contain', cursor: 'pointer' }}
                                    onClick={() => openDocInNewTab(cleanImageUrl(doc.fileUrl))}
                                  />
                                </div>
                              ) : doc.fileUrl && doc.fileUrl.toLowerCase().endsWith('.pdf') ? (
                                <div style={{
                                  marginTop: '8px',
                                  padding: '12px',
                                  borderRadius: '8px',
                                  background: 'rgba(255,255,255,0.02)',
                                  border: '1px solid var(--color-admin-border)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px'
                                }}>
                                  <span style={{ fontSize: '1.8rem' }}>📄</span>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '500' }}>
                                      {doc.fileUrl.split('/').pop() || 'document.pdf'}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>
                                      PDF Document
                                    </span>
                                  </div>
                                </div>
                              ) : null}
                              {doc.feedback && (
                                <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                                  Audit Rejection Reason: {doc.feedback}
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {doc.status === 'approved' && (
                                <span style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                                  🔒 Confirmed & Locked
                                </span>
                              )}
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

              {detailTab === 'payout' && (
                <div className="ad-detail-info-grid" style={{ alignItems: 'stretch' }}>
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

                  <div className="ad-detail-info-section" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ borderBottom: '1px solid var(--color-admin-border)', paddingBottom: '8px', marginBottom: '16px' }}>Tax Details</h4>
                      <div className="ad-detail-row">
                        <span className="ad-detail-row-label">GSTIN / Tax Code</span>
                        <span className="ad-detail-row-val" style={{ fontFamily: 'monospace' }}>{selectedDetailSeller.gstNumber || 'Not Provided'}</span>
                      </div>
                    </div>
                    <div className="ad-detail-row" style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.04)', paddingTop: '10px', marginTop: '10px' }}>
                      <span className="ad-detail-row-label">Bank Settlement Status</span>
                      <span className="ad-detail-row-val" style={{
                        color: selectedDetailSeller.status === 'approved' ? '#10b981' :
                          (selectedDetailSeller.status === 'suspended' || selectedDetailSeller.status === 'blocked') ? '#ef4444' :
                            selectedDetailSeller.status === 'rejected' ? '#ef4444' : '#f59e0b',
                        fontWeight: 'bold'
                      }}>
                        {selectedDetailSeller.status === 'approved' ? 'Active' :
                          (selectedDetailSeller.status === 'suspended' || selectedDetailSeller.status === 'blocked') ? 'Suspended' :
                            selectedDetailSeller.status === 'rejected' ? 'Rejected' : 'Pending Verification'}
                      </span>
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
                              <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); openDocInNewTab(doc.fileUrl); }}
                                className="ad-detail-doc-link"
                                style={{ display: 'inline-block', marginBottom: '8px' }}
                              >
                                🔗 Open Document File Reference
                              </a>
                              {isRealImage(doc.fileUrl) ? (
                                <div style={{
                                  marginTop: '8px',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  border: '1px solid var(--color-admin-border)',
                                  maxWidth: '100%',
                                  maxHeight: '240px',
                                  background: 'rgba(0,0,0,0.2)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <img
                                    src={cleanImageUrl(doc.fileUrl)}
                                    alt={doc.documentType}
                                    style={{ maxWidth: '100%', maxHeight: '240px', objectFit: 'contain', cursor: 'pointer' }}
                                    onClick={() => openDocInNewTab(cleanImageUrl(doc.fileUrl))}
                                  />
                                </div>
                              ) : doc.fileUrl && doc.fileUrl.toLowerCase().endsWith('.pdf') ? (
                                <div style={{
                                  marginTop: '8px',
                                  padding: '12px',
                                  borderRadius: '8px',
                                  background: 'rgba(255,255,255,0.02)',
                                  border: '1px solid var(--color-admin-border)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px'
                                }}>
                                  <span style={{ fontSize: '1.8rem' }}>📄</span>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '500' }}>
                                      {doc.fileUrl.split('/').pop() || 'document.pdf'}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-admin-muted)' }}>
                                      PDF Document
                                    </span>
                                  </div>
                                </div>
                              ) : null}
                              {doc.feedback && (
                                <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                                  Audit Rejection Reason: {doc.feedback}
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {doc.status === 'approved' && (
                                <span style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                                  🔒 Confirmed & Locked
                                </span>
                              )}
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

              {detailTab === 'settlement' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Bank card and financial summary overview */}
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch', flexWrap: 'wrap' }}>
                    {/* Bank Account Details */}
                    <div className="ad-detail-bank-card" style={{ flex: '1 1 350px', marginBottom: 0, height: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div className="ad-detail-bank-logo">
                        <span>🏦 {selectedDetailSeller.bankName || 'Settlement Bank'}</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>PAYOUT DESTINATION</span>
                      </div>
                      <div className="ad-detail-bank-number" style={{ fontSize: '1.25rem', margin: '20px 0' }}>
                        {selectedDetailSeller.accountNumber ? selectedDetailSeller.accountNumber.replace(/.(?=.{4})/g, '•') : '•••• •••• ••••'}
                      </div>
                      <div className="ad-detail-bank-holder">
                        <div>
                          <span>Account Holder</span>
                          <div style={{ fontSize: '0.85rem' }}>{selectedDetailSeller.bankHolder || 'Holder N/A'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span>IFSC Code</span>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{selectedDetailSeller.ifscCode || 'N/A'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div style={{ flex: '1.5 1 400px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="ad-detail-metric-card" style={{ padding: '14px' }}>
                        <span style={{ fontSize: '0.75rem' }}>Gross Products Value</span>
                        <h4 style={{ fontSize: '1.15rem' }}>
                          ₹{sellerOrders.reduce((sum, o) => sum + (o.productAmount || o.total || 0), 0).toLocaleString('en-IN')}
                        </h4>
                        <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>Across {sellerOrders.length} orders</span>
                      </div>
                      <div className="ad-detail-metric-card" style={{ padding: '14px' }}>
                        <span style={{ fontSize: '0.75rem' }}>Platform Fee Deducted</span>
                        <h4 style={{ fontSize: '1.15rem', color: '#f87171' }}>
                          ₹{sellerOrders.filter(o => o.paymentReleased).reduce((sum, o) => sum + (o.platformFeeAmount || 0), 0).toLocaleString('en-IN')}
                        </h4>
                        <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>Commission ({platformFeePercent}%)</span>
                      </div>
                      <div className="ad-detail-metric-card" style={{ padding: '14px' }}>
                        <span style={{ fontSize: '0.75rem' }}>Total Penalties Applied</span>
                        <h4 style={{ fontSize: '1.15rem', color: '#f87171' }}>
                          ₹{sellerOrders.reduce((sum, o) => sum + (o.penaltyAmount || 0), 0).toLocaleString('en-IN')}
                        </h4>
                        <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>Violation deductions</span>
                      </div>
                      <div className="ad-detail-metric-card" style={{ padding: '14px', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.02)' }}>
                        <span style={{ fontSize: '0.75rem', color: '#34d399' }}>Total Net Payout Released</span>
                        <h4 style={{ fontSize: '1.15rem', color: '#10b981' }}>
                          ₹{sellerOrders.filter(o => o.paymentReleased).reduce((sum, o) => sum + (o.sellerNetPayout || 0), 0).toLocaleString('en-IN')}
                        </h4>
                        <span style={{ fontSize: '0.68rem', opacity: 0.7, color: '#34d399' }}>Successfully Settled</span>
                      </div>
                    </div>
                  </div>

                  {/* Receipt display block when payment is newly released */}
                  {releasedReceipt && (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.15) 100%)',
                      border: '1.5px solid #10b981',
                      color: '#ffffff',
                      padding: '20px',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(16, 185, 129, 0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '800', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                          <span>✓</span> Payout Settlement Bill Generated Successfully
                        </span>
                        <button
                          onClick={() => setReleasedReceipt(null)}
                          style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', width: '26px', height: '26px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                        >
                          ✕
                        </button>
                      </div>
                      <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px', fontSize: '0.88rem', fontFamily: 'monospace' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px dashed rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                          <span>SETTLEMENT INVOICE ID:</span>
                          <strong style={{ color: '#6366f1' }}>#REC-{releasedReceipt.orderId}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span>Order Reference:</span>
                          <span>#{releasedReceipt.orderId}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span>Gross Merchandise Value:</span>
                          <span>₹{releasedReceipt.productAmount.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#fb923c' }}>
                          <span>Emahu Platform Fee ({releasedReceipt.platformFeePercent}%):</span>
                          <span>- ₹{releasedReceipt.platformFeeAmount.toFixed(2)}</span>
                        </div>
                        {releasedReceipt.penaltyAmount > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#f87171' }}>
                            <span>Merchant Penalty ({releasedReceipt.penaltyReason}):</span>
                            <span>- ₹{releasedReceipt.penaltyAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid rgba(255,255,255,0.15)', paddingTop: '10px', marginTop: '10px', fontSize: '1rem', fontWeight: '800', color: '#10b981' }}>
                          <span>TOTAL SETTLED PAYOUT:</span>
                          <span>₹{releasedReceipt.sellerNetPayout.toFixed(2)}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#a1a1aa', textAlign: 'center', marginTop: '2px' }}>
                        📢 Notification & settlement receipt successfully dispatched to vendor ({selectedDetailSeller.email}).
                      </div>
                    </div>
                  )}

                  {loadingSellerOrders ? (
                    <div className="ad-loading" style={{ padding: '40px 0' }}>
                      Loading merchant payout settlements...
                    </div>
                  ) : sellerOrdersError ? (
                    <div style={{ color: '#ef4444', textAlign: 'center', padding: '20px 0', fontSize: '0.9rem' }}>
                      Failed to retrieve settlement orders.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                      {/* SECTION 1: DELIVERED - READY FOR RELEASE */}
                      <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-admin-border)', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.1rem' }}>📥</span> Delivered - Ready for Settlement Payout
                          </h4>
                          <span style={{ fontSize: '0.75rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
                            {sellerOrders.filter(o => !o.paymentReleased && (o.status === 'DELIVERED' || o.status === 'COMPLETED' || o.deliveryStatus === 'delivered')).length} Orders
                          </span>
                        </div>

                        {sellerOrders.filter(o => !o.paymentReleased && (o.status === 'DELIVERED' || o.status === 'COMPLETED' || o.deliveryStatus === 'delivered')).length === 0 ? (
                          <div style={{ color: '#64748b', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>
                            No orders are currently waiting for payout settlement.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {sellerOrders.filter(o => !o.paymentReleased && (o.status === 'DELIVERED' || o.status === 'COMPLETED' || o.deliveryStatus === 'delivered')).map(order => {
                              const penalty = orderPenalties[order.orderId] || { amount: '', reason: '' };
                              const productVal = order.productAmount || order.total || 0;
                              const platformFee = parseFloat(((productVal * platformFeePercent) / 100).toFixed(2));
                              const penaltyVal = parseFloat(penalty.amount) || 0;
                              const estimatedNet = parseFloat((productVal - platformFee - penaltyVal).toFixed(2));

                              return (
                                <div key={order.orderId} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                      <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.88rem' }}>Order #{order.orderId}</div>
                                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                                        Date: {order.date || new Date(order.createdAt).toLocaleDateString()} | Buyer: {order.deliveryAddress?.fullName || 'N/A'}
                                      </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontWeight: '700', color: '#10b981', fontSize: '0.9rem' }}>₹{productVal.toLocaleString('en-IN')}</div>
                                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Product Value</span>
                                    </div>
                                  </div>

                                  {/* Items details */}
                                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', background: 'rgba(0,0,0,0.15)', padding: '8px 12px', borderRadius: '6px' }}>
                                    {(order.items || []).map((it, idx) => (
                                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{it.name} x {it.quantity}</span>
                                        <span>₹{(it.price * it.quantity).toLocaleString('en-IN')}</span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Penalty input widgets */}
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                                    <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Penalty Amount (₹)</label>
                                      <input
                                        type="number"
                                        placeholder="Optional Penalty (e.g. 50)"
                                        value={penalty.amount}
                                        onChange={(e) => setOrderPenalties(prev => ({
                                          ...prev,
                                          [order.orderId]: { ...penalty, amount: e.target.value }
                                        }))}
                                        style={{ height: '32px', fontSize: '0.78rem', padding: '0 8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', color: '#fff' }}
                                      />
                                    </div>
                                    <div style={{ flex: '2 1 200px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Reason for Penalty</label>
                                      <input
                                        type="text"
                                        placeholder="Optional Reason (e.g. late delivery)"
                                        value={penalty.reason}
                                        onChange={(e) => setOrderPenalties(prev => ({
                                          ...prev,
                                          [order.orderId]: { ...penalty, reason: e.target.value }
                                        }))}
                                        style={{ height: '32px', fontSize: '0.78rem', padding: '0 8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', color: '#fff' }}
                                      />
                                    </div>
                                  </div>

                                  {/* Settlement Summary Row & Action Button */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px', marginTop: '4px', flexWrap: 'wrap', gap: '10px' }}>
                                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem', color: '#94a3b8' }}>
                                      <span>Platform Fee ({platformFeePercent}%): <strong style={{ color: '#fff' }}>₹{platformFee}</strong></span>
                                      {penaltyVal > 0 && <span>Penalty: <strong style={{ color: '#ef4444' }}>-₹{penaltyVal}</strong></span>}
                                      <span>Net payout: <strong style={{ color: '#10b981', fontSize: '0.85rem' }}>₹{estimatedNet}</strong></span>
                                    </div>

                                    <button
                                      onClick={() => {
                                        setReleasePanel({ order, seller: selectedDetailSeller, penalty });
                                        setReleasePanelStep('bank');
                                      }}
                                      disabled={releasingOrderId === order.orderId}
                                      style={{
                                        padding: '7px 16px',
                                        fontSize: '0.78rem',
                                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        opacity: releasingOrderId === order.orderId ? 0.6 : 1,
                                        boxShadow: '0 2px 8px rgba(99,102,241,0.3)'
                                      }}
                                    >
                                      {releasingOrderId === order.orderId ? '⌛ Settling...' : '💰 Release Fund'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* SECTION 2: PENDING TRANSIT (NOT DELIVERED) */}
                      <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-admin-border)', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.1rem' }}>⌛</span> Pending Delivery / Transit (Not Delivered)
                          </h4>
                          <span style={{ fontSize: '0.75rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
                            {sellerOrders.filter(o => !['DELIVERED', 'COMPLETED', '🔓 FUNDS RELEASED'].includes(o.status) && o.status !== 'REJECTED' && !o.sellerRejected && !o.status?.includes('DISPUTED') && !o.status?.includes('FROZEN') && o.deliveryStatus !== 'delivered').length} Orders
                          </span>
                        </div>

                        {sellerOrders.filter(o => !['DELIVERED', 'COMPLETED', '🔓 FUNDS RELEASED'].includes(o.status) && o.status !== 'REJECTED' && !o.sellerRejected && !o.status?.includes('DISPUTED') && !o.status?.includes('FROZEN') && o.deliveryStatus !== 'delivered').length === 0 ? (
                          <div style={{ color: '#64748b', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>
                            No orders currently pending delivery.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {sellerOrders.filter(o => !['DELIVERED', 'COMPLETED', '🔓 FUNDS RELEASED'].includes(o.status) && o.status !== 'REJECTED' && !o.sellerRejected && !o.status?.includes('DISPUTED') && !o.status?.includes('FROZEN') && o.deliveryStatus !== 'delivered').map(order => (
                              <div key={order.orderId} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <div>
                                  <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.82rem' }}>Order #{order.orderId}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                    Destination: {order.deliveryAddress?.city || 'N/A'} | Distance: {order.distanceKm ? `${order.distanceKm} KM` : 'N/A'}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#fff' }}>₹{(order.productAmount || order.total).toLocaleString('en-IN')}</span>
                                  <span className={`ad-status-badge ${order.status?.toLowerCase()?.replace(/\s+/g, '_')}`} style={{ padding: '3px 8px', fontSize: '0.65rem' }}>
                                    {order.status?.replace(/_/g, ' ')}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* SECTION 3: DISPUTED / ISSUE ORDERS */}
                      <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-admin-border)', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.1rem' }}>⚠️</span> Disputed / Issue Orders (Payout Suspended)
                          </h4>
                          <span style={{ fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
                            {sellerOrders.filter(o => o.status === 'REJECTED' || o.sellerRejected || o.status?.includes('DISPUTED') || o.status?.includes('FROZEN')).length} Orders
                          </span>
                        </div>

                        {sellerOrders.filter(o => o.status === 'REJECTED' || o.sellerRejected || o.status?.includes('DISPUTED') || o.status?.includes('FROZEN')).length === 0 ? (
                          <div style={{ color: '#64748b', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>
                            No disputed or frozen orders found for this seller.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {sellerOrders.filter(o => o.status === 'REJECTED' || o.sellerRejected || o.status?.includes('DISPUTED') || o.status?.includes('FROZEN')).map(order => (
                              <div key={order.orderId} style={{ background: 'rgba(239, 68, 68, 0.02)', border: '1px solid rgba(239,68,68,0.08)', borderRadius: '8px', padding: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                  <div>
                                    <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.82rem' }}>Order #{order.orderId}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '2px' }}>
                                      Reason/Feedback: <strong style={{ color: '#fca5a5' }}>{order.rejectionReason || 'Emahu dispute raised / Admin Hold'}</strong>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#fff' }}>₹{(order.productAmount || order.total).toLocaleString('en-IN')}</span>
                                    <span className="ad-status-badge rejected" style={{ padding: '3px 8px', fontSize: '0.65rem' }}>
                                      Disputed
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* SECTION 4: SETTLED PAYOUTS (RELEASED) */}
                      <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-admin-border)', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.1rem' }}>✅</span> Completed Payout Settlements
                          </h4>
                          <span style={{ fontSize: '0.75rem', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
                            {sellerOrders.filter(o => o.paymentReleased || o.status === '🔓 FUNDS RELEASED').length} Settled
                          </span>
                        </div>

                        {sellerOrders.filter(o => o.paymentReleased || o.status === '🔓 FUNDS RELEASED').length === 0 ? (
                          <div style={{ color: '#64748b', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>
                            No payouts settled yet.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {sellerOrders.filter(o => o.paymentReleased || o.status === '🔓 FUNDS RELEASED').map(order => (
                              <div key={order.orderId} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <div>
                                  <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.82rem' }}>Order #{order.orderId}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                    Platform Fee deducted: ₹{order.platformFeeAmount || 0} ({order.platformFeePercent || platformFeePercent}%) {order.penaltyAmount > 0 ? `| Penalty: ₹${order.penaltyAmount}` : ''}
                                  </div>
                                </div>
                                <div style={{ textAlignment: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#34d399' }}>+ ₹{(order.sellerNetPayout || 0).toLocaleString('en-IN')}</span>
                                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Wired on {order.paymentReleasedAt ? new Date(order.paymentReleasedAt).toLocaleDateString() : 'Settled'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
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
                    style={{ height: '42px', padding: '0 24px', fontSize: '0.9rem', background: 'var(--color-admin-warning, #f59e0b)', color: '#000' }}
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

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', minHeight: '120px' }}>
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
                    {selectedDetailProduct.sizes && selectedDetailProduct.sizes.length > 0 && (
                      <div className="ad-detail-row">
                        <span className="ad-detail-row-label">
                          {['Apparel & Fashion', 'Fashion & Apparel'].includes(selectedDetailProduct.category) ? '👕 Sizes' :
                            selectedDetailProduct.category === 'Electronics & Tech' ? '💾 Specs/Storage' :
                              ['Kitchen & Dining', 'Lifestyle & Home', 'Home & Kitchen'].includes(selectedDetailProduct.category) ? '📐 Dimensions' :
                                selectedDetailProduct.category === 'Beauty & Cosmetics' ? '🧴 Volume/Finish' :
                                  selectedDetailProduct.category === 'Sports & Fitness' ? '🏋️ Weight' :
                                    '📦 Sizes/Variants'}
                        </span>
                        <span className="ad-detail-row-val" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'flex-end' }}>
                          {selectedDetailProduct.sizes.map(sz => (
                            <span key={sz} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>{sz}</span>
                          ))}
                        </span>
                      </div>
                    )}
                    {selectedDetailProduct.colors && selectedDetailProduct.colors.length > 0 && (
                      <div className="ad-detail-row">
                        <span className="ad-detail-row-label">🎨 Colors</span>
                        <span className="ad-detail-row-val" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'flex-end' }}>
                          {selectedDetailProduct.colors.map(colName => {
                            const hexMap = {
                              Red: '#ef4444', Blue: '#3b82f6', Black: '#1a1a1a', White: '#f5f5f5', Green: '#22c55e',
                              Yellow: '#eab308', Orange: '#f97316', Purple: '#a855f7', Pink: '#ec4899', Gray: '#6b7280',
                              Brown: '#92400e', Navy: '#1e3a8a', Beige: '#d4b896', Silver: '#cbd5e1', Gold: '#d97706'
                            };
                            const hexMatch = colName.match(/#(?:[0-9a-fA-F]{3}){1,2}\b/);
                            const hex = hexMatch ? hexMatch[0] : (hexMap[colName] || (colName.startsWith('#') ? colName : 'rgba(255,255,255,0.1)'));
                            return (
                              <span key={colName} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: hex, display: 'inline-block', border: (colName === 'White' || hex === '#f5f5f5' || hex === '#ffffff') ? '1px solid rgba(255,255,255,0.4)' : 'none' }} />
                                {colName}
                              </span>
                            );
                          })}
                        </span>
                      </div>
                    )}
                    <div style={{ marginTop: '10px' }}>
                      <span className="ad-detail-row-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem' }}>Description Summary</span>
                      <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-admin-border)', maxHeight: '120px', overflowY: 'auto' }}>
                        {selectedDetailProduct.description || 'No description provided by merchant.'}
                      </p>
                    </div>
                  </div>

                  <div className="ad-detail-info-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
                    <div style={{ width: '100%', height: '260px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-admin-border)', background: '#0a0b10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isRealImage(selectedDetailProduct.image) ? (
                        <img src={cleanImageUrl(selectedDetailProduct.image)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '5rem' }}>{cleanImageUrl(selectedDetailProduct.image) || '📦'}</span>
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
                      className="ad-btn-action warning"
                      style={{ height: '42px', padding: '0 24px', fontSize: '0.9rem' }}
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

      {/* Premium Order Detail Drawer/Modal */}
      {selectedDetailOrder && (
        <div className="ad-modal-overlay" onClick={() => setSelectedDetailOrder(null)}>
          <div className="ad-detail-modal" style={{ width: '950px' }} onClick={(e) => e.stopPropagation()}>
            <button className="ad-detail-close" onClick={() => setSelectedDetailOrder(null)}>✕</button>

            <div className="ad-detail-header-block">
              <div className="ad-detail-title-section">
                <h3 className="ad-detail-store-name">Order #{selectedDetailOrder.orderId}</h3>
                <div className="ad-detail-store-meta">
                  <span>📅 Ordered: {selectedDetailOrder.date ? new Date(selectedDetailOrder.date).toLocaleDateString('en-IN', { dateStyle: 'long' }) : 'N/A'}</span>
                  <span>•</span>
                  <span>👤 Buyer: {selectedDetailOrder.deliveryAddress?.fullName}</span>
                </div>
              </div>
              <span className={`ad-status-badge ${selectedDetailOrder.status === 'PENDING_APPROVAL' ? 'pending' :
                  ['REJECTED', '⚠️ VAULT DISPUTED / FROZEN', '❌ Order Rejected by Seller'].includes(selectedDetailOrder.status) ? 'rejected' : 'approved'
                }`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                {selectedDetailOrder.status?.replace(/_/g, ' ')?.toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', flex: 1, minHeight: '350px' }}>
              {/* LEFT COLUMN: Shipping info, Items checklist, Visual timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', maxHeight: '55vh', paddingRight: '10px' }}>

                {/* Shipping & Contact Info */}
                <div className="ad-detail-info-section">
                  <h4>Delivery Address Details</h4>
                  <div className="ad-detail-row">
                    <span className="ad-detail-row-label">Full Name</span>
                    <span className="ad-detail-row-val">{selectedDetailOrder.deliveryAddress?.fullName}</span>
                  </div>
                  <div className="ad-detail-row">
                    <span className="ad-detail-row-label">Telephone</span>
                    <span className="ad-detail-row-val">{selectedDetailOrder.deliveryAddress?.phone || 'N/A'}</span>
                  </div>
                  <div className="ad-detail-row">
                    <span className="ad-detail-row-label">Email</span>
                    <span className="ad-detail-row-val">{selectedDetailOrder.deliveryAddress?.email || 'N/A'}</span>
                  </div>
                  <div className="ad-detail-row">
                    <span className="ad-detail-row-label">Street Address</span>
                    <span className="ad-detail-row-val" style={{ textAlign: 'right', maxWidth: '240px', wordBreak: 'break-all' }}>
                      {selectedDetailOrder.deliveryAddress?.address}
                    </span>
                  </div>
                  <div className="ad-detail-row">
                    <span className="ad-detail-row-label">City &amp; Zip</span>
                    <span className="ad-detail-row-val">{selectedDetailOrder.deliveryAddress?.city} - {selectedDetailOrder.deliveryAddress?.pincode}</span>
                  </div>
                </div>

                {/* Transit Location Details */}
                <div className="ad-detail-info-section">
                  <h4>Transit Location Details</h4>
                  <div className="ad-detail-row">
                    <span className="ad-detail-row-label">Transit Distance</span>
                    <span className="ad-detail-row-val">{selectedDetailOrder.distanceKm !== undefined ? `${selectedDetailOrder.distanceKm} KM` : 'N/A'}</span>
                  </div>
                  {selectedDetailOrder.buyerLocation?.latitude !== undefined && (
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Buyer Coordinates</span>
                      <span className="ad-detail-row-val" style={{ fontFamily: 'monospace' }}>
                        {selectedDetailOrder.buyerLocation.latitude.toFixed(6)}, {selectedDetailOrder.buyerLocation.longitude.toFixed(6)}
                      </span>
                    </div>
                  )}
                  {selectedDetailOrder.sellerLocation?.latitude !== undefined && (
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Seller Coordinates</span>
                      <span className="ad-detail-row-val" style={{ fontFamily: 'monospace' }}>
                        {selectedDetailOrder.sellerLocation.latitude.toFixed(6)}, {selectedDetailOrder.sellerLocation.longitude.toFixed(6)}
                      </span>
                    </div>
                  )}
                  {selectedDetailOrder.buyerLocation?.latitude !== undefined && selectedDetailOrder.sellerLocation?.latitude !== undefined && (
                    <div style={{ marginTop: '10px' }}>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${selectedDetailOrder.sellerLocation.latitude},${selectedDetailOrder.sellerLocation.longitude}&destination=${selectedDetailOrder.buyerLocation.latitude},${selectedDetailOrder.buyerLocation.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          background: 'rgba(65, 105, 225, 0.1)',
                          color: '#4169e1',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          textDecoration: 'none',
                          width: '100%',
                          textAlign: 'center'
                        }}
                      >
                        🗺️ Compare GPS Locations &amp; Get Route
                      </a>
                    </div>
                  )}
                </div>

                {/* Items list */}
                <div className="ad-detail-info-section">
                  <h4>Ordered Products Checklist</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedDetailOrder.items?.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-admin-border)' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', overflow: 'hidden' }}>
                          {(!item.img || !item.img.startsWith('http')) ? '📦' : <img src={item.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="ad-bold" style={{ fontSize: '0.85rem' }}>{item.name}</div>
                          <div className="ad-muted" style={{ fontSize: '0.72rem' }}>Brand: {item.brand || 'N/A'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="ad-bold" style={{ fontSize: '0.85rem' }}>₹{item.price?.toLocaleString('en-IN')}</div>
                          <div className="ad-muted" style={{ fontSize: '0.72rem' }}>Qty: {item.quantity || 1}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary Cost */}
                <div className="ad-detail-info-section">
                  <h4>Total Value Summary</h4>
                  <div className="ad-detail-row">
                    <span className="ad-detail-row-label">Emahu Lockup Total</span>
                    <span className="ad-detail-row-val" style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.05rem' }}>
                      ₹{selectedDetailOrder.total?.toLocaleString('en-IN')}
                    </span>
                  </div>
                  {selectedDetailOrder.deliveryCost && (
                    <div className="ad-detail-row">
                      <span className="ad-detail-row-label">Estimated Delivery Cost</span>
                      <span className="ad-detail-row-val">₹{selectedDetailOrder.deliveryCost}</span>
                    </div>
                  )}
                  <div className="ad-detail-row">
                    <span className="ad-detail-row-label">Emahu Release Method</span>
                    <span className="ad-detail-row-val">{selectedDetailOrder.EmahuMethod || 'Standard Emahu Vault'}</span>
                  </div>

                  {/* Merchant Payout Bill Breakdown */}
                  {(() => {
                    const orderTotal = selectedDetailOrder.total || 0;
                    const productAmount = selectedDetailOrder.productAmount || orderTotal;
                    const isReleased = selectedDetailOrder.paymentReleased;
                    const feePercent = isReleased ? (selectedDetailOrder.platformFeePercent !== undefined ? selectedDetailOrder.platformFeePercent : platformFeePercent) : platformFeePercent;
                    const feeAmount = isReleased ? (selectedDetailOrder.platformFeeAmount !== undefined ? selectedDetailOrder.platformFeeAmount : parseFloat(((productAmount * feePercent) / 100).toFixed(2))) : parseFloat(((productAmount * feePercent) / 100).toFixed(2));
                    const netPayout = isReleased ? (selectedDetailOrder.sellerNetPayout !== undefined ? selectedDetailOrder.sellerNetPayout : parseFloat((productAmount - feeAmount).toFixed(2))) : parseFloat((productAmount - feeAmount).toFixed(2));

                    return (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: '12px' }}>
                        <div style={{ fontWeight: '600', fontSize: '0.78rem', color: isReleased ? '#10b981' : '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            🪙 MERCHANT PAYOUT BILL ({feePercent}% Commission)
                          </span>
                          <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: isReleased ? 'rgba(16,185,129,0.1)' : 'rgba(129,140,248,0.1)', color: isReleased ? '#10b981' : '#818cf8' }}>
                            {isReleased ? 'Released' : 'Emahu Locked'}
                          </span>
                        </div>
                        <div style={{ background: 'rgba(99,102,241,0.02)', border: '1px solid rgba(99,102,241,0.08)', borderRadius: '6px', padding: '10px' }}>
                          <div className="ad-detail-row" style={{ marginBottom: '6px' }}>
                            <span className="ad-detail-row-label" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Product Cost Subtotal</span>
                            <span className="ad-detail-row-val" style={{ fontSize: '0.75rem' }}>
                              ₹{productAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="ad-detail-row" style={{ marginBottom: '6px', color: '#fca5a5' }}>
                            <span className="ad-detail-row-label" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Platform Commission ({feePercent}%)</span>
                            <span className="ad-detail-row-val">
                              - ₹{feeAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                          {selectedDetailOrder.discountAmount > 0 && (
                            <div className="ad-detail-row" style={{ marginBottom: '6px' }}>
                              <span className="ad-detail-row-label" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Coupon Discount ({selectedDetailOrder.couponCode || 'Promo'})</span>
                              <span className="ad-detail-row-val" style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                                - ₹{selectedDetailOrder.discountAmount.toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}
                          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '6px 0' }} />
                          <div className="ad-detail-row">
                            <span className="ad-detail-row-label" style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#fff' }}>Net Merchant Payout</span>
                            <span className="ad-detail-row-val" style={{ fontSize: '0.88rem', fontWeight: 'bold', color: isReleased ? '#10b981' : '#818cf8' }}>
                              ₹{Math.max(0, netPayout - (selectedDetailOrder.discountAmount || 0)).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Order Transit History (Timeline Log) */}
                <div className="ad-detail-info-section">
                  <h4>Transit Activity Log</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                    {(selectedDetailOrder.timeline || []).map((tl, i) => (
                      <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '1rem', marginTop: '2px' }}>
                          {tl.status === 'PENDING_APPROVAL' ? '⏳' :
                            tl.status === 'DELIVERY_ASSIGNED' ? '🚚' :
                              tl.status === 'LABEL_GENERATED' ? '📄' :
                                tl.status === 'READY_FOR_PICKUP' ? '📦' :
                                  tl.status === 'PICKED_UP' ? '🚀' :
                                    tl.status === 'IN_TRANSIT' ? '🚛' :
                                      tl.status === 'OUT_FOR_DELIVERY' ? '🛵' :
                                        tl.status === 'DELIVERED' ? '✅' : '⚙️'}
                        </span>
                        <div>
                          <div className="ad-bold" style={{ fontSize: '0.85rem' }}>{tl.label}</div>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#94a3b8', lineHeight: '1.4' }}>{tl.desc}</p>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-admin-muted)' }}>{tl.date}</span>
                        </div>
                      </div>
                    ))}
                    {(!selectedDetailOrder.timeline || selectedDetailOrder.timeline.length === 0) && (
                      <div style={{ color: 'var(--color-admin-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        No history entries found.
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: FULFILLMENT MANAGEMENT CONTROLS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-admin-border)', borderRadius: '12px', padding: '20px', overflowY: 'auto', maxHeight: '55vh' }}>
                <h4>Fulfillment &amp; Courier Console</h4>

                {selectedDetailOrder.status === 'PENDING_APPROVAL' ? (
                  <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '8px', padding: '16px', color: '#f59e0b', fontSize: '0.85rem', lineHeight: '1.5' }}>
                    ⏳ <strong>Waiting for Seller Approval:</strong><br />
                    This transaction is currently awaiting approval from the seller side. The seller must confirm stock and accept the order before courier tracking and dispatch operations can begin.
                  </div>
                ) : ['REJECTED', '❌ Order Rejected by Seller'].includes(selectedDetailOrder.status) ? (
                  <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', padding: '16px', color: '#ef4444', fontSize: '0.85rem', lineHeight: '1.5' }}>
                    ❌ <strong>Order Rejected by Seller:</strong><br />
                    This order was rejected or cancelled by the merchant. Reason: <em>&ldquo;{selectedDetailOrder.rejectionReason || 'No reason specified'}&rdquo;</em>. Fulfillment controls are locked.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.01)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-admin-border)' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold' }}>COURIER CORRIDOR TRACKING PROVISIONS</span>
                      <p style={{ margin: '0 0 10px 0', fontSize: '0.74rem', color: 'var(--color-admin-muted)', fontStyle: 'italic' }}>
                        * Logistics are managed directly by the merchant seller.
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem' }}>
                        <div>
                          <label style={{ fontSize: '0.72rem', color: 'var(--color-admin-muted)', display: 'block', marginBottom: '2px' }}>Logistics Carrier</label>
                          <strong style={{ color: '#fff' }}>{selectedDetailOrder.carrier || 'Not Assigned'}</strong>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.72rem', color: 'var(--color-admin-muted)', display: 'block', marginBottom: '2px' }}>Tracking Identifier</label>
                          <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{selectedDetailOrder.trackingId || 'N/A'}</strong>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '0.8rem', marginTop: '10px' }}>
                        <div>
                          <label style={{ fontSize: '0.72rem', color: 'var(--color-admin-muted)', display: 'block', marginBottom: '2px' }}>Package Weight</label>
                          <strong style={{ color: '#fff' }}>{selectedDetailOrder.packageWeight || 'N/A'}</strong>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.72rem', color: 'var(--color-admin-muted)', display: 'block', marginBottom: '2px' }}>Ship Cost (₹)</label>
                          <strong style={{ color: '#fff' }}>{selectedDetailOrder.deliveryCost !== undefined ? `₹${selectedDetailOrder.deliveryCost}` : 'N/A'}</strong>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.72rem', color: 'var(--color-admin-muted)', display: 'block', marginBottom: '2px' }}>Transit Time</label>
                          <strong style={{ color: '#fff' }}>{selectedDetailOrder.estDays || 'N/A'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Progress Shipping State / Payout Info (Read-only) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                      {['DELIVERED', 'COMPLETED', '🔓 FUNDS RELEASED'].some(s => selectedDetailOrder.status?.includes(s)) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', marginTop: '4px' }}>
                          <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '14px', color: '#10b981', fontSize: '0.82rem', textAlign: 'center', fontWeight: 'bold' }}>
                            ✓ Fulfillment Cycle Completed Successfully
                          </div>

                          {selectedDetailOrder.paymentStatus === 'paid' ? (
                            <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '8px', padding: '14px', fontSize: '0.82rem', color: '#60a5fa' }}>
                              <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                💳 Payout Status: PAID (Verified)
                              </div>
                              <div style={{ color: '#94a3b8', fontSize: '0.76rem', marginBottom: '6px' }}>
                                Date: {selectedDetailOrder.transactionDate ? new Date(selectedDetailOrder.transactionDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                              </div>
                              {selectedDetailOrder.transactionFile && (
                                <a
                                  href={selectedDetailOrder.transactionFile}
                                  download={`receipt_${selectedDetailOrder.orderId}.png`}
                                  style={{ color: '#38bdf8', textDecoration: 'underline', fontWeight: '500', display: 'inline-block', marginTop: '4px' }}
                                >
                                  📄 View Attached Receipt File
                                </a>
                              )}
                            </div>
                          ) : (
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '14px', fontSize: '0.8rem', color: '#10b981', textAlign: 'center' }}>
                              🎉 <strong>Order Delivered Successfully</strong>
                              <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.4' }}>
                                Payout settlement is processed exclusively under the <strong>Registered Merchants &gt; Settlement</strong> tab.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  className="ad-btn-sec"
                  style={{ height: '40px', width: '100%', marginTop: 'auto' }}
                  onClick={() => setSelectedDetailOrder(null)}
                >
                  Close Console
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ── RELEASE FUND PANEL (Multi-Step: Bank → Payment → Confirm) ── */}
      {releasePanel && (() => {
        const { order, seller, penalty } = releasePanel;
        const productVal = order.productAmount || order.total || 0;
        const platformFee = parseFloat(((productVal * platformFeePercent) / 100).toFixed(2));
        const penaltyVal = parseFloat(penalty?.amount) || 0;
        const netPayout = parseFloat((productVal - platformFee - penaltyVal).toFixed(2));

        const steps = ['bank', 'payment', 'confirm'];
        const stepIndex = steps.indexOf(releasePanelStep);

        const stepLabel = (s) => ({ bank: 'Bank Details', payment: 'Payment Data', confirm: 'Confirm Release' }[s]);

        return (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 10000,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setReleasePanel(null)}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: '20px',
                width: '100%', maxWidth: '520px',
                boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Panel Header */}
              <div style={{
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                padding: '20px 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: '800', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    💰 Release Fund — Order #{order.orderId}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', marginTop: '2px' }}>
                    {seller?.storeName || 'Merchant Settlement'} • ₹{netPayout.toLocaleString('en-IN')} Net Payout
                  </div>
                </div>
                <button
                  onClick={() => setReleasePanel(null)}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', padding: '6px 10px', fontSize: '1rem', lineHeight: 1 }}
                >✕</button>
              </div>

              {/* Step Progress Bar */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', gap: '8px' }}>
                {steps.map((s, i) => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.72rem', fontWeight: '700', flexShrink: 0,
                      background: i < stepIndex ? '#10b981' : i === stepIndex ? '#6366f1' : 'rgba(255,255,255,0.08)',
                      color: i <= stepIndex ? '#fff' : '#64748b',
                      border: i === stepIndex ? '2px solid rgba(99,102,241,0.5)' : '2px solid transparent',
                      boxShadow: i === stepIndex ? '0 0 12px rgba(99,102,241,0.4)' : 'none',
                      transition: 'all 0.3s'
                    }}>
                      {i < stepIndex ? '✓' : i + 1}
                    </div>
                    <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: i === stepIndex ? '#c7d2fe' : i < stepIndex ? '#34d399' : '#64748b', fontWeight: i === stepIndex ? '700' : '500', whiteSpace: 'nowrap' }}>
                      {stepLabel(s)}
                    </span>
                    {i < steps.length - 1 && (
                      <div style={{ flex: 1, height: '1px', background: i < stepIndex ? '#10b981' : 'rgba(255,255,255,0.08)', margin: '0 8px', transition: 'all 0.3s' }} />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              <div style={{ padding: '24px' }}>

                {/* STEP 1: BANK DETAILS */}
                {releasePanelStep === 'bank' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
                      Verify the merchant's registered payout account before proceeding with settlement.
                    </p>

                    {/* Bank Card */}
                    <div style={{
                      background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 50%, #2563eb 100%)',
                      borderRadius: '14px', padding: '20px 22px',
                      boxShadow: '0 8px 24px rgba(37,99,235,0.3)',
                      position: 'relative', overflow: 'hidden'
                    }}>
                      <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                      <div style={{ position: 'absolute', bottom: '-30px', left: '-10px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', position: 'relative' }}>
                        <div style={{ color: '#fff', fontWeight: '800', fontSize: '0.9rem' }}>🏦 {seller?.bankName || 'Settlement Bank'}</div>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.12)', padding: '3px 8px', borderRadius: '6px', fontWeight: '700' }}>PAYOUT ACCOUNT</div>
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '1.3rem', letterSpacing: '3px', color: '#fff', fontWeight: '700', margin: '12px 0', position: 'relative' }}>
                        {seller?.accountNumber ? seller.accountNumber.replace(/.(?=.{4})/g, '•') : '•••• •••• •••• ••••'}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginTop: '8px' }}>
                        <div>
                          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account Holder</div>
                          <div style={{ color: '#fff', fontWeight: '700', fontSize: '0.85rem', marginTop: '2px' }}>{seller?.bankHolder || 'N/A'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>IFSC Code</div>
                          <div style={{ color: '#fff', fontWeight: '700', fontFamily: 'monospace', fontSize: '0.85rem', marginTop: '2px' }}>{seller?.ifscCode || 'N/A'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Bank detail rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { label: 'Merchant Store', value: seller?.storeName || 'N/A' },
                        { label: 'Bank Name', value: seller?.bankName || 'Not configured' },
                        { label: 'Account Number', value: seller?.accountNumber || 'Not configured' },
                        { label: 'IFSC Code', value: seller?.ifscCode || 'Not configured' },
                        { label: 'Account Holder', value: seller?.bankHolder || 'Not configured' },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>{label}</span>
                          <span style={{ fontSize: '0.82rem', color: value === 'Not configured' ? '#ef4444' : '#e2e8f0', fontWeight: '600', fontFamily: ['Account Number', 'IFSC Code'].includes(label) ? 'monospace' : 'inherit' }}>{value}</span>
                        </div>
                      ))}
                    </div>

                    {(!seller?.accountNumber || !seller?.ifscCode) && (
                      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#f87171', fontSize: '0.78rem' }}>
                        ⚠️ Merchant has not configured complete bank details. Proceed with caution.
                      </div>
                    )}

                    <button
                      onClick={() => setReleasePanelStep('payment')}
                      style={{ padding: '12px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      Bank Details Verified — View Payment Data →
                    </button>
                  </div>
                )}

                {/* STEP 2: PAYMENT DATA */}
                {releasePanelStep === 'payment' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
                      Review the payment breakdown before confirming the fund release.
                    </p>

                    {/* Amount breakdown card */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '18px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>Payment Settlement Summary</div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Product Amount</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff' }}>₹{productVal.toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Platform Commission ({platformFeePercent}%)</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f87171' }}>− ₹{platformFee.toLocaleString('en-IN')}</span>
                        </div>
                        {penaltyVal > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Merchant Penalty ({penalty?.reason || 'Admin deduction'})</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f87171' }}>− ₹{penaltyVal.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#fff' }}>Net Payout (Released)</span>
                          <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#10b981' }}>₹{netPayout.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Order info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {[
                        { label: 'Order ID', value: `#${order.orderId}` },
                        { label: 'Buyer', value: order.deliveryAddress?.fullName || 'N/A' },
                        { label: 'Order Date', value: order.date || (order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : 'N/A') },
                        { label: 'Delivery Status', value: order.status },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{label}</span>
                          <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '600' }}>{value}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => setReleasePanelStep('bank')}
                        style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        ← Back
                      </button>
                      <button
                        onClick={() => setReleasePanelStep('confirm')}
                        style={{ flex: 2, padding: '11px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}
                      >
                        Confirm Payment Data →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: CONFIRM RELEASE */}
                {releasePanelStep === 'confirm' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '8px' }}>💸</div>
                      <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#fff' }}>Confirm Fund Release</div>
                      <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                        You are about to release <strong style={{ color: '#10b981' }}>₹{netPayout.toLocaleString('en-IN')}</strong> to <strong style={{ color: '#c7d2fe' }}>{seller?.storeName || 'this merchant'}</strong>.
                        This action is irreversible.
                      </p>
                    </div>

                    {/* Final summary */}
                    <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Destination Account</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#e2e8f0', fontFamily: 'monospace' }}>{seller?.accountNumber ? `••••${seller.accountNumber.slice(-4)}` : 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>IFSC</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#e2e8f0', fontFamily: 'monospace' }}>{seller?.ifscCode || 'N/A'}</span>
                      </div>
                      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '8px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#fff' }}>Net Released</span>
                        <span style={{ fontSize: '1.3rem', fontWeight: '800', color: '#10b981' }}>₹{netPayout.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => setReleasePanelStep('payment')}
                        style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        ← Back
                      </button>
                      <button
                        onClick={async () => {
                          setReleasePanel(null);
                          await handleReleasePayment(order.orderId, penalty?.amount, penalty?.reason);
                        }}
                        disabled={releasingOrderId === order.orderId}
                        style={{
                          flex: 2, padding: '12px',
                          background: releasingOrderId === order.orderId ? 'rgba(16,185,129,0.4)' : 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#fff', border: 'none', borderRadius: '10px',
                          fontWeight: '800', fontSize: '0.9rem',
                          cursor: releasingOrderId === order.orderId ? 'not-allowed' : 'pointer',
                          boxShadow: '0 4px 16px rgba(16,185,129,0.35)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                      >
                        {releasingOrderId === order.orderId ? '⌛ Releasing...' : '✓ Confirm & Release Funds'}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        );
      })()}

      {/* Mobile sidebar backdrop */}
      {mobileSidebarOpen && (
        <div className="ad-sidebar-backdrop" onClick={() => setMobileSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* Sidebar */}
      <aside className={`ad-sidebar ${mobileSidebarOpen ? 'ad-sidebar--mobile-open' : ''}`}>
        <Link href="/" className="ad-sidebar-brand">
          <div className="ad-sidebar-logo">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#4169e1" />
              <path d="M8 12h16M8 16h12M8 20h14" stroke="white" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <span className="ad-sidebar-title">EMAHU</span>
        </Link>

        <ul className="ad-sidebar-menu">
          <li>
            <button className={`ad-sidebar-btn ${activeTab === 'new-sellers' ? 'active' : ''}`} onClick={() => { setActiveTab('new-sellers'); setMobileSidebarOpen(false); }}>
              🆕 New Seller Approvals {sellers.filter(s => s.status === 'pending' || s.status === 'more_info_requested').length > 0 && (
                <span style={{ background: '#f59e0b', color: '#000', borderRadius: '50%', padding: '2px 8px', fontSize: '0.7rem', marginLeft: '6px', fontWeight: 'bold' }}>
                  {sellers.filter(s => s.status === 'pending' || s.status === 'more_info_requested').length}
                </span>
              )}
            </button>
          </li>
          <li>
            <button className={`ad-sidebar-btn ${activeTab === 'sellers' ? 'active' : ''}`} onClick={() => { setActiveTab('sellers'); setMobileSidebarOpen(false); }}>
              👥 Registered Merchants
            </button>
          </li>
          <li>
            <button className={`ad-sidebar-btn ${activeTab === 'products-hub' ? 'active' : ''}`} onClick={() => { setActiveTab('products-hub'); setMobileSidebarOpen(false); }}>
              📦 Products Hub {products.filter(p => p.approvalStatus === 'pending' || p.approvalStatus === 'changes_requested').length > 0 && (
                <span style={{ background: '#f59e0b', color: '#000', borderRadius: '50%', padding: '2px 8px', fontSize: '0.7rem', marginLeft: '6px', fontWeight: 'bold' }}>
                  {products.filter(p => p.approvalStatus === 'pending' || p.approvalStatus === 'changes_requested').length}
                </span>
              )}
            </button>
          </li>
          <li>
            <button className={`ad-sidebar-btn ${activeTab === 'categories-hub' ? 'active' : ''}`} onClick={() => { setActiveTab('categories-hub'); setMobileSidebarOpen(false); }}>
              📂 Category Hub
            </button>
          </li>
          <li>
            <button className={`ad-sidebar-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => { setActiveTab('orders'); setMobileSidebarOpen(false); }}>
              🚚 Fulfillment Hub {orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'COMPLETED' && o.status !== 'REJECTED' && o.status !== '❌ Order Rejected by Seller').length > 0 && (
                <span style={{ background: '#6366f1', color: '#fff', borderRadius: '50%', padding: '2px 8px', fontSize: '0.7rem', marginLeft: '6px', fontWeight: 'bold' }}>
                  {orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'COMPLETED' && o.status !== 'REJECTED' && o.status !== '❌ Order Rejected by Seller').length}
                </span>
              )}
            </button>
          </li>
          <li>
            <button className={`ad-sidebar-btn ${activeTab === 'delivery-partners' ? 'active' : ''}`} onClick={() => { setActiveTab('delivery-partners'); setMobileSidebarOpen(false); }}>
              🏍️ Delivery Partners {deliveryPartners.filter(p => p.status === 'pending').length > 0 && (
                <span style={{ background: '#f59e0b', color: '#000', borderRadius: '50%', padding: '2px 8px', fontSize: '0.7rem', marginLeft: '6px', fontWeight: 'bold' }}>
                  {deliveryPartners.filter(p => p.status === 'pending').length}
                </span>
              )}
            </button>
          </li>
          <li>
            <button className={`ad-sidebar-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => { setActiveTab('stats'); setMobileSidebarOpen(false); }}>
              📈 System Stats
            </button>
          </li>
          <li>
            <button className={`ad-sidebar-btn ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => { setActiveTab('notifications'); setMobileSidebarOpen(false); }}>
              🔔 Notifications {notifications.some(n => !n.isRead) && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', padding: '2px 6px', fontSize: '0.65rem', marginLeft: '4px' }}>!</span>}
            </button>
          </li>
          <li>
            <button className={`ad-sidebar-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); setMobileSidebarOpen(false); }}>
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
          <div className="ad-header-left">
            {/* Mobile hamburger button */}
            <button
              className="ad-hamburger"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              aria-label="Toggle sidebar"
              aria-expanded={mobileSidebarOpen}
            >
              <span className="ad-hamburger__line" />
              <span className="ad-hamburger__line" />
              <span className="ad-hamburger__line" />
            </button>
            <h2>EMAHU Admin</h2>
          </div>
          <div className="ad-header-badge">Secure Control Center</div>
        </header>

        <main className="ad-view-container">

          {/* TAB: DELIVERY PARTNERS MANAGEMENT */}
          {activeTab === 'delivery-partners' && (
            <div>
              <div className="ad-view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3>Central Central central central Logistics Carrier Management</h3>
                  <p>Verify fleet registrations, custom per-kilometer rates, and active territories to dispatch order shipments.</p>
                </div>
                <button
                  className="ad-btn-action approve"
                  style={{ height: '40px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setIsAddPartnerOpen(true)}
                >
                  ➕ Add Delivery Partner
                </button>
              </div>

              {deliveryPartnersError ? (
                <div className="ad-error-container">
                  <div className="ad-error-title">⚠️ Connection Timeout / Cold Start</div>
                  <div className="ad-error-message">
                    Failed to communicate with the database. Click below to retry.
                  </div>
                  <button className="ad-btn-sec" onClick={fetchDeliveryPartners}>
                    🔄 Retry Loading Delivery Partners
                  </button>
                </div>
              ) : loadingDeliveryPartners ? (
                <div className="ad-loading">Fetching logistics carriers from database...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  {/* Sub-section 1: Pending Approvals */}
                  <div>
                    <h4 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      ⏳ Pending Fleet Registrations ({deliveryPartners.filter(p => p.status === 'pending' || p.status === 'more_info_requested').length})
                    </h4>
                    <div className="ad-table-wrapper">
                      <table className="ad-table ad-table--delivery">
                        <thead>
                          <tr>
                            <th>Fleet details</th>
                            <th>Contact Phone</th>
                            <th>Scope &amp; Rates</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deliveryPartners.filter(p => p.status === 'pending' || p.status === 'more_info_requested').map((partner) => (
                            <tr key={partner._id}>
                              <td>
                                <div className="ad-bold">{partner.name}</div>
                                <div className="ad-muted">📍 {partner.operatingLocation}</div>
                              </td>
                              <td>
                                <div className="ad-bold">{partner.phone}</div>
                                <div className="ad-muted">{partner.email}</div>
                              </td>
                              <td>
                                <div className="ad-bold" style={{ textTransform: 'capitalize' }}>
                                  Scope: {partner.deliveryScope === 'local' ? 'Local Same-City' : 'State-to-State'}
                                </div>
                                <div className="ad-muted" style={{ color: '#10b981', fontWeight: 'bold' }}>
                                  ₹{partner.perKmRate || partner.perItemCharge || '0.00'}/KM
                                </div>
                              </td>
                              <td>
                                <span className={`ad-status-badge ${partner.status}`}>
                                  {partner.status?.toUpperCase()}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="ad-btn-sec"
                                  style={{ fontSize: '0.8rem', height: '34px', padding: '0 16px', fontWeight: '600' }}
                                  onClick={() => setSelectedDetailPartner(partner)}
                                >
                                  Audit Application
                                </button>
                              </td>
                            </tr>
                          ))}
                          {deliveryPartners.filter(p => p.status === 'pending' || p.status === 'more_info_requested').length === 0 && (
                            <tr>
                              <td colSpan="5" className="ad-empty">No pending delivery partner onboarding requests.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Sub-section 2: Approved Partners */}
                  <div>
                    <h4 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🏍️ Approved Dispatch Carriers ({deliveryPartners.filter(p => p.status === 'approved' || p.status === 'rejected').length})
                    </h4>
                    <div className="ad-table-wrapper">
                      <table className="ad-table ad-table--delivery">
                        <thead>
                          <tr>
                            <th>Fleet details</th>
                            <th>Contact Phone</th>
                            <th>Scope &amp; Rates</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deliveryPartners.filter(p => p.status === 'approved' || p.status === 'rejected').map((partner) => (
                            <tr key={partner._id}>
                              <td>
                                <div className="ad-bold">{partner.name}</div>
                                <div className="ad-muted">📍 {partner.operatingLocation}</div>
                              </td>
                              <td>
                                <div className="ad-bold">{partner.phone}</div>
                                <div className="ad-muted">{partner.email}</div>
                              </td>
                              <td>
                                <div className="ad-bold" style={{ textTransform: 'capitalize' }}>
                                  Scope: {partner.deliveryScope === 'local' ? 'Local Same-City' : 'State-to-State'}
                                </div>
                                <div className="ad-muted" style={{ color: '#10b981', fontWeight: 'bold' }}>
                                  ₹{partner.perKmRate || partner.perItemCharge || '0.00'}/KM
                                </div>
                              </td>
                              <td>
                                <span className={`ad-status-badge ${partner.status}`}>
                                  {partner.status?.toUpperCase()}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="ad-btn-sec"
                                  style={{ fontSize: '0.8rem', height: '34px', padding: '0 16px', fontWeight: '600' }}
                                  onClick={() => setSelectedDetailPartner(partner)}
                                >
                                  Manage Partner
                                </button>
                              </td>
                            </tr>
                          ))}
                          {deliveryPartners.filter(p => p.status === 'approved' || p.status === 'rejected').length === 0 && (
                            <tr>
                              <td colSpan="5" className="ad-empty">No active delivery carriers registered in system.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: NEW SELLERS VERIFICATION */}
          {activeTab === 'new-sellers' && (
            <div>
              <div className="ad-view-header">
                <h3>New Seller Onboarding Requests</h3>
                <p>Verify bank details, business profiles, and KYC documents to activate new merchant listings.</p>
              </div>

              {sellersError ? (
                <div className="ad-error-container">
                  <div className="ad-error-title">⚠️ Connection Timeout / Cold Start</div>
                  <div className="ad-error-message">
                    Failed to communicate with the backend database. The live server (on Render free tier) may be waking up after being idle. This spin-up process can take up to 60 seconds.
                  </div>
                  <button className="ad-btn-sec" onClick={fetchSellers}>
                    🔄 Retry Loading Sellers
                  </button>
                </div>
              ) : loadingSellers ? (
                <div className="ad-loading">Fetching registration queue...</div>
              ) : (
                <div className="ad-table-wrapper">
                  <table className="ad-table ad-table--new-sellers">
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
                                  fetchSellerDocuments(seller._id);
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

              {sellersError ? (
                <div className="ad-error-container">
                  <div className="ad-error-title">⚠️ Connection Timeout / Cold Start</div>
                  <div className="ad-error-message">
                    Failed to retrieve the seller directory. The backend database server might be starting up from standby mode.
                  </div>
                  <button className="ad-btn-sec" onClick={fetchSellers}>
                    🔄 Retry Loading Sellers
                  </button>
                </div>
              ) : loadingSellers ? (
                <div className="ad-loading">Fetching sellers from directory...</div>
              ) : (
                <div className="ad-table-wrapper">
                  <table className="ad-table ad-table--sellers">
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
                                  fetchSellerDocuments(seller._id);
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

          {/* TAB: PRODUCTS HUB */}
          {activeTab === 'products-hub' && (
            <div>
              <div className="ad-view-header">
                <h3>Products Hub</h3>
                <p>Manage product onboarding queue, view live catalog directory, and audit/re-approve rejected listings.</p>
              </div>

              {/* Sub-tab navigation */}
              <div className="ad-detail-tabs-nav" style={{ marginBottom: '24px', borderBottom: '1px solid var(--color-admin-border)' }}>
                <button
                  className={`ad-detail-tab-trigger ${productsHubSubTab === 'queue' ? 'active' : ''}`}
                  onClick={() => setProductsHubSubTab('queue')}
                  style={{ padding: '10px 16px', fontSize: '0.85rem' }}
                >
                  Onboarding Queue <span style={{
                    marginLeft: '6px',
                    background: productsHubSubTab === 'queue' ? 'var(--color-admin-primary)' : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '0.72rem'
                  }}>{products.filter(p => p.approvalStatus === 'pending' || p.approvalStatus === 'changes_requested').length}</span>
                </button>
                <button
                  className={`ad-detail-tab-trigger ${productsHubSubTab === 'live' ? 'active' : ''}`}
                  onClick={() => setProductsHubSubTab('live')}
                  style={{ padding: '10px 16px', fontSize: '0.85rem' }}
                >
                  Live Catalog <span style={{
                    marginLeft: '6px',
                    background: productsHubSubTab === 'live' ? 'var(--color-admin-primary)' : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '0.72rem'
                  }}>{products.filter(p => p.approvalStatus === 'approved').length}</span>
                </button>
                <button
                  className={`ad-detail-tab-trigger ${productsHubSubTab === 'rejected' ? 'active' : ''}`}
                  onClick={() => setProductsHubSubTab('rejected')}
                  style={{ padding: '10px 16px', fontSize: '0.85rem' }}
                >
                  Rejected Catalog <span style={{
                    marginLeft: '6px',
                    background: productsHubSubTab === 'rejected' ? 'var(--color-admin-primary)' : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '0.72rem'
                  }}>{products.filter(p => p.approvalStatus === 'rejected').length}</span>
                </button>
              </div>

              {productsError ? (
                <div className="ad-error-container">
                  <div className="ad-error-title">⚠️ Connection Timeout / Cold Start</div>
                  <div className="ad-error-message">
                    Failed to communicate with the backend database. The live server (on Render free tier) may be waking up after being idle. This spin-up process can take up to 60 seconds.
                  </div>
                  <button className="ad-btn-sec" onClick={fetchProducts}>
                    🔄 Retry Loading Products
                  </button>
                </div>
              ) : loadingProducts ? (
                <div className="ad-loading">Fetching products...</div>
              ) : (
                <>
                  {/* Sub-tab: ONBOARDING QUEUE */}
                  {productsHubSubTab === 'queue' && (
                    <div className="ad-table-wrapper">
                      <table className="ad-table ad-table--products-queue">
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
                                      {isRealImage(product.image) ? (
                                        <img src={cleanImageUrl(product.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      ) : (
                                        cleanImageUrl(product.image) || '📦'
                                      )}
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
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

                  {/* Sub-tab: LIVE CATALOG */}
                  {productsHubSubTab === 'live' && (
                    <div className="ad-table-wrapper">
                      <table className="ad-table ad-table--products-live">
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
                          {products.filter(p => p.approvalStatus === 'approved').map((product) => {
                            return (
                              <tr key={product.id || product._id}>
                                <td>
                                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <div className="ad-prod-image">
                                      {isRealImage(product.image) ? (
                                        <img src={cleanImageUrl(product.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      ) : (
                                        cleanImageUrl(product.image) || '📦'
                                      )}
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
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
                                    <span className="ad-status-badge approved">
                                      Live
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
                          {products.filter(p => p.approvalStatus === 'approved').length === 0 && (
                            <tr>
                              <td colSpan="6" className="ad-empty">No live catalog records found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Sub-tab: REJECTED CATALOG */}
                  {productsHubSubTab === 'rejected' && (() => {
                    const rejectedProducts = products.filter(p => p.approvalStatus === 'rejected');
                    const uniqueCategories = ['All', ...Array.from(new Set(rejectedProducts.map(p => p.category).filter(Boolean))).sort()];
                    const filteredRejectedProducts = selectedRejectedCategory === 'All'
                      ? rejectedProducts
                      : rejectedProducts.filter(p => p.category === selectedRejectedCategory);

                    return (
                      <div>
                        {/* Category tabs */}
                        {rejectedProducts.length > 0 && (
                          <div className="ad-detail-tabs-nav" style={{ marginBottom: '24px', borderBottom: '1px solid var(--color-admin-border)' }}>
                            {uniqueCategories.map(cat => {
                              const count = cat === 'All'
                                ? rejectedProducts.length
                                : rejectedProducts.filter(p => p.category === cat).length;
                              return (
                                <button
                                  key={cat}
                                  className={`ad-detail-tab-trigger ${selectedRejectedCategory === cat ? 'active' : ''}`}
                                  onClick={() => setSelectedRejectedCategory(cat)}
                                  style={{ padding: '10px 16px', fontSize: '0.85rem' }}
                                >
                                  {cat} <span style={{
                                    marginLeft: '6px',
                                    background: selectedRejectedCategory === cat ? 'var(--color-admin-primary)' : 'rgba(255,255,255,0.08)',
                                    color: '#fff',
                                    padding: '2px 6px',
                                    borderRadius: '10px',
                                    fontSize: '0.72rem'
                                  }}>{count}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div className="ad-table-wrapper">
                          <table className="ad-table ad-table--products-rejected">
                            <thead>
                              <tr>
                                <th>Product Details</th>
                                <th>Merchant Vendor</th>
                                <th>Pricing &amp; Stock</th>
                                <th>Rejection Audit Reason</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredRejectedProducts.map((product) => {
                                return (
                                  <tr key={product.id || product._id}>
                                    <td>
                                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <div className="ad-prod-image">
                                          {isRealImage(product.image) ? (
                                            <img src={cleanImageUrl(product.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                          ) : (
                                            cleanImageUrl(product.image) || '📦'
                                          )}
                                        </div>
                                        <div style={{ textAlign: 'left' }}>
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
                                      <div style={{ maxWidth: '250px' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                          <span>🚫 Rejection Attempts:</span>
                                          <span style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>{product.approvalAttempts || 0}/3</span>
                                        </div>
                                        <p className="ad-muted" style={{ fontSize: '0.8rem', lineHeight: '1.4', margin: 0, fontStyle: 'italic', wordBreak: 'break-word' }}>
                                          &ldquo;{product.rejectionReason || 'No reason provided.'}&rdquo;
                                        </p>
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
                                        Review &amp; Re-Approve
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              {filteredRejectedProducts.length === 0 && (
                                <tr>
                                  <td colSpan="5" className="ad-empty">No rejected products in this category.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* TAB: ORDERS HUB */}
          {activeTab === 'orders' && (
            <div>
              <div className="ad-view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3>Fulfillment &amp; Orders Hub</h3>
                  <p>Track all global platform transactions, assign couriers, print labels, and advance shipping steps.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="ad-btn-sec" onClick={fetchOrders} disabled={loadingOrders}>
                    🔄 Refresh Orders
                  </button>
                </div>
              </div>

              {ordersError ? (
                <div className="ad-error-container">
                  <div className="ad-error-title">⚠️ Connection Timeout</div>
                  <div className="ad-error-message">
                    Failed to communicate with the orders database. The server might be idle or loading.
                  </div>
                  <button className="ad-btn-sec" onClick={fetchOrders}>
                    🔄 Retry Loading Orders
                  </button>
                </div>
              ) : loadingOrders ? (
                <div className="ad-loading">Loading transaction records...</div>
              ) : (() => {
                const filteredOrders = orders.filter(order => {
                  const matchesSearch =
                    order.orderId.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                    (order.deliveryAddress?.fullName || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                    (order.deliveryAddress?.email || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                    (order.sellerEmail || '').toLowerCase().includes(orderSearchQuery.toLowerCase());

                  if (!matchesSearch) return false;
                  if (orderStatusFilter === 'all') return true;
                  if (orderStatusFilter === 'PENDING_APPROVAL') return order.status === 'PENDING_APPROVAL';
                  if (orderStatusFilter === 'PROCESSING') return ['APPROVED', 'DELIVERY_ASSIGNED', 'LABEL_GENERATED'].includes(order.status);
                  if (orderStatusFilter === 'READY') return order.status === 'READY_FOR_PICKUP';
                  if (orderStatusFilter === 'IN_TRANSIT') return ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(order.status);
                  if (orderStatusFilter === 'DELIVERED') return ['DELIVERED', 'COMPLETED', '🔓 FUNDS RELEASED'].includes(order.status);
                  if (orderStatusFilter === 'DISPUTED') return ['REJECTED', '⚠️ VAULT DISPUTED / FROZEN', '❌ Order Rejected by Seller'].includes(order.status);
                  return true;
                });

                return (
                  <div>
                    {/* Filter controls and Search Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                      <div className="ad-detail-tabs-nav" style={{ margin: 0, borderBottom: 'none' }}>
                        {[
                          { key: 'all', label: 'All Orders', count: orders.length },
                          { key: 'PENDING_APPROVAL', label: 'Pending Seller', count: orders.filter(o => o.status === 'PENDING_APPROVAL').length },
                          { key: 'PROCESSING', label: 'Processing', count: orders.filter(o => ['APPROVED', 'DELIVERY_ASSIGNED', 'LABEL_GENERATED'].includes(o.status)).length },
                          { key: 'READY', label: 'Ready', count: orders.filter(o => o.status === 'READY_FOR_PICKUP').length },
                          { key: 'IN_TRANSIT', label: 'In Transit', count: orders.filter(o => ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(o.status)).length },
                          { key: 'DELIVERED', label: 'Completed', count: orders.filter(o => ['DELIVERED', 'COMPLETED', '🔓 FUNDS RELEASED'].includes(o.status)).length },
                          { key: 'DISPUTED', label: 'Cancelled/Disputed', count: orders.filter(o => ['REJECTED', '⚠️ VAULT DISPUTED / FROZEN', '❌ Order Rejected by Seller'].includes(o.status)).length }
                        ].map(f => (
                          <button
                            key={f.key}
                            className={`ad-detail-tab-trigger ${orderStatusFilter === f.key ? 'active' : ''}`}
                            onClick={() => setOrderStatusFilter(f.key)}
                            style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                          >
                            {f.label} ({f.count})
                          </button>
                        ))}
                      </div>

                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          placeholder="Search orders..."
                          className="ad-modal-input"
                          style={{ margin: 0, height: '38px', width: '260px', fontSize: '0.85rem', paddingRight: '30px' }}
                          value={orderSearchQuery}
                          onChange={(e) => setOrderSearchQuery(e.target.value)}
                        />
                        {orderSearchQuery && (
                          <button
                            onClick={() => setOrderSearchQuery('')}
                            style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                          >✕</button>
                        )}
                      </div>
                    </div>

                    {/* Table wrapper */}
                    <div className="ad-table-wrapper">
                      <table className="ad-table ad-table--orders">
                        <thead>
                          <tr>
                            <th>Order Details</th>
                            <th>Customer info</th>
                            <th>Merchant Info</th>
                            <th>Items count &amp; Cost</th>
                            <th>Fulfillment Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.map(order => {
                            const isPending = order.status === 'PENDING_APPROVAL';
                            const isDisputed = ['REJECTED', '⚠️ VAULT DISPUTED / FROZEN', '❌ Order Rejected by Seller'].includes(order.status);
                            const isCompleted = ['DELIVERED', 'COMPLETED', '🔓 FUNDS RELEASED'].includes(order.status);

                            return (
                              <tr key={order._id || order.orderId}>
                                <td>
                                  <div className="ad-bold" style={{ color: 'var(--color-admin-primary)' }}>#{order.orderId}</div>
                                  <div className="ad-muted">
                                    📅 {order.date ? new Date(order.date).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'N/A'}
                                  </div>
                                </td>
                                <td>
                                  <div className="ad-bold">{order.deliveryAddress?.fullName || 'Guest User'}</div>
                                  <div className="ad-muted" style={{ fontSize: '0.78rem' }}>
                                    📍 {order.deliveryAddress?.city}, {order.deliveryAddress?.pincode}
                                  </div>
                                </td>
                                <td>
                                  <div className="ad-bold" style={{ fontSize: '0.85rem' }}>{order.sellerEmail || 'N/A'}</div>
                                  <div className="ad-muted" style={{ fontSize: '0.72rem', fontFamily: 'monospace' }}>ID: {order.sellerId}</div>
                                </td>
                                <td>
                                  <div style={{ fontWeight: '600' }}>₹{order.total?.toLocaleString('en-IN')}</div>
                                  <div className="ad-muted" style={{ fontSize: '0.78rem' }}>
                                    {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                    <span className={`ad-status-badge ${isPending ? 'pending' :
                                        isDisputed ? 'rejected' :
                                          isCompleted ? 'approved' : 'changes_requested'
                                      }`} style={{ fontSize: '0.7rem' }}>
                                      {order.status?.replace(/_/g, ' ')}
                                    </span>
                                    {order.paymentReleased && (
                                      <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 'bold' }}>
                                        💰 Released (Net: ₹{order.sellerNetPayout})
                                      </span>
                                    )}
                                    {order.carrier && (
                                      <span style={{ fontSize: '0.72rem', color: 'var(--color-admin-muted)' }}>
                                        🚚 {order.carrier} {order.trackingId ? `(${order.trackingId})` : ''}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <button
                                    className="ad-btn-sec"
                                    style={{ height: '32px', padding: '0 12px', fontSize: '0.78rem' }}
                                    onClick={() => {
                                      setSelectedDetailOrder(order);
                                      const defaultCarrier = order.carrier || 'Delhivery';
                                      setCarrier(defaultCarrier);
                                      if (order.trackingId) {
                                        setTrackingId(order.trackingId);
                                        setPackageWeight(order.packageWeight || '');
                                        setDeliveryCost(order.deliveryCost || '');
                                        setEstDays(order.estDays || '');
                                      } else {
                                        setTrackingId('');
                                        setPackageWeight('');
                                        setDeliveryCost('');
                                        setEstDays('');
                                      }
                                    }}
                                  >
                                    Track &amp; Fulfill
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {filteredOrders.length === 0 && (
                            <tr>
                              <td colSpan="6" className="ad-empty">No orders found matching the filter criteria.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 3: SYSTEM STATS */}
          {activeTab === 'stats' && (
            <div>
              <div className="ad-view-header">
                <h3>Directory Overview</h3>
                <p>Operational statistics of the EMAHU platform registrations.</p>
              </div>

              {(sellersError || productsError) ? (
                <div className="ad-error-container">
                  <div className="ad-error-title">⚠️ Connection Timeout / Cold Start</div>
                  <div className="ad-error-message">
                    Failed to calculate statistics. The backend database server might be starting up from standby mode.
                  </div>
                  <button className="ad-btn-sec" onClick={() => { fetchSellers(); fetchProducts(); }}>
                    🔄 Retry Loading Stats
                  </button>
                </div>
              ) : (loadingSellers || loadingProducts) ? (
                <div className="ad-loading">Calculating system statistics...</div>
              ) : (
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

              {notificationsError ? (
                <div className="ad-error-container">
                  <div className="ad-error-title">⚠️ Connection Timeout / Cold Start</div>
                  <div className="ad-error-message">
                    Failed to retrieve system alerts. The backend database server might be starting up from standby mode.
                  </div>
                  <button className="ad-btn-sec" onClick={fetchNotifications}>
                    🔄 Retry Loading Alerts
                  </button>
                </div>
              ) : loadingNotifications ? (
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

          {/* TAB: CATEGORY & ATTRIBUTE HUB */}
          {activeTab === 'categories-hub' && (
            <div>
              <div className="ad-view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3>Category &amp; Attribute Hub</h3>
                  <p>Define product categories structure, allowed brands, specifications templates, and dynamic seller attributes.</p>
                </div>
                <button
                  className="ad-btn-action approve"
                  style={{ margin: 0, height: '40px', padding: '0 20px', fontWeight: '600' }}
                  onClick={() => handleCreateCategoryInit('')}
                >
                  ➕ Create Root Category
                </button>
              </div>

              {adminCategoriesError ? (
                <div className="ad-error-container">
                  <div className="ad-error-title">⚠️ Connection Timeout</div>
                  <div className="ad-error-message">Failed to load categories. Please check database connection.</div>
                  <button className="ad-btn-sec" onClick={fetchCategories}>🔄 Retry</button>
                </div>
              ) : loadingAdminCategories ? (
                <div className="ad-loading">Loading categories tree...</div>
              ) : (
                <div className="ad-cat-hub-container">
                  {/* Left Panel: Category Tree View */}
                  <div className="ad-cat-hub-tree">
                    <div style={{ marginBottom: '16px' }}>
                      <input
                        type="text"
                        placeholder="Search categories..."
                        className="ad-modal-input"
                        style={{ margin: 0, width: '100%', height: '38px' }}
                        value={categoryHubSearchQuery}
                        onChange={(e) => setCategoryHubSearchQuery(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {adminCategories.length > 0 ? (
                        (() => {
                          const renderCategoryTreeNodes = (nodes, depth = 0) => {
                            return nodes.map((node) => {
                              const isSelected = selectedAdminCategory && (selectedAdminCategory._id === node._id || selectedAdminCategory.id === node._id);
                              const hasChildren = node.children && node.children.length > 0;

                              const matchesSearch = node.name.toLowerCase().includes(categoryHubSearchQuery.toLowerCase()) ||
                                (node.children && node.children.some(child => child.name.toLowerCase().includes(categoryHubSearchQuery.toLowerCase())));

                              if (categoryHubSearchQuery && !matchesSearch) return null;

                              return (
                                <div key={node._id} style={{ marginLeft: `${depth * 16}px`, marginBottom: '4px' }}>
                                  <div
                                    onClick={() => handleSelectCategory(node)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                      border: `1.5px solid ${isSelected ? 'var(--color-admin-primary)' : 'transparent'}`,
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      color: isSelected ? '#fff' : '#e4e4e7',
                                      gap: '8px'
                                    }}
                                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)' }}
                                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent' }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                      <span style={{ fontSize: '1rem' }}>{node.icon || (depth === 0 ? '📁' : depth === 1 ? '📂' : '📄')}</span>
                                      <span style={{ fontSize: '0.88rem', fontWeight: isSelected ? '600' : '400', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                        {node.name}
                                      </span>
                                      {!node.isEnabled && (
                                        <span style={{ fontSize: '0.7rem', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                          Disabled
                                        </span>
                                      )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                                      <button
                                        title="Add Subcategory under this"
                                        onClick={() => handleCreateCategoryInit(node._id)}
                                        style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '0.9rem', padding: '2px' }}
                                      >
                                        ➕
                                      </button>
                                      <button
                                        title="Delete Category"
                                        onClick={() => handleDeleteCategory(node._id)}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem', padding: '2px' }}
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>

                                  {hasChildren && (
                                    <div style={{ marginTop: '4px' }}>
                                      {renderCategoryTreeNodes(node.children, depth + 1)}
                                    </div>
                                  )}
                                </div>
                              );
                            });
                          };
                          return renderCategoryTreeNodes(adminCategories);
                        })()
                      ) : (
                        <div className="ad-empty" style={{ textAlign: 'center', padding: '20px' }}>No categories found. Click &apos;Create Root Category&apos; to start.</div>
                      )}
                    </div>
                  </div>

                  {/* Right Panel: Category Config Details Editor */}
                  <div className="ad-cat-hub-editor">
                    {selectedAdminCategory ? (
                      <form onSubmit={handleSaveCategory} style={{
                        background: '#18181b',
                        border: '1.5px solid #27272a',
                        borderRadius: '16px',
                        padding: '32px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #27272a', paddingBottom: '16px' }}>
                          <h4 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
                            {(!selectedAdminCategory.id || selectedAdminCategory.id === 'new') ? '✨ Create New Category' : `⚙️ Edit Category: ${selectedAdminCategory.name}`}
                          </h4>
                          {(selectedAdminCategory.id && selectedAdminCategory.id !== 'new') && (
                            <button
                              type="button"
                              className="ad-btn-danger"
                              style={{ height: '32px', padding: '0 12px', fontSize: '0.8rem' }}
                              onClick={() => handleDeleteCategory(selectedAdminCategory._id || selectedAdminCategory.id)}
                            >
                              Delete Category
                            </button>
                          )}
                        </div>

                        {/* General details grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                          <div>
                            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.82rem', fontWeight: '600', marginBottom: '6px' }}>Category Name *</label>
                            <input
                              type="text"
                              required
                              className="ad-modal-input"
                              style={{ margin: 0, width: '100%', height: '40px' }}
                              placeholder="e.g. Smartphones"
                              value={catFormName}
                              onChange={(e) => setCatFormName(e.target.value)}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.82rem', fontWeight: '600', marginBottom: '6px' }}>Parent Category</label>
                            <select
                              className="ad-modal-input"
                              style={{ margin: 0, width: '100%', height: '40px', background: '#09090b', border: '1.5px solid #27272a', borderRadius: '8px', color: '#fff' }}
                              value={catFormParentId}
                              onChange={(e) => setCatFormParentId(e.target.value)}
                            >
                              <option value="">None (Root Category)</option>
                              {(() => {
                                const getFlatCategories = (tree, excludeId = null) => {
                                  let flat = [];
                                  const recurse = (nodes) => {
                                    for (let n of nodes) {
                                      if (excludeId && (n._id === excludeId || n.id === excludeId)) continue;
                                      flat.push({ _id: n._id, name: n.name });
                                      if (n.children && n.children.length > 0) recurse(n.children);
                                    }
                                  };
                                  recurse(tree);
                                  return flat;
                                };
                                return getFlatCategories(adminCategories, selectedAdminCategory._id || selectedAdminCategory.id).map(c => (
                                  <option key={c._id} value={c._id}>{c.name}</option>
                                ));
                              })()}
                            </select>
                          </div>

                          <div>
                            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.82rem', fontWeight: '600', marginBottom: '6px' }}>Icon (Emoji / unicode)</label>
                            <input
                              type="text"
                              className="ad-modal-input"
                              style={{ margin: 0, width: '100%', height: '40px' }}
                              placeholder="e.g. 📱"
                              value={catFormIcon}
                              onChange={(e) => setCatFormIcon(e.target.value)}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.82rem', fontWeight: '600', marginBottom: '6px' }}>Order (Priority sorting)</label>
                            <input
                              type="number"
                              className="ad-modal-input"
                              style={{ margin: 0, width: '100%', height: '40px' }}
                              placeholder="e.g. 0"
                              value={catFormOrder}
                              onChange={(e) => setCatFormOrder(e.target.value)}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.82rem', fontWeight: '600', marginBottom: '6px' }}>Category Status</label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', height: '40px' }}>
                              <input
                                type="checkbox"
                                checked={catFormIsEnabled}
                                onChange={(e) => setCatFormIsEnabled(e.target.checked)}
                              />
                              <span style={{ fontSize: '0.88rem', color: '#cbd5e1' }}>Enable this Category</span>
                            </label>
                          </div>
                        </div>

                        {/* Brands configuration */}
                        <div style={{ marginBottom: '24px' }}>
                          <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.82rem', fontWeight: '600', marginBottom: '6px' }}>Allowed Brands (Comma-separated)</label>
                          <input
                            type="text"
                            className="ad-modal-input"
                            style={{ margin: 0, width: '100%', height: '40px' }}
                            placeholder="e.g. Apple, Samsung, OnePlus, Google"
                            value={catFormBrands}
                            onChange={(e) => setCatFormBrands(e.target.value)}
                          />
                          <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Only these brands will be selectable by sellers under this category. Leave blank for any.</span>
                        </div>

                        {/* Dynamic attributes list */}
                        <div style={{ marginBottom: '24px', borderTop: '1.5px solid #27272a', paddingTop: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h5 style={{ color: '#fff', fontSize: '1rem', fontWeight: '600', margin: 0 }}>📊 Dynamic Seller Attributes</h5>
                            <button
                              type="button"
                              className="ad-btn-sec"
                              style={{ height: '30px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '600', margin: 0 }}
                              onClick={addAttributeField}
                            >
                              ➕ Add Attribute
                            </button>
                          </div>

                          {catFormAttributes.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {catFormAttributes.map((attr, index) => (
                                <div key={index} style={{
                                  background: '#09090b',
                                  border: '1px solid #27272a',
                                  borderRadius: '8px',
                                  padding: '12px',
                                  display: 'grid',
                                  gridTemplateColumns: '2fr 1.5fr 3fr 1fr 1fr auto',
                                  gap: '10px',
                                  alignItems: 'center'
                                }}>
                                  <input
                                    type="text"
                                    placeholder="Name (e.g. Size)"
                                    className="ad-modal-input"
                                    style={{ margin: 0, height: '34px', fontSize: '0.8rem' }}
                                    value={attr.name}
                                    onChange={(e) => updateAttributeField(index, 'name', e.target.value)}
                                    required
                                  />
                                  <select
                                    className="ad-modal-input"
                                    style={{ margin: 0, height: '34px', fontSize: '0.8rem', background: '#000', color: '#fff', border: '1px solid #27272a' }}
                                    value={attr.type}
                                    onChange={(e) => updateAttributeField(index, 'type', e.target.value)}
                                  >
                                    <option value="text">Text Field</option>
                                    <option value="number">Number Field</option>
                                    <option value="select">Dropdown Select</option>
                                  </select>
                                  <input
                                    type="text"
                                    placeholder="Options (comma-separated)"
                                    className="ad-modal-input"
                                    style={{ margin: 0, height: '34px', fontSize: '0.8rem' }}
                                    value={attr.options || ''}
                                    onChange={(e) => updateAttributeField(index, 'options', e.target.value)}
                                    disabled={attr.type !== 'select'}
                                  />
                                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                    <span style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>Required</span>
                                    <input
                                      type="checkbox"
                                      checked={!!attr.isRequired}
                                      onChange={(e) => updateAttributeField(index, 'isRequired', e.target.checked)}
                                    />
                                  </label>
                                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                    <span style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>Variant</span>
                                    <input
                                      type="checkbox"
                                      checked={!!attr.isVariant}
                                      onChange={(e) => updateAttributeField(index, 'isVariant', e.target.checked)}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem' }}
                                    onClick={() => removeAttributeField(index)}
                                  >
                                    🗑️
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontStyle: 'italic', color: '#71717a', fontSize: '0.8rem', margin: '4px 0 0 0' }}>No dynamic attributes configured. Sellers will enter basic fields only.</p>
                          )}
                        </div>

                        {/* Custom Specifications templates */}
                        <div style={{ marginBottom: '24px', borderTop: '1.5px solid #27272a', paddingTop: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h5 style={{ color: '#fff', fontSize: '1rem', fontWeight: '600', margin: 0 }}>📐 Specification Sheet Fields</h5>
                            <button
                              type="button"
                              className="ad-btn-sec"
                              style={{ height: '30px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '600', margin: 0 }}
                              onClick={addSpecificationField}
                            >
                              ➕ Add Spec Field
                            </button>
                          </div>

                          {catFormSpecifications.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              {catFormSpecifications.map((spec, index) => (
                                <div key={index} style={{
                                  background: '#09090b',
                                  border: '1px solid #27272a',
                                  borderRadius: '8px',
                                  padding: '10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '10px'
                                }}>
                                  <input
                                    type="text"
                                    placeholder="Spec Key (e.g. RAM, Weight)"
                                    className="ad-modal-input"
                                    style={{ margin: 0, height: '34px', fontSize: '0.8rem', flex: 1 }}
                                    value={spec.name}
                                    onChange={(e) => updateSpecificationField(index, 'name', e.target.value)}
                                    required
                                  />
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    <input
                                      type="checkbox"
                                      checked={!!spec.isRequired}
                                      onChange={(e) => updateSpecificationField(index, 'isRequired', e.target.checked)}
                                    />
                                    <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Required</span>
                                  </label>
                                  <button
                                    type="button"
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}
                                    onClick={() => removeSpecificationField(index)}
                                  >
                                    🗑️
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontStyle: 'italic', color: '#71717a', fontSize: '0.8rem', margin: '4px 0 0 0' }}>No specification fields configured.</p>
                          )}
                        </div>

                        {/* Validation Rules */}
                        <div style={{ marginBottom: '24px', borderTop: '1.5px solid #27272a', paddingTop: '20px' }}>
                          <h5 style={{ color: '#fff', fontSize: '1rem', fontWeight: '600', marginBottom: '12px' }}>🔒 Category Validation Rules</h5>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                            <div>
                              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.82rem', fontWeight: '600', marginBottom: '6px' }}>Min Images Required</label>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                className="ad-modal-input"
                                style={{ margin: 0, width: '100%', height: '36px' }}
                                value={catFormValidationRules.minImages || 1}
                                onChange={(e) => setCatFormValidationRules({ ...catFormValidationRules, minImages: Number(e.target.value) })}
                              />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', paddingBottom: '10px' }}>
                                <input
                                  type="checkbox"
                                  checked={!!catFormValidationRules.brandRequired}
                                  onChange={(e) => setCatFormValidationRules({ ...catFormValidationRules, brandRequired: e.target.checked })}
                                />
                                <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>Brand Selection Mandatory</span>
                              </label>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', paddingBottom: '10px' }}>
                                <input
                                  type="checkbox"
                                  checked={!!catFormValidationRules.variantRequired}
                                  onChange={(e) => setCatFormValidationRules({ ...catFormValidationRules, variantRequired: e.target.checked })}
                                />
                                <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>Variants Config Mandatory</span>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Save Action */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1.5px solid #27272a', paddingTop: '20px', marginTop: '20px' }}>
                          <button
                            type="button"
                            className="ad-btn-sec"
                            style={{ height: '40px', padding: '0 24px', fontWeight: '600', margin: 0 }}
                            onClick={() => handleSelectCategory(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="ad-btn-action approve"
                            style={{ height: '40px', padding: '0 32px', fontWeight: '600', margin: 0 }}
                            disabled={isCategoryFormSaving}
                          >
                            {isCategoryFormSaving ? 'Saving...' : '💾 Save Configurations'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div style={{
                        background: '#18181b',
                        border: '1.5px solid #27272a',
                        borderRadius: '16px',
                        padding: '40px',
                        textAlign: 'center',
                        color: '#71717a'
                      }}>
                        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>📂</span>
                        <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '600', marginBottom: '8px' }}>No Category Selected</h4>
                        <p style={{ fontSize: '0.88rem', maxWidth: '360px', margin: '0 auto' }}>Select a category from the left tree pane to modify its configurations, attributes, specifications, and validation rules, or click &quot;Create Root Category&quot;.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SETTINGS (2FA CONTROLS) */}
          {activeTab === 'settings' && (
            <div>
              <div className="ad-view-header">
                <h3>System &amp; Security Settings</h3>
                <p>Configure platform commission fees, administrator credentials, and multi-factor authentication.</p>
              </div>

              {/* Emahu Platform Commission Settings */}
              <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '16px', padding: '32px', maxWidth: '600px', marginBottom: '24px' }}>
                <h4 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>💰</span> Platform Commission Settings
                </h4>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '24px' }}>
                  Define the default platform commission percentage deducted from merchant order bill totals when releasing payments.
                </p>



                <div style={{ marginBottom: '24px' }}>
                  <label style={{ color: '#e4e4e7', fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                    Commission Fee Percentage (%)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        className="ad-modal-input"
                        style={{ margin: 0, width: '100%', height: '40px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff', padding: '0 32px 0 12px' }}
                        value={platformFeePercent}
                        onChange={(e) => setPlatformFeePercent(e.target.value)}
                        placeholder="4"
                      />
                      <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa', fontWeight: '600' }}>%</span>
                    </div>

                    <button
                      className="ad-btn-action approve"
                      style={{ height: '40px', padding: '0 24px', whiteSpace: 'nowrap', fontWeight: '600', margin: 0 }}
                      onClick={handleSavePlatformSettings}
                      disabled={savingPlatformSettings || loadingPlatformSettings}
                    >
                      {savingPlatformSettings ? 'Saving...' : 'Update Fee'}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#71717a', display: 'block', marginTop: '6px' }}>
                    Changes take effect immediately on all future &quot;Release Payment&quot; actions initiated by sellers.
                  </span>
                </div>
              </div>

              <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '16px', padding: '32px', maxWidth: '600px' }}>
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
