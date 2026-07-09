'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import CategorySelector from './CategorySelector';
import './DynamicProductForm.css';

// Popular fallback suggestions if API config has no brands
const FALLBACK_BRANDS = ['Generic', 'Apple', 'Samsung', 'Nike', 'Adidas', 'Puma', 'Prestige', 'IKEA', 'L\'Oreal', 'Custom'];

export default function DynamicProductForm({ isOpen, onClose, resubmitProductId, onSuccess, sellerUser, products = [] }) {
  // Stepper state (10 steps)
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 10;

  // Selected Category Configuration state loaded from Database
  const [selectedCategoryConfig, setSelectedCategoryConfig] = useState(null);
  const [parentCategoryConfig, setParentCategoryConfig] = useState(null);
  const [allowedBrands, setAllowedBrands] = useState([]);
  const [availableSubcategories, setAvailableSubcategories] = useState([]);
  const [configLoading, setConfigLoading] = useState(false);
  
  // Custom states matching steps
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Electronics & Tech');
  const [subcategory, setSubcategory] = useState('General');
  const [productType, setProductType] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [description, setDescription] = useState('');
  const [shortTitle, setShortTitle] = useState('');

  // Media
  const [thumbnail, setThumbnail] = useState('');
  const [images, setImages] = useState([]);
  const [images360, setImages360] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [altText, setAltText] = useState('');

  // Dynamic Attributes
  const [dynamicAttributes, setDynamicAttributes] = useState({});

  // Dynamic Variants
  const [enableVariants, setEnableVariants] = useState(false);
  const [variantAttributeSelections, setVariantAttributeSelections] = useState({});
  const [variantsList, setVariantsList] = useState([]);

  // Specifications
  const [specifications, setSpecifications] = useState({});

  // Pricing
  const [price, setPrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [tax, setTax] = useState('18');
  const [hsnCode, setHsnCode] = useState('');
  const [costPrice, setCostPrice] = useState('');

  // Inventory
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [stock, setStock] = useState('');
  const [lowStockAlert, setLowStockAlert] = useState('10');
  const [backorderAllowed, setBackorderAllowed] = useState(false);
  const [warehouse, setWarehouse] = useState('Main Hub - Delhi');
  const [moq, setMoq] = useState('1');
  const [maxOrderQty, setMaxOrderQty] = useState('');

  // Shipping
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [shippingCharges, setShippingCharges] = useState('0');
  const [freeShipping, setFreeShipping] = useState(false);
  const [deliveryTime, setDeliveryTime] = useState('3-5 Days');

  // Warranty & Policies
  const [warrantyInfo, setWarrantyInfo] = useState('');
  const [replacementDays, setReplacementDays] = useState('7');
  const [returnPolicy, setReturnPolicy] = useState('7 Days Returnable');
  const [cancellationPolicy, setCancellationPolicy] = useState('Cancellation Allowed');

  // SEO details
  const [seoTitle, setSeoTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');

  // UI state controllers
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [brandQuery, setBrandQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [manualUrlInput, setManualUrlInput] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiStep, setAiStep] = useState('');
  const [previewMode, setPreviewMode] = useState('desktop');
  const [activePreviewImage, setActivePreviewImage] = useState(0);
  const [restoreDraftBanner, setRestoreDraftBanner] = useState(false);
  const [lastSaved, setLastSaved] = useState('');

  // Auto-generate Slug & SEO placeholders when Name changes
  useEffect(() => {
    if (name) {
      const generated = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      setTimeout(() => {
        setSeoTitle(`${name} | Buy Premium`);
        setCanonicalUrl(`https://emahu.com/products/${generated}`);
      }, 0);
    }
  }, [name]);

  // Helper: apply a config object to the form (sets attributes, specs, brands)
  const applyConfig = (config, isSubcategory = false, parentConfig = null) => {
    setSelectedCategoryConfig(config);

    // Brands: subcategory overrides parent if it has its own, else inherit from parent
    const brands = (config.brands && config.brands.length > 0)
      ? config.brands
      : (parentConfig && parentConfig.brands && parentConfig.brands.length > 0 ? parentConfig.brands : []);
    setAllowedBrands(brands);

    // Reset dynamic attributes to match new subcategory's attributes
    const initialAttrs = {};
    if (config.attributes && config.attributes.length > 0) {
      config.attributes.forEach(a => {
        initialAttrs[a.name] = a.type === 'select' ? (a.options ? a.options.split(',')[0]?.trim() || '' : '') : '';
      });
    }
    setDynamicAttributes(initialAttrs);

    // Reset variant selections
    setVariantAttributeSelections({});
    setVariantsList([]);
    setEnableVariants(false);

    // Reset specifications to match new subcategory's spec template
    const initialSpecs = {};
    if (config.specifications && config.specifications.length > 0) {
      config.specifications.forEach(s => {
        initialSpecs[s.name] = '';
      });
    }
    setSpecifications(initialSpecs);
  };

  // Load parent category config + list of subcategories
  useEffect(() => {
    if (!category) return;
    // Reset subcategory when parent category changes
    setSubcategory('General');
    setAvailableSubcategories([]);
    setSelectedCategoryConfig(null);
    setParentCategoryConfig(null);
    setDynamicAttributes({});
    setSpecifications({});
    setVariantsList([]);
    setVariantAttributeSelections({});
    setEnableVariants(false);

    const fetchParentConfig = async () => {
      setConfigLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/categories`);
        const data = await res.json();
        if (data.success && data.data) {
          // Find parent category node in full tree
          const findNode = (nodes, targetName) => {
            for (let n of nodes) {
              if (n.name === targetName) return n;
              if (n.children && n.children.length > 0) {
                const found = findNode(n.children, targetName);
                if (found) return found;
              }
            }
            return null;
          };

          const parentNode = findNode(data.data, category);
          if (parentNode) {
            // Build subcategory list from children
            const subs = parentNode.children
              ? parentNode.children.map(c => ({ name: c.name, id: c._id || c.id }))
              : [];
            setAvailableSubcategories(subs);

            // Fetch full config for the parent
            const detailRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/categories/${parentNode._id || parentNode.id}`);
            const detailData = await detailRes.json();
            if (detailData.success && detailData.data) {
              setParentCategoryConfig(detailData.data);
              // Apply parent config as default (no subcategory chosen yet)
              applyConfig(detailData.data, false, null);
            }
          }
        }
      } catch (e) {
        console.error('Error fetching parent category config:', e);
      } finally {
        setConfigLoading(false);
      }
    };
    fetchParentConfig();
  }, [category]);

  // When subcategory changes, fetch that subcategory's specific config
  useEffect(() => {
    // 'General' means use the parent config
    if (!subcategory || subcategory === 'General') {
      if (parentCategoryConfig) {
        applyConfig(parentCategoryConfig, false, null);
      }
      return;
    }

    const fetchSubcategoryConfig = async () => {
      setConfigLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/categories`);
        const data = await res.json();
        if (data.success && data.data) {
          const findNode = (nodes, targetName) => {
            for (let n of nodes) {
              if (n.name === targetName) return n;
              if (n.children && n.children.length > 0) {
                const found = findNode(n.children, targetName);
                if (found) return found;
              }
            }
            return null;
          };

          const subNode = findNode(data.data, subcategory);
          if (subNode) {
            const detailRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/categories/${subNode._id || subNode.id}`);
            const detailData = await detailRes.json();
            if (detailData.success && detailData.data) {
              const subConfig = detailData.data;
              // If subcategory has its own attributes, use them. Otherwise inherit from parent.
              const hasOwnAttributes = subConfig.attributes && subConfig.attributes.length > 0;
              const hasOwnSpecs = subConfig.specifications && subConfig.specifications.length > 0;

              const effectiveConfig = {
                ...subConfig,
                attributes: hasOwnAttributes ? subConfig.attributes : (parentCategoryConfig ? parentCategoryConfig.attributes : []),
                specifications: hasOwnSpecs ? subConfig.specifications : (parentCategoryConfig ? parentCategoryConfig.specifications : []),
                validationRules: subConfig.validationRules || (parentCategoryConfig ? parentCategoryConfig.validationRules : {}),
              };

              applyConfig(effectiveConfig, true, parentCategoryConfig);
            }
          } else {
            // Subcategory not found in DB, fall back to parent config
            if (parentCategoryConfig) {
              applyConfig(parentCategoryConfig, false, null);
            }
          }
        }
      } catch (e) {
        console.error('Error fetching subcategory config:', e);
      } finally {
        setConfigLoading(false);
      }
    };
    fetchSubcategoryConfig();
  }, [subcategory]);

  // Dynamic variants generators (Cartesian matrix helper)
  useEffect(() => {
    if (!enableVariants || !selectedCategoryConfig || !selectedCategoryConfig.attributes) {
      setVariantsList([]);
      return;
    }

    const variantAttrs = selectedCategoryConfig.attributes.filter(a => a.isVariant);
    if (variantAttrs.length === 0) {
      setVariantsList([]);
      return;
    }

    const optionLists = [];
    const attrNames = [];
    variantAttrs.forEach(a => {
      const selections = variantAttributeSelections[a.name];
      if (selections && selections.length > 0) {
        optionLists.push(selections);
        attrNames.push(a.name);
      }
    });

    if (optionLists.length === 0) {
      setVariantsList([]);
      return;
    }

    const cartesian = (...a) => a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
    const combinations = cartesian(...optionLists);

    const newVariants = combinations.map((comb) => {
      const combArr = Array.isArray(comb) ? comb : [comb];
      const optionsDict = {};
      attrNames.forEach((name, i) => {
        optionsDict[name] = combArr[i];
      });

      const variantName = combArr.join(' - ');
      const existing = variantsList.find(v => v.variantName === variantName);
      if (existing) return existing;

      const categoryPrefix = (category || 'GEN').substring(0, 3).toUpperCase();
      const variantStamp = combArr.map(c => String(c).substring(0, 3).toUpperCase()).join('-');
      const generatedSku = `EM-${categoryPrefix}-${variantStamp}-${Math.floor(100 + Math.random() * 900)}`;

      return {
        variantName,
        options: optionsDict,
        sku: generatedSku,
        barcode: '',
        mrp: comparePrice ? parseFloat(comparePrice) : parseFloat(price) || 0,
        price: parseFloat(price) || 0,
        stock: parseInt(stock) || 10,
        weight: parseFloat(weight) || 0.5,
        image: thumbnail || (images[0] ? images[0].url : '📦'),
        status: 'in-stock'
      };
    });

    setVariantsList(newVariants);
  }, [enableVariants, variantAttributeSelections, selectedCategoryConfig, price, comparePrice, stock, weight, thumbnail, images, category]);

  // Sync pricing discount percent
  const discountPercent = useMemo(() => {
    const p = parseFloat(price);
    const cp = parseFloat(comparePrice);
    if (p && cp && cp > p) {
      return Math.round(((cp - p) / cp) * 100);
    }
    return 0;
  }, [price, comparePrice]);

  // Profit margins calculator
  const profitMargin = useMemo(() => {
    const p = parseFloat(price);
    const c = parseFloat(costPrice);
    if (p && c) {
      return (((p - c) / p) * 100).toFixed(1);
    }
    return '0';
  }, [price, costPrice]);

  // Load product if editing
  useEffect(() => {
    if (resubmitProductId && products.length > 0) {
      const prod = products.find(p => (p.id || p._id) === resubmitProductId);
      if (prod) {
        setTimeout(() => {
          setName(prod.name || '');
          setBrand(prod.brand || '');
          setCategory(prod.category || 'Electronics & Tech');
          setSubcategory(prod.subcategory || 'General');
          setPrice(prod.price !== undefined ? String(prod.price) : '');
          setComparePrice(prod.comparePrice !== undefined ? String(prod.comparePrice) : '');
          setStock(prod.stock !== undefined ? String(prod.stock) : '');
          setDescription(prod.description || '');
          setImages(prod.images ? prod.images.map(img => typeof img === 'string' ? { url: img, quality: 'High Quality', isWarning: false } : img) : []);
          setShortTitle(prod.shortTitle || '');
          setModelNumber(prod.modelNumber || '');
          setSku(prod.sku || '');
          setBarcode(prod.barcode || '');
          setTax(prod.tax !== undefined ? String(prod.tax) : '18');
          setHsnCode(prod.hsnCode || '');
          setMoq(prod.moq !== undefined ? String(prod.moq) : '1');
          setMaxOrderQty(prod.maxOrderQty !== undefined ? String(prod.maxOrderQty) : '');
          setLowStockAlert(prod.lowStockAlert !== undefined ? String(prod.lowStockAlert) : '10');
          setBackorderAllowed(!!prod.backorderAllowed);
          setWarehouse(prod.warehouse || 'Main Hub - Delhi');
          setImages360(prod.images360 ? prod.images360.map(img => typeof img === 'string' ? { url: img, quality: 'High Quality', isWarning: false } : img) : []);
          setVideoUrl(prod.videoUrl || '');
          setAltText(prod.altText || '');
          setWeight(prod.weight !== undefined ? String(prod.weight) : '');
          setLength(prod.length !== undefined ? String(prod.length) : '');
          setWidth(prod.width !== undefined ? String(prod.width) : '');
          setHeight(prod.height !== undefined ? String(prod.height) : '');
          setShippingCharges(prod.shippingCharges !== undefined ? String(prod.shippingCharges) : '0');
          setFreeShipping(!!prod.freeShipping);
          setDeliveryTime(prod.deliveryTime || '3-5 Days');
          setDynamicAttributes(prod.dynamicAttributes || {});
          setSeoTitle(prod.seoTitle || '');
          setMetaDescription(prod.metaDescription || '');
          setMetaKeywords(prod.metaKeywords ? prod.metaKeywords.join(', ') : '');
          setCanonicalUrl(prod.canonicalUrl || '');
          setEnableVariants(prod.variants && prod.variants.length > 0);
          setVariantsList(prod.variants || []);
          setSpecifications(prod.specifications || {});
        }, 0);
      }
    }
  }, [resubmitProductId, products]);

  // Draft auto saving
  useEffect(() => {
    if (resubmitProductId) return;

    const savedDraft = localStorage.getItem('emahu_product_wizard_draft');
    if (savedDraft) {
      setTimeout(() => setRestoreDraftBanner(true), 0);
    }

    const interval = setInterval(() => {
      const draftData = {
        name, brand, category, subcategory, price, comparePrice, stock, description, images,
        shortTitle, modelNumber, sku, barcode, tax, hsnCode, moq, maxOrderQty, lowStockAlert,
        backorderAllowed, warehouse, images360, videoUrl, altText, weight, length, width, height,
        shippingCharges, freeShipping, deliveryTime, dynamicAttributes, seoTitle, metaDescription,
        metaKeywords, canonicalUrl, enableVariants, variantsList, specifications,
        timestamp: new Date().toLocaleTimeString()
      };
      localStorage.setItem('emahu_product_wizard_draft', JSON.stringify(draftData));
      setLastSaved(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 12000);

    return () => clearInterval(interval);
  }, [
    name, brand, category, subcategory, price, comparePrice, stock, description, images,
    shortTitle, modelNumber, sku, barcode, tax, hsnCode, moq, maxOrderQty, lowStockAlert,
    backorderAllowed, warehouse, images360, videoUrl, altText, weight, length, width, height,
    shippingCharges, freeShipping, deliveryTime, dynamicAttributes, seoTitle, metaDescription,
    metaKeywords, canonicalUrl, enableVariants, variantsList, specifications, resubmitProductId
  ]);

  const handleRestoreDraft = () => {
    try {
      const saved = localStorage.getItem('emahu_product_wizard_draft');
      if (saved) {
        const d = JSON.parse(saved);
        setName(d.name || '');
        setBrand(d.brand || '');
        setCategory(d.category || 'Electronics & Tech');
        setSubcategory(d.subcategory || 'General');
        setPrice(d.price || '');
        setComparePrice(d.comparePrice || '');
        setStock(d.stock || '');
        setDescription(d.description || '');
        setImages(d.images || []);
        setShortTitle(d.shortTitle || '');
        setModelNumber(d.modelNumber || '');
        setSku(d.sku || '');
        setBarcode(d.barcode || '');
        setTax(d.tax || '18');
        setHsnCode(d.hsnCode || '');
        setMoq(d.moq || '1');
        setMaxOrderQty(d.maxOrderQty || '');
        setLowStockAlert(d.lowStockAlert || '10');
        setBackorderAllowed(d.backorderAllowed || false);
        setWarehouse(d.warehouse || 'Main Hub - Delhi');
        setImages360(d.images360 || []);
        setVideoUrl(d.videoUrl || '');
        setAltText(d.altText || '');
        setWeight(d.weight || '');
        setLength(d.length || '');
        setWidth(d.width || '');
        setHeight(d.height || '');
        setShippingCharges(d.shippingCharges || '0');
        setFreeShipping(d.freeShipping || false);
        setDeliveryTime(d.deliveryTime || '3-5 Days');
        setDynamicAttributes(d.dynamicAttributes || {});
        setSeoTitle(d.seoTitle || '');
        setMetaDescription(d.metaDescription || '');
        setMetaKeywords(d.metaKeywords || '');
        setCanonicalUrl(d.canonicalUrl || '');
        setEnableVariants(d.enableVariants || false);
        setVariantsList(d.variantsList || []);
        setSpecifications(d.specifications || {});
      }
    } catch (e) {
      console.error(e);
    }
    setRestoreDraftBanner(false);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('emahu_product_wizard_draft');
    setRestoreDraftBanner(false);
  };

  // SEO Score Gauge
  const seoAudit = useMemo(() => {
    let score = 0;
    const checks = [];

    if (name.length >= 30 && name.length <= 80) score += 20;
    else score += 10;

    if (description.length >= 100) score += 20;
    else if (description.length >= 40) score += 10;

    if (images.length >= 3) score += 20;
    else if (images.length > 0) score += 10;

    if (seoTitle && seoTitle.length >= 20) score += 20;
    if (metaDescription && metaDescription.length >= 50) score += 20;

    return { score, color: score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444' };
  }, [name, description, images, seoTitle, metaDescription]);

  // Process selected file uploads
  const processFiles = (files) => {
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          const isHighRes = img.width >= 800 && img.height >= 800;
          const isSquare = Math.abs(img.width - img.height) < 50;
          let qualityStatus = 'High Quality (Square)';
          if (!isHighRes) qualityStatus = 'Warning: Low Resolution';
          else if (!isSquare) qualityStatus = 'Warning: Not Square Aspect';

          setImages(prev => [...prev, {
            url: dataUrl,
            quality: qualityStatus,
            isWarning: !isHighRes || !isSquare
          }]);
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e) => {
    processFiles(Array.from(e.target.files));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const addManualUrl = () => {
    if (manualUrlInput.trim() && manualUrlInput.trim().startsWith('http')) {
      setImages(prev => [...prev, {
        url: manualUrlInput.trim(),
        quality: 'External Link',
        isWarning: false
      }]);
      setManualUrlInput('');
    }
  };

  // AI Generators
  const handleAIGenerate = () => {
    if (!name.trim()) {
      setFormError('Please enter a product title first to generate assets.');
      return;
    }
    setAiGenerating(true);
    setAiStep('Analyzing product title...');
    
    setTimeout(() => {
      setAiStep('Creating listing descriptions...');
      setTimeout(() => {
        setAiStep('Polishing details...');
        setTimeout(() => {
          setDescription(`Experience premium luxury and top-tier capabilities with the ${name}. Fully optimized for durability and style, it sets a brand new standard in its category.\n\nKey features include high-performance design materials and optimized functionality.`);
          setShortTitle(`Premium high-fidelity ${name} built for optimal results.`);
          setSeoTitle(`${name} | Buy Professional Edition`);
          setMetaDescription(`Get the premium ${name} with official warranty and free delivery. Order today for the best marketplace discounts.`);
          setMetaKeywords(`${brand}, ${category}, premium, quality, online shop`);
          triggerToast('Wizard Success', 'AI generated descriptions populated successfully!', 'success');
          setAiGenerating(false);
          setAiStep('');
        }, 800);
      }, 800);
    }, 600);
  };

  // Submit Handler
  const handleFormSubmit = async () => {
    setFormError('');
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('emahu_seller_token');
      const payload = {
        name, brand, category, subcategory,
        price: parseFloat(price) || 0,
        comparePrice: parseFloat(comparePrice) || 0,
        stock: parseInt(stock) || 0,
        description,
        image: thumbnail || (images[0] ? images[0].url : '📦'),
        images: images.map(img => img.url),
        shortTitle, modelNumber, sku, barcode, tax: parseFloat(tax), hsnCode,
        moq: parseInt(moq) || 1,
        maxOrderQty: maxOrderQty ? parseInt(maxOrderQty) : undefined,
        lowStockAlert: parseInt(lowStockAlert) || 10,
        backorderAllowed, warehouse, images360: images360.map(img => img.url),
        videoUrl, altText,
        weight: parseFloat(weight) || undefined,
        length: parseFloat(length) || undefined,
        width: parseFloat(width) || undefined,
        height: parseFloat(height) || undefined,
        shippingCharges: parseFloat(shippingCharges) || 0,
        freeShipping, deliveryTime,
        dynamicAttributes, seoTitle, metaDescription,
        metaKeywords: metaKeywords ? metaKeywords.split(',').map(k => k.trim()).filter(Boolean) : [],
        canonicalUrl,
        variants: enableVariants ? variantsList : [],
        specifications
      };

      const url = resubmitProductId
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products/${resubmitProductId}/resubmit`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products`;

      const method = resubmitProductId ? 'PUT' : 'POST';

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
        localStorage.removeItem('emahu_product_wizard_draft');
        triggerToast('Success', resubmitProductId ? 'Listing updated successfully!' : 'Listing requested successfully!', 'success');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setFormError(data.error || 'Server rejected product configuration.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Network communication timeout.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerToast = (title, message, type = 'success') => {
    alert(`${title}: ${message}`);
  };

  if (!isOpen) return null;

  // Active brand list filtering
  const matchingBrands = allowedBrands.length > 0 ? allowedBrands : FALLBACK_BRANDS;

  return (
    <div className="dynamic-form-overlay">
      <div className="dynamic-form-card">
        
        {/* Header */}
        <div className="dynamic-form-header">
          <div>
            <h2>{resubmitProductId ? '🔄 Edit Listing' : '🚀 Add Category-Driven Product Listing'}</h2>
            <p>Onboarding wizard adapted dynamically to the {category} database schemas.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {lastSaved && <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Draft saved: {lastSaved}</span>}
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Restore draft banner */}
        {restoreDraftBanner && (
          <div style={{ background: '#f59e0b', color: '#000', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
            <span>⚠️ An unsaved product draft was found from a previous session.</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleRestoreDraft} style={{ background: '#000', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Restore Draft</button>
              <button onClick={handleDiscardDraft} style={{ background: 'transparent', color: '#000', border: '1px solid #000', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}>Discard</button>
            </div>
          </div>
        )}

        {/* Stepper progress */}
        <div className="stepper-container">
          {[
            { s: 1, label: '1. Basic Info' },
            { s: 2, label: '2. Media' },
            { s: 3, label: '3. Attributes' },
            { s: 4, label: '4. Variants Matrix' },
            { s: 5, label: '5. Specifications' },
            { s: 6, label: '6. Pricing' },
            { s: 7, label: '7. Inventory' },
            { s: 8, label: '8. Shipping' },
            { s: 9, label: '9. Warranty & Return' },
            { s: 10, label: '10. SEO Config' }
          ].map(step => (
            <div 
              key={step.s} 
              className={`step-item ${currentStep === step.s ? 'active' : ''} ${currentStep > step.s ? 'completed' : ''}`}
              onClick={() => setCurrentStep(step.s)}
            >
              <div className="step-badge">{currentStep > step.s ? '✓' : step.s}</div>
              <div className="step-text">{step.label}</div>
            </div>
          ))}
        </div>

        {/* Stepper Content workspace */}
        <div className="form-workspace">
          
          {/* Left panel inputs */}
          <div className="form-fields-column">
            {formError && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.85rem' }}>⚠️ {formError}</div>}

            {/* STEP 1: BASIC INFORMATION */}
            {currentStep === 1 && (
              <>
                <h3 className="form-section-title">📂 Category & brand parameters</h3>
                <div className="form-group">
                  <label className="form-label">Search & Select Category *</label>
                  <CategorySelector value={category} onChange={setCategory} />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      Subcategory {configLoading && <span style={{ color: '#06b6d4', fontSize: '0.72rem' }}>⟳ Loading...</span>}
                    </label>
                    {availableSubcategories.length > 0 ? (
                      <select
                        className="form-select"
                        value={subcategory}
                        onChange={e => setSubcategory(e.target.value)}
                      >
                        <option value="General">— General (All {category}) —</option>
                        {availableSubcategories.map(sub => (
                          <option key={sub.id || sub.name} value={sub.name}>{sub.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Cameras, Laptops..."
                        value={subcategory === 'General' ? '' : subcategory}
                        onChange={e => setSubcategory(e.target.value || 'General')}
                      />
                    )}
                    {selectedCategoryConfig && selectedCategoryConfig.attributes && selectedCategoryConfig.attributes.length > 0 && (
                      <p style={{ fontSize: '0.72rem', color: '#10b981', margin: '4px 0 0 0' }}>
                        ✓ {selectedCategoryConfig.attributes.length} attribute(s) loaded for this subcategory
                      </p>
                    )}
                  </div>

                  <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label">Brand *</label>
                    <input 
                      type="text"
                      className="form-input"
                      placeholder="Type brand name..."
                      value={brand}
                      onChange={(e) => {
                        setBrand(e.target.value);
                        setBrandQuery(e.target.value);
                        setShowBrandSuggestions(true);
                      }}
                      onFocus={() => setShowBrandSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowBrandSuggestions(false), 200)}
                      required
                    />
                    {showBrandSuggestions && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, width: '100%',
                        maxHeight: '120px', overflowY: 'auto', background: '#1e293b',
                        border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', zIndex: 999
                      }}>
                        {matchingBrands.filter(b => b.toLowerCase().includes(brandQuery.toLowerCase())).map(b => (
                          <div 
                            key={b}
                            onMouseDown={() => { setBrand(b); setShowBrandSuggestions(false); }}
                            style={{ padding: '8px 12px', cursor: 'pointer', hover: { background: '#334155' } }}
                          >
                            {b}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Product Title / Name *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Nike Air Max Alpha"
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Model Number</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. NK-2024-X"
                      value={modelNumber} 
                      onChange={e => setModelNumber(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Product Short Title / Subtitle</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. High breathability running sneakers"
                    value={shortTitle} 
                    onChange={e => setShortTitle(e.target.value)} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Detailed Description *</label>
                  <textarea 
                    className="form-textarea" 
                    rows="4"
                    placeholder="Explain specifications, warranty conditions, packaging..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {/* STEP 2: MEDIA */}
            {currentStep === 2 && (
              <>
                <h3 className="form-section-title">🖼️ Product gallery & media assets</h3>
                <div 
                  className="media-dropzone"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{ borderColor: isDragging ? '#06b6d4' : 'rgba(255,255,255,0.15)' }}
                >
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={handleFileSelect} 
                    style={{ display: 'none' }}
                    id="image-picker" 
                  />
                  <label htmlFor="image-picker" style={{ cursor: 'pointer' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📸</div>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>Drag & Drop picture files here</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>or click to browse local files</p>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <input 
                    type="url" 
                    className="form-input" 
                    placeholder="Or paste external image web address..." 
                    style={{ flex: 1 }}
                    value={manualUrlInput}
                    onChange={e => setManualUrlInput(e.target.value)}
                  />
                  <button type="button" className="footer-btn next" onClick={addManualUrl} style={{ padding: '0 16px' }}>Add Link</button>
                </div>

                {images.length > 0 && (
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 'bold' }}>Uploaded Images:</span>
                    <div className="gallery-grid">
                      {images.map((img, idx) => (
                        <div key={idx} className="gallery-thumb-container" style={{ border: thumbnail === img.url ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)' }}>
                          <img src={img.url} alt="gallery" className="gallery-thumb" />
                          <button type="button" className="remove-thumb-btn" onClick={() => setImages(images.filter((_, i) => i !== idx))}>×</button>
                          <span className={`quality-badge ${img.isWarning ? 'warning' : ''}`}>{img.quality}</span>
                          <button 
                            type="button" 
                            onClick={() => setThumbnail(img.url)}
                            style={{ position: 'absolute', bottom: '4px', right: '4px', fontSize: '0.65rem', background: '#000', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px' }}
                          >
                            {thumbnail === img.url ? 'Featured' : 'Feature'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Product Video URL (YouTube or direct MP4 link)</label>
                  <input 
                    type="url" 
                    className="form-input" 
                    placeholder="e.g. https://www.youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={e => setVideoUrl(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* STEP 3: DYNAMIC ATTRIBUTES */}
            {currentStep === 3 && (
              <>
                <h3 className="form-section-title">📊 Category custom attributes</h3>
                {selectedCategoryConfig && selectedCategoryConfig.attributes && selectedCategoryConfig.attributes.length > 0 ? (
                  <div className="form-grid-2">
                    {selectedCategoryConfig.attributes.map((attr) => {
                      const attrVal = dynamicAttributes[attr.name] || '';
                      
                      return (
                        <div key={attr.name} className="form-group">
                          <label className="form-label">
                            {attr.name} {attr.isRequired ? '*' : ''} {attr.isVariant ? '(Variant-generator)' : ''}
                          </label>
                          {attr.type === 'select' ? (
                            <select
                              className="form-select"
                              value={attrVal}
                              onChange={(e) => setDynamicAttributes({ ...dynamicAttributes, [attr.name]: e.target.value })}
                            >
                              <option value="">Select Option...</option>
                              {attr.options && attr.options.split(',').map(opt => (
                                <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={attr.type === 'number' ? 'number' : 'text'}
                              className="form-input"
                              placeholder={`Enter ${attr.name}...`}
                              value={attrVal}
                              onChange={(e) => setDynamicAttributes({ ...dynamicAttributes, [attr.name]: e.target.value })}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                    ℹ️ This category has no custom attributes configured. You can skip directly to next step.
                  </div>
                )}
              </>
            )}

            {/* STEP 4: DYNAMIC VARIANTS MATRIX */}
            {currentStep === 4 && (
              <>
                <h3 className="form-section-title">🧬 Variant configuration matrix</h3>
                <div style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    <input 
                      type="checkbox"
                      checked={enableVariants}
                      onChange={(e) => setEnableVariants(e.target.checked)}
                    />
                    <span>Configure product combinations (Multiple sizes, colors, capacities, etc.)</span>
                  </label>
                </div>

                {enableVariants && (
                  <div>
                    {selectedCategoryConfig && selectedCategoryConfig.attributes && selectedCategoryConfig.attributes.filter(a => a.isVariant).length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>Input variants options below separating items by commas. Matrix generates automatically.</p>
                        
                        {selectedCategoryConfig.attributes.filter(a => a.isVariant).map((a) => {
                          const valString = variantAttributeSelections[a.name] ? variantAttributeSelections[a.name].join(', ') : '';
                          return (
                            <div key={a.name} className="form-group">
                              <label className="form-label">{a.name} Option values (Comma separated)</label>
                              <input
                                type="text"
                                className="form-input"
                                placeholder={`e.g. ${a.options || 'Red, Blue, Green'}`}
                                value={valString}
                                onChange={(e) => handleVariantOptionChange(a.name, e.target.value)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(239, 68, 68, 0.05)', color: '#f87171', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.8rem', border: '1px solid rgba(239,68,68,0.1)' }}>
                        ⚠️ Warning: No variant-generating attributes are defined for this category. Admin must tag attributes with &apos;isVariant = true&apos; to generate combinations.
                      </div>
                    )}

                    {variantsList.length > 0 && (
                      <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                          <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.03)', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                              <th style={{ padding: '10px', textAlign: 'left' }}>Combination</th>
                              <th style={{ padding: '10px', textAlign: 'left' }}>SKU Code</th>
                              <th style={{ padding: '10px', textAlign: 'left' }}>MRP (₹)</th>
                              <th style={{ padding: '10px', textAlign: 'left' }}>Price (₹)</th>
                              <th style={{ padding: '10px', textAlign: 'left' }}>Stock</th>
                              <th style={{ padding: '10px', textAlign: 'left' }}>Weight (kg)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {variantsList.map((v, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <td style={{ padding: '10px', fontWeight: 'bold' }}>{v.variantName}</td>
                                <td style={{ padding: '10px' }}>
                                  <input 
                                    type="text" 
                                    className="form-input" 
                                    style={{ margin: 0, height: '28px', padding: '2px 6px', fontSize: '0.78rem' }}
                                    value={v.sku}
                                    onChange={(e) => {
                                      const copy = [...variantsList];
                                      copy[i].sku = e.target.value;
                                      setVariantsList(copy);
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '10px' }}>
                                  <input 
                                    type="number" 
                                    className="form-input" 
                                    style={{ margin: 0, height: '28px', padding: '2px 6px', fontSize: '0.78rem', width: '80px' }}
                                    value={v.mrp}
                                    onChange={(e) => {
                                      const copy = [...variantsList];
                                      copy[i].mrp = parseFloat(e.target.value) || 0;
                                      setVariantsList(copy);
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '10px' }}>
                                  <input 
                                    type="number" 
                                    className="form-input" 
                                    style={{ margin: 0, height: '28px', padding: '2px 6px', fontSize: '0.78rem', width: '80px' }}
                                    value={v.price}
                                    onChange={(e) => {
                                      const copy = [...variantsList];
                                      copy[i].price = parseFloat(e.target.value) || 0;
                                      setVariantsList(copy);
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '10px' }}>
                                  <input 
                                    type="number" 
                                    className="form-input" 
                                    style={{ margin: 0, height: '28px', padding: '2px 6px', fontSize: '0.78rem', width: '70px' }}
                                    value={v.stock}
                                    onChange={(e) => {
                                      const copy = [...variantsList];
                                      copy[i].stock = parseInt(e.target.value) || 0;
                                      setVariantsList(copy);
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '10px' }}>
                                  <input 
                                    type="number" 
                                    className="form-input" 
                                    style={{ margin: 0, height: '28px', padding: '2px 6px', fontSize: '0.78rem', width: '70px' }}
                                    value={v.weight}
                                    onChange={(e) => {
                                      const copy = [...variantsList];
                                      copy[i].weight = parseFloat(e.target.value) || 0;
                                      setVariantsList(copy);
                                    }}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* STEP 5: SPECIFICATIONS */}
            {currentStep === 5 && (
              <>
                <h3 className="form-section-title">📐 Product technical specifications</h3>
                {selectedCategoryConfig && selectedCategoryConfig.specifications && selectedCategoryConfig.specifications.length > 0 ? (
                  <div className="form-grid-2">
                    {selectedCategoryConfig.specifications.map((spec) => (
                      <div key={spec.name} className="form-group">
                        <label className="form-label">{spec.name} {spec.isRequired ? '*' : ''}</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder={`Enter ${spec.name}...`}
                          value={specifications[spec.name] || ''}
                          onChange={(e) => setSpecifications({ ...specifications, [spec.name]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                    ℹ️ This category has no specifications template. You can proceed directly.
                  </div>
                )}
              </>
            )}

            {/* STEP 6: PRICING */}
            {currentStep === 6 && (
              <>
                <h3 className="form-section-title">💰 Product catalog pricing</h3>
                
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Selling Price (INR) *</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="e.g. 9999"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Compare-at Price (MRP) *</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="e.g. 14999"
                      value={comparePrice}
                      onChange={e => setComparePrice(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Seller Cost Price (Calculates margin)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="e.g. 6000"
                      value={costPrice}
                      onChange={e => setCostPrice(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Profit Margin Estimate (%)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      disabled 
                      value={`${profitMargin}%`}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">GST Tax Slab (%) *</label>
                    <select className="form-select" value={tax} onChange={e => setTax(e.target.value)}>
                      <option value="0">0% (Exempt)</option>
                      <option value="5">5% (Essentials)</option>
                      <option value="12">12% (Standard)</option>
                      <option value="18">18% (Services/Tech)</option>
                      <option value="28">28% (Luxury)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">HSN Code</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. 84713010"
                      value={hsnCode}
                      onChange={e => setHsnCode(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* STEP 7: INVENTORY */}
            {currentStep === 7 && (
              <>
                <h3 className="form-section-title">📦 Stock & inventory control</h3>
                
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Product Base SKU Code</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. EMA-PROD-XYZ"
                      value={sku}
                      onChange={e => setSku(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">UPC / EAN / Barcode</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. 8901234567890"
                      value={barcode}
                      onChange={e => setBarcode(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Opening Stock Quantity *</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="e.g. 50"
                      value={stock}
                      onChange={e => setStock(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Low Stock Alert Threshold</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={lowStockAlert}
                      onChange={e => setLowStockAlert(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Fulfillment Warehouse Location</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={warehouse}
                    onChange={e => setWarehouse(e.target.value)}
                  />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '10px' }}>
                  <input 
                    type="checkbox"
                    checked={backorderAllowed}
                    onChange={e => setBackorderAllowed(e.target.checked)}
                  />
                  <span>Allow backorders (Sell products when stock is zero)</span>
                </label>
              </>
            )}

            {/* STEP 8: SHIPPING */}
            {currentStep === 8 && (
              <>
                <h3 className="form-section-title">🚚 Box weight & dimensions</h3>
                
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Package Weight (kg) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="form-input" 
                      placeholder="e.g. 1.2"
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estimated Delivery Time Window</label>
                    <select className="form-select" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)}>
                      <option value="1-2 Days">1-2 Days (Express)</option>
                      <option value="3-5 Days">3-5 Days (Standard)</option>
                      <option value="5-7 Days">5-7 Days (Economy)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Length (cm)</label>
                    <input type="number" className="form-input" placeholder="L" value={length} onChange={e => setLength(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Width (cm)</label>
                    <input type="number" className="form-input" placeholder="W" value={width} onChange={e => setWidth(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Height (cm)</label>
                    <input type="number" className="form-input" placeholder="H" value={height} onChange={e => setHeight(e.target.value)} />
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginTop: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Shipping Charges (INR)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      disabled={freeShipping}
                      value={shippingCharges}
                      onChange={e => setShippingCharges(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', paddingBottom: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox"
                        checked={freeShipping}
                        onChange={(e) => {
                          setFreeShipping(e.target.checked);
                          if (e.target.checked) setShippingCharges('0');
                        }}
                      />
                      <span>Provide Free Delivery for customers</span>
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* STEP 9: WARRANTY & POLICIES */}
            {currentStep === 9 && (
              <>
                <h3 className="form-section-title">🛡️ Warranty details & merchant policies</h3>
                
                <div className="form-group">
                  <label className="form-label">Warranty / Service Information</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 1 Year Domestic Brand Warranty"
                    value={warrantyInfo}
                    onChange={e => setWarrantyInfo(e.target.value)}
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Return window policy</label>
                    <select className="form-select" value={returnPolicy} onChange={e => setReturnPolicy(e.target.value)}>
                      <option value="Non-Returnable">Non-Returnable</option>
                      <option value="7 Days Returnable">7 Days Returnable</option>
                      <option value="15 Days Returnable">15 Days Returnable</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Replacement Period (Days)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={replacementDays}
                      onChange={e => setReplacementDays(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Order cancellation limit</label>
                  <select className="form-select" value={cancellationPolicy} onChange={e => setCancellationPolicy(e.target.value)}>
                    <option value="Cancellation Allowed">Allowed before warehouse dispatch</option>
                    <option value="Non-Cancellable">Non-Cancellable after order placement</option>
                  </select>
                </div>
              </>
            )}

            {/* STEP 10: SEO CONFIG */}
            {currentStep === 10 && (
              <>
                <h3 className="form-section-title">🔍 Search engine optimization</h3>
                
                <div className="form-group">
                  <label className="form-label">Meta Search Engine Title</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={seoTitle}
                    onChange={e => setSeoTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Meta Search Engine Description</label>
                  <textarea 
                    className="form-textarea" 
                    rows="3"
                    value={metaDescription}
                    onChange={e => setMetaDescription(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Keywords / Tags (Comma separated)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. phone, gadget, android"
                    value={metaKeywords}
                    onChange={e => setMetaKeywords(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Canonical Web Link URL</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={canonicalUrl}
                    onChange={e => setCanonicalUrl(e.target.value)}
                  />
                </div>
              </>
            )}

          </div>

          {/* Right Preview column */}
          <div className="preview-column">
            <div className="preview-title">
              <span>Catalog live page preview</span>
              <button 
                type="button" 
                className="toggle-preview-mode"
                onClick={() => setPreviewMode(prev => prev === 'desktop' ? 'mobile' : 'desktop')}
              >
                Display Mode: {previewMode.toUpperCase()}
              </button>
            </div>

            <div className={`preview-canvas ${previewMode}`}>
              <div className="preview-image-slider">
                {images.length > 0 ? (
                  <img src={images[activePreviewImage]?.url || thumbnail} alt="preview" />
                ) : (
                  <span>📸 Image preview slot</span>
                )}
                {discountPercent > 0 && <span className="preview-discount-badge">{discountPercent}% OFF</span>}
              </div>

              {images.length > 1 && (
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
                  {images.map((img, idx) => (
                    <img 
                      key={idx} 
                      src={img.url} 
                      onClick={() => setActivePreviewImage(idx)}
                      style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', opacity: activePreviewImage === idx ? 1 : 0.6 }} 
                    />
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 'bold' }}>{brand || 'Brand Name'}</span>
                <strong style={{ color: '#fff', fontSize: '1rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{name || 'Product Title Placeholder'}</strong>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', marginTop: '4px' }}>
                  <strong style={{ fontSize: '1.15rem', color: '#f8fafc' }}>₹{(parseFloat(price) || 0).toLocaleString('en-IN')}</strong>
                  {parseFloat(comparePrice) > parseFloat(price) && (
                    <span style={{ textDecoration: 'line-through', fontSize: '0.75rem', color: '#64748b' }}>₹{(parseFloat(comparePrice) || 0).toLocaleString('en-IN')}</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', fontSize: '0.7rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', marginTop: '4px' }}>
                  <span>📦 Stock: {stock || 0} left</span>
                  <span>🚚 {freeShipping ? 'Free Delivery' : 'Standard Delivery'}</span>
                </div>
              </div>
            </div>

            {/* SEO circular gauge score widget */}
            <div className="seo-score-container" style={{ marginTop: '16px' }}>
              <div className="seo-ring-outer">
                <span className="seo-score-num" style={{ color: seoAudit.color }}>{seoAudit.score}</span>
                <svg width="54" height="54">
                  <circle cx="27" cy="27" r="23" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                  <circle cx="27" cy="27" r="23" fill="transparent" stroke={seoAudit.color} strokeWidth="4" strokeDasharray={`${(seoAudit.score / 100) * 144} 144`} transform="rotate(-90 27 27)" />
                </svg>
              </div>
              <div>
                <span className="seo-score-label">Listing Score Audit</span>
                <p className="seo-score-desc">Calculated automatically from images, description depth, SEO keywords.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer Navigations */}
        <div className="dynamic-form-footer">
          <button 
            type="button" 
            className="footer-btn prev"
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
          >
            Previous Step
          </button>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            {currentStep < totalSteps ? (
              <button 
                type="button" 
                className="footer-btn next"
                onClick={() => {
                  if (currentStep === 1) {
                    if (!name.trim()) { setFormError('Product Name is required.'); return; }
                    if (!brand.trim()) { setFormError('Brand is required.'); return; }
                    if (!category.trim()) { setFormError('Category is required.'); return; }
                    if (selectedCategoryConfig && selectedCategoryConfig.validationRules) {
                      if (selectedCategoryConfig.validationRules.brandRequired && !brand.trim()) {
                        setFormError(`Brand name is required for category: ${category}`);
                        return;
                      }
                    }
                  }
                  if (currentStep === 2) {
                    const minImgs = (selectedCategoryConfig && selectedCategoryConfig.validationRules && selectedCategoryConfig.validationRules.minImages) || 1;
                    if (images.length < minImgs) {
                      setFormError(`Please upload at least ${minImgs} image(s) for this category.`);
                      return;
                    }
                  }
                  if (currentStep === 3) {
                    if (selectedCategoryConfig && selectedCategoryConfig.attributes) {
                      const missingRequired = selectedCategoryConfig.attributes.find(a => a.isRequired && !dynamicAttributes[a.name]);
                      if (missingRequired) {
                        setFormError(`Dynamic attribute "${missingRequired.name}" is mandatory.`);
                        return;
                      }
                    }
                  }
                  if (currentStep === 4) {
                    if (selectedCategoryConfig && selectedCategoryConfig.validationRules && selectedCategoryConfig.validationRules.variantRequired && !enableVariants) {
                      setFormError('Setting up variations is mandatory for this category.');
                      return;
                    }
                  }
                  if (currentStep === 5) {
                    if (selectedCategoryConfig && selectedCategoryConfig.specifications) {
                      const missingRequiredSpec = selectedCategoryConfig.specifications.find(s => s.isRequired && !specifications[s.name]);
                      if (missingRequiredSpec) {
                        setFormError(`Specification field "${missingRequiredSpec.name}" is mandatory.`);
                        return;
                      }
                    }
                  }
                  if (currentStep === 6) {
                    if (!price || parseFloat(price) <= 0) { setFormError('Selling price must be greater than zero.'); return; }
                    if (!comparePrice || parseFloat(comparePrice) <= 0) { setFormError('MRP must be greater than zero.'); return; }
                    if (parseFloat(comparePrice) <= parseFloat(price)) { setFormError('MRP must be greater than the selling price.'); return; }
                  }
                  if (currentStep === 7) {
                    if (!stock || parseInt(stock) < 0) { setFormError('Stock volume is required.'); return; }
                  }
                  if (currentStep === 8) {
                    if (!weight || parseFloat(weight) <= 0) { setFormError('Package weight is required.'); return; }
                  }

                  setFormError('');
                  setCurrentStep(prev => prev + 1);
                }}
              >
                Next Step
              </button>
            ) : (
              <button 
                type="button" 
                className="footer-btn submit"
                onClick={handleFormSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting Request...' : 'Publish Listing Request'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
