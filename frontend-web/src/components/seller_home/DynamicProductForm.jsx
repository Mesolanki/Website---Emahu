'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import CategorySelector from './CategorySelector';
import './DynamicProductForm.css';

// Popular Brand Names mapping per category group for autocomplete suggestions
const BRAND_SUGGESTIONS = {
  'Electronics': ['Apple', 'Samsung', 'Sony', 'OnePlus', 'Dell', 'HP', 'Lenovo', 'Asus', 'Logitech', 'Intel', 'Aura'],
  'Apparel': ['Nike', 'Adidas', 'Zara', 'H&M', 'Puma', 'Levi\'s', 'Tommy Hilfiger', 'Calvin Klein', 'Gucci', 'Emahu Apparel'],
  'Shoes': ['Nike', 'Adidas', 'Puma', 'Reebok', 'Skechers', 'Bata', 'Woodland', 'Crocs', 'Converse'],
  'Kitchen': ['Prestige', 'Hawkins', 'Pigeon', 'Philips', 'Bajaj', 'Borosil', 'Milton', 'Tupperware'],
  'Furniture': ['IKEA', 'Ashley Furniture', 'West Elm', 'Wayfair', 'Crate & Barrel', 'Godrej Interio', 'Urban Ladder'],
  'Grocery': ['Nestle', 'Cadbury', 'Amul', 'Tata', 'Haldiram\'s', 'Kellogg\'s', 'PepsiCo', 'Coca-Cola', 'Heinz', 'Dabur'],
  'Beauty': ['L\'Oreal', 'Maybelline', 'Nivea', 'Dove', 'Clinique', 'MAC', 'Estee Lauder', 'The Body Shop', 'Neutrogena'],
  'General': ['Generic', 'Emahu Brand', 'Custom']
};

export default function DynamicProductForm({ isOpen, onClose, resubmitProductId, onSuccess, sellerUser, products = [] }) {
  // Stepper state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 7;

  // Form State variables
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Electronics & Tech');
  const [productType, setProductType] = useState('');
  
  const [shortTitle, setShortTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [bulletFeatures, setBulletFeatures] = useState(['', '']);
  const [highlights, setHighlights] = useState('');
  const [packageContents, setPackageContents] = useState('');
  const [warrantyInfo, setWarrantyInfo] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('India');
  const [manufacturer, setManufacturer] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');

  const [price, setPrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [tax, setTax] = useState('18');
  const [hsnCode, setHsnCode] = useState('');
  const [moq, setMoq] = useState('1');
  const [maxOrderQty, setMaxOrderQty] = useState('');

  const [stock, setStock] = useState('');
  const [lowStockAlert, setLowStockAlert] = useState('10');
  const [backorderAllowed, setBackorderAllowed] = useState(false);
  const [warehouse, setWarehouse] = useState('Main Hub - Delhi');

  const [thumbnail, setThumbnail] = useState('');
  const [images, setImages] = useState([]);
  const [images360, setImages360] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [altText, setAltText] = useState('');

  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [shippingCharges, setShippingCharges] = useState('0');
  const [freeShipping, setFreeShipping] = useState(false);
  const [deliveryTime, setDeliveryTime] = useState('3-5 Days');

  // Dynamic Category Attributes state
  const [dynamicAttributes, setDynamicAttributes] = useState({});

  // SEO details
  const [seoTitle, setSeoTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');

  // Variants state
  const [enableVariants, setEnableVariants] = useState(false);
  const [variantsList, setVariantsList] = useState([]);
  const [variantTypes, setVariantTypes] = useState({
    size: false, color: false, storage: false, RAM: false, packSize: false, material: false
  });
  const [variantOptionsInput, setVariantOptionsInput] = useState({
    size: 'S, M, L', color: 'Black, White', storage: '128GB, 256GB', RAM: '8GB', packSize: 'Pack of 1', material: 'Cotton'
  });

  // UI state controllers
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [brandQuery, setBrandQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [manualUrlInput, setManualUrlInput] = useState('');
  
  // AI generator state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiStep, setAiStep] = useState('');

  // Live storefront preview state
  const [previewMode, setPreviewMode] = useState('desktop'); // desktop or mobile
  const [activePreviewImage, setActivePreviewImage] = useState(0);

  // Bulk Upload sheet parsing
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkProducts, setBulkProducts] = useState([]);
  const [bulkIsDragging, setBulkIsDragging] = useState(false);
  const [bulkImportStatus, setBulkImportStatus] = useState('');

  // Auto-Save notification
  const [lastSaved, setLastSaved] = useState('');
  const [restoreDraftBanner, setRestoreDraftBanner] = useState(false);

  // Auto-generate Slug when Name changes
  useEffect(() => {
    if (name) {
      const generated = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      setTimeout(() => {
        setSlug(generated);
        setSeoTitle(`${name} | Buy Premium`);
        setCanonicalUrl(`https://emahu.com/products/${generated}`);
      }, 0);
    }
  }, [name]);

  // Sync comparePrice and price to calculate Discount %
  const discountPercent = useMemo(() => {
    const p = parseFloat(price);
    const cp = parseFloat(comparePrice);
    if (p && cp && cp > p) {
      return Math.round(((cp - p) / cp) * 100);
    }
    return 0;
  }, [price, comparePrice]);

  // Load product if editing (resubmitting)
  useEffect(() => {
    if (resubmitProductId && products.length > 0) {
      const prod = products.find(p => (p.id || p._id) === resubmitProductId);
      if (prod) {
        setTimeout(() => {
          setName(prod.name || '');
          setBrand(prod.brand || '');
          setCategory(prod.category || 'Electronics & Tech');
          setPrice(prod.price !== undefined ? String(prod.price) : '');
          setComparePrice(prod.comparePrice !== undefined ? String(prod.comparePrice) : '');
          setStock(prod.stock !== undefined ? String(prod.stock) : '');
          setDescription(prod.description || '');
          setImages(prod.images ? prod.images.map(img => typeof img === 'string' ? { url: img, quality: 'High Quality', isWarning: false } : img) : []);
          if (prod.images && prod.images.length > 0) {
            setThumbnail(prod.thumbnail || prod.images[0]);
          }
          
          // Fill other extended properties if they exist
          setShortTitle(prod.shortTitle || '');
          setSlug(prod.slug || '');
          if (prod.bulletFeatures && prod.bulletFeatures.length > 0) {
            setBulletFeatures(prod.bulletFeatures);
          }
          setHighlights(prod.highlights || '');
          setPackageContents(prod.packageContents || '');
          setWarrantyInfo(prod.warrantyInfo || '');
          setCountryOfOrigin(prod.countryOfOrigin || 'India');
          setManufacturer(prod.manufacturer || '');
          setModelNumber(prod.modelNumber || '');
          setSku(prod.sku || '');
          setBarcode(prod.barcode || '');
          setTax(prod.tax !== undefined ? String(prod.tax) : '18');
          setHsnCode(prod.hsnCode || '');
          setMoq(prod.moq !== undefined ? String(prod.moq) : '1');
          setMaxOrderQty(prod.maxOrderQty !== undefined ? String(prod.maxOrderQty) : '');
          setLowStockAlert(prod.lowStockAlert !== undefined ? String(prod.lowStockAlert) : '10');
          setBackorderAllowed(prod.backorderAllowed || false);
          setWarehouse(prod.warehouse || 'Main Hub - Delhi');
          setImages360(prod.images360 ? prod.images360.map(img => typeof img === 'string' ? { url: img, quality: 'High Quality', isWarning: false } : img) : []);
          setVideoUrl(prod.videoUrl || '');
          setAltText(prod.altText || '');
          setWeight(prod.weight !== undefined ? String(prod.weight) : '');
          setLength(prod.length !== undefined ? String(prod.length) : '');
          setWidth(prod.width !== undefined ? String(prod.width) : '');
          setHeight(prod.height !== undefined ? String(prod.height) : '');
          setShippingCharges(prod.shippingCharges !== undefined ? String(prod.shippingCharges) : '0');
          setFreeShipping(prod.freeShipping || false);
          setDeliveryTime(prod.deliveryTime || '3-5 Days');
          setDynamicAttributes(prod.dynamicAttributes || {});
          setSeoTitle(prod.seoTitle || '');
          setMetaDescription(prod.metaDescription || '');
          if (Array.isArray(prod.metaKeywords)) {
            setMetaKeywords(prod.metaKeywords.join(', '));
          } else {
            setMetaKeywords(prod.metaKeywords || '');
          }
          setCanonicalUrl(prod.canonicalUrl || '');
          if (prod.variants && prod.variants.length > 0) {
            setEnableVariants(true);
            setVariantsList(prod.variants);
          }
        }, 0);
      }
    }
  }, [resubmitProductId, products]);

  // Draft Auto-Save hook
  useEffect(() => {
    // Check if there is an unsaved draft on mount
    const savedDraft = localStorage.getItem('emahu_product_wizard_draft');
    if (savedDraft && !resubmitProductId) {
      setTimeout(() => {
        setRestoreDraftBanner(true);
      }, 0);
    }

    const interval = setInterval(() => {
      // Don't auto-save if we are editing an existing item
      if (resubmitProductId) return;

      const draftData = {
        name, brand, category, price, comparePrice, stock, description, images,
        shortTitle, slug, bulletFeatures, highlights, packageContents, warrantyInfo,
        countryOfOrigin, manufacturer, modelNumber, sku, barcode, tax, hsnCode, moq,
        maxOrderQty, lowStockAlert, backorderAllowed, warehouse, images360, videoUrl,
        altText, weight, length, width, height, shippingCharges, freeShipping,
        deliveryTime, dynamicAttributes, seoTitle, metaDescription, metaKeywords,
        canonicalUrl, enableVariants, variantsList, timestamp: new Date().toLocaleTimeString()
      };
      
      localStorage.setItem('emahu_product_wizard_draft', JSON.stringify(draftData));
      setLastSaved(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 10000);

    return () => clearInterval(interval);
  }, [
    name, brand, category, price, comparePrice, stock, description, images,
    shortTitle, slug, bulletFeatures, highlights, packageContents, warrantyInfo,
    countryOfOrigin, manufacturer, modelNumber, sku, barcode, tax, hsnCode, moq,
    maxOrderQty, lowStockAlert, backorderAllowed, warehouse, images360, videoUrl,
    altText, weight, length, width, height, shippingCharges, freeShipping,
    deliveryTime, dynamicAttributes, seoTitle, metaDescription, metaKeywords,
    canonicalUrl, enableVariants, variantsList, resubmitProductId
  ]);

  const handleRestoreDraft = () => {
    try {
      const savedDraft = localStorage.getItem('emahu_product_wizard_draft');
      if (savedDraft) {
        const d = JSON.parse(savedDraft);
        setName(d.name || '');
        setBrand(d.brand || '');
        setCategory(d.category || 'Electronics & Tech');
        setPrice(d.price || '');
        setComparePrice(d.comparePrice || '');
        setStock(d.stock || '');
        setDescription(d.description || '');
        setImages(d.images || []);
        setShortTitle(d.shortTitle || '');
        setSlug(d.slug || '');
        setBulletFeatures(d.bulletFeatures || ['', '']);
        setHighlights(d.highlights || '');
        setPackageContents(d.packageContents || '');
        setWarrantyInfo(d.warrantyInfo || '');
        setCountryOfOrigin(d.countryOfOrigin || 'India');
        setManufacturer(d.manufacturer || '');
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

  // Circular SEO Audit Score calculation
  const seoAudit = useMemo(() => {
    let score = 0;
    const checks = [];

    // Title Length (ideal: 40-70 chars)
    if (seoTitle.length >= 40 && seoTitle.length <= 70) {
      score += 20;
      checks.push('Title length matches SEO standards.');
    } else {
      checks.push('Set SEO Title between 40-70 characters.');
    }

    // Description Length (ideal: > 150 chars)
    if (description.length >= 150) {
      score += 20;
      checks.push('Rich product description loaded.');
    } else {
      checks.push('Product description should be at least 150 characters.');
    }

    // Alt text populated
    if (altText.trim().length > 3) {
      score += 15;
      checks.push('Image alt attributes set.');
    } else {
      checks.push('Add alt text for image reader accessibility.');
    }

    // Meta Description (ideal: 120-160 chars)
    if (metaDescription.length >= 120 && metaDescription.length <= 160) {
      score += 15;
      checks.push('Meta Description length is ideal.');
    } else {
      checks.push('Set Meta Description between 120-160 characters.');
    }

    // Gallery count (>= 3)
    if (images.length >= 3) {
      score += 15;
      checks.push('Visual coverage: 3 or more gallery slots.');
    } else {
      checks.push('Upload 3+ images to increase visual index.');
    }

    // Keywords set
    if (metaKeywords.trim().split(',').filter(Boolean).length >= 3) {
      score += 15;
      checks.push('Search tags/keywords populated.');
    } else {
      checks.push('Provide at least 3 keywords.');
    }

    return { score, checks };
  }, [seoTitle, description, altText, metaDescription, images, metaKeywords]);

  // Brand Auto-complete matcher
  const matchingBrands = useMemo(() => {
    if (!brandQuery.trim()) return [];
    
    // Find category keys
    let relevantBrands = [];
    const lowerCat = category.toLowerCase();
    if (lowerCat.includes('electric') || lowerCat.includes('tech')) {
      relevantBrands = BRAND_SUGGESTIONS.Electronics;
    } else if (lowerCat.includes('apparel') || lowerCat.includes('fashion') || lowerCat.includes('cloth')) {
      relevantBrands = BRAND_SUGGESTIONS.Apparel;
    } else if (lowerCat.includes('shoe') || lowerCat.includes('foot')) {
      relevantBrands = BRAND_SUGGESTIONS.Shoes;
    } else if (lowerCat.includes('kitchen') || lowerCat.includes('dine')) {
      relevantBrands = BRAND_SUGGESTIONS.Kitchen;
    } else if (lowerCat.includes('decor') || lowerCat.includes('furnit')) {
      relevantBrands = BRAND_SUGGESTIONS.Furniture;
    } else if (lowerCat.includes('grocery') || lowerCat.includes('food')) {
      relevantBrands = BRAND_SUGGESTIONS.Grocery;
    } else if (lowerCat.includes('beauty') || lowerCat.includes('cosmetic')) {
      relevantBrands = BRAND_SUGGESTIONS.Beauty;
    } else {
      relevantBrands = BRAND_SUGGESTIONS.General;
    }

    const q = brandQuery.toLowerCase();
    return relevantBrands.filter(b => b.toLowerCase().includes(q));
  }, [brandQuery, category]);

  // Duplicate Check
  const isDuplicateListing = useMemo(() => {
    if (!name.trim() || !brand.trim() || products.length === 0) return false;
    const match = products.find(p => 
      (p.id || p._id) !== resubmitProductId &&
      p.name.trim().toLowerCase() === name.trim().toLowerCase() &&
      p.brand.trim().toLowerCase() === brand.trim().toLowerCase()
    );
    return !!match;
  }, [name, brand, products, resubmitProductId]);

  // Handle Multi Image File Selection & quality check
  const processFiles = (files) => {
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        
        // Quality check (Simulate image dimensions reading)
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
    const files = Array.from(e.target.files);
    processFiles(files);
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

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    // Auto populate default specs structure for this category
    const cat = newCat.toLowerCase();
    if (cat.includes('electronics') || cat.includes('tech')) {
      setDynamicAttributes({
        ram: '8GB', storage: '256GB', processor: 'Octa-Core 2.4GHz', displaySize: '6.1 inches',
        refreshRate: '120Hz', battery: '5000mAh', camera: '50MP + 12MP', frontCamera: '12MP',
        simType: 'Dual SIM', support5g: 'Yes', os: 'Android 14', color: 'Titanium Black'
      });
    } else if (cat.includes('apparel') || cat.includes('fashion') || cat.includes('clothing')) {
      setDynamicAttributes({
        gender: 'Unisex', material: '100% Breathable Cotton', fabric: 'Jersey Knit',
        size: 'M', color: 'Classic Black', pattern: 'Solid', sleeveType: 'Short Sleeve',
        neckType: 'Crew Neck', fit: 'Regular Fit', occasion: 'Casual Wear', washCare: 'Machine wash cold'
      });
    } else if (cat.includes('shoe') || cat.includes('footwear')) {
      setDynamicAttributes({
        gender: 'Men', shoeSize: 'UK 9', material: 'Vegan Suede Leather', soleMaterial: 'EVA Rubber',
        closure: 'Lace-Up', heelHeight: 'Flat', color: 'Grey Mesh', occasion: 'Active Sports'
      });
    } else if (cat.includes('furniture') || cat.includes('home') || cat.includes('lifestyle')) {
      setDynamicAttributes({
        material: 'Premium Solid Teakwood', dimensions: '120cm x 60cm x 75cm', weightCapacity: '150 kg',
        finish: 'Walnut Stain Matte', assemblyRequired: 'No', roomType: 'Living / Study Room', color: 'Brown Natural'
      });
    } else if (cat.includes('grocery') || cat.includes('food')) {
      setDynamicAttributes({
        weight: '500g', expiryDate: '2026-12-31', shelfLife: '12 Months',
        ingredients: 'Organic Wheat Flour, Water, Yeast, Salt', vegetarian: 'Vegetarian',
        organic: 'Yes', storageInstructions: 'Keep in dry airtight container'
      });
    } else {
      setDynamicAttributes({});
    }
  };

  // AI assistant generation template
  const handleAIGenerate = () => {
    if (!name.trim()) {
      setFormError('Please enter a product title first to generate assets.');
      return;
    }
    
    setAiGenerating(true);
    setAiStep('Analyzing product details...');
    
    setTimeout(() => {
      setAiStep('Synthesizing professional descriptions...');
      setTimeout(() => {
        setAiStep('Calibrating category specifications...');
        setTimeout(() => {
          // Generate AI outputs based on Category & Title
          const cat = category.toLowerCase();
          let descText = '';
          let bulletArr = [];
          let specsObj = {};
          let metaKeywordsStr = '';
          
          if (cat.includes('electric') || cat.includes('tech')) {
            descText = `Experience next-level capability with the ${brand || 'Emahu'} ${name}. Specially calibrated for heavy multitasking and professional workflows, it guarantees lightning-fast execution and a high-fidelity display interface. Styled with modern elegance, this product features a resilient composite casing, standard ports, and eco-certified energy efficiency, redefining standard consumer value.`;
            bulletArr = [
              '🚀 Calibrated multi-core architecture for intense computing routines.',
              '🖥️ Immersive display array featuring high peak luminance and adaptive colors.',
              '🔋 Large battery cells engineered with safe lithium polymer standards.',
              '🛡️ Seamless vendor warranty with full repair coverage.'
            ];
            specsObj = {
              ram: '16GB LPDDR5',
              storage: '512GB NVMe SSD',
              processor: 'Intel Core i7-1365U',
              displaySize: '15.6 inches Ultra HD',
              refreshRate: '144Hz IPS',
              battery: '6800mAh Fast Charging',
              camera: 'Webcam 1080p Privacy',
              frontCamera: 'N/A',
              simType: 'N/A',
              support5g: 'No',
              os: 'Windows 11 Pro',
              color: 'Space Grey Metallic'
            };
            metaKeywordsStr = `${name}, ${brand || 'Emahu'}, high performance tech, premium gadgets, laptop, android`;
          } else if (cat.includes('apparel') || cat.includes('fashion') || cat.includes('clothing')) {
            descText = `Drape yourself in sophistication with this exquisite ${brand || 'Emahu'} ${name}. Tailored to perfection from selected natural textiles, it yields a feather-soft feel while maintaining heavy durability wash after wash. The layout is optimized to fit comfortably around joints, offering effortless stretch and an eye-catching drape appropriate for any occasion.`;
            bulletArr = [
              '👕 Premium organic cotton weave providing supreme airflow ventilation.',
              '✨ Reinforced twin-needle stitching prevents seam fraying over time.',
              '🎨 Certified organic pigment dye that resists bleaching and fading.',
              '🌱 Anti-shrinkage treated to keep shapes intact after tumble dryers.'
            ];
            specsObj = {
              gender: 'Unisex Fit',
              material: '80% Organic Cotton, 20% Recycled Polyester',
              fabric: 'Heavyweight Loopback Fleece',
              size: 'M / L / XL',
              color: 'Heather Grey',
              pattern: 'Solid Plain',
              sleeveType: 'Long Sleeve Ribbed',
              neckType: 'Crew Neckline',
              fit: 'Relaxed Athleisure',
              occasion: 'Casual Wear / Loungewear',
              washCare: 'Cold machine wash, tumble dry low'
            };
            metaKeywordsStr = `${name}, fashion wear, online apparel, designer ${brand || 'Emahu'}, casual clothing`;
          } else if (cat.includes('shoe') || cat.includes('footwear')) {
            descText = `Conquer miles comfortably with the athletic ${brand || 'Emahu'} ${name}. Outfitted with responsive foam cushioning and deep-grooved slip-resistant traction profiles, these shoes provide unmatched stability. The aerodynamic outer fabric allows ventilation, dry lock cooling, and a lightweight feeling for sports or running.`;
            bulletArr = [
              '👟 ReactFoam active cushion core cushions feet on high impact jumps.',
              '🚶 Deep tread rubber compound ensures excellent slip protection.',
              '💨 Double knit mesh layout keeps odors away through cooling airflow.',
              '🛡️ Reinforced heel cup lock prevents ankle twists during motion.'
            ];
            specsObj = {
              gender: 'Men\'s Athletics',
              shoeSize: 'UK 8, UK 9, UK 10',
              material: 'Breathable Polyester Mesh / Rubber Base',
              soleMaterial: 'EVA Foam Cushioning',
              closure: 'Locking Laces',
              heelHeight: '1.2 inches',
              color: 'Neon Cyan & Charcoal',
              occasion: 'Cross Training / Road Running'
            };
            metaKeywordsStr = `${name}, sports shoes, running trainers, buy footwear, ${brand || 'Emahu'}`;
          } else {
            descText = `Discover utility at its peak with the ${brand || 'Emahu'} ${name}. Built with heavy-duty craftsmanship, this item is designed to simplify your routines and deliver long-lasting durability. Every detail has been optimized for quality, making it a reliable addition to your lifestyle.`;
            bulletArr = [
              '💎 Heavy-grade composite design ensures robust lifecycle.',
              '📐 Ergonomic layout provides highly accessible handling.',
              '🌿 Hypoallergenic and chemical-safe construction parameters.',
              '📦 Full kit contents with setup guidelines included.'
            ];
            specsObj = {
              material: 'High-Impact Reinforced Composite',
              dimensions: 'Standard Size',
              weightCapacity: 'N/A',
              finish: 'Textured Slip-Proof Matte',
              assemblyRequired: 'No',
              roomType: 'General Use',
              color: 'Neutral Obsidian'
            };
            metaKeywordsStr = `${name}, ${brand || 'Emahu'}, official listing, home catalog`;
          }

          setDescription(descText);
          setBulletFeatures(bulletArr);
          setDynamicAttributes(specsObj);
          setSeoTitle(`${brand || 'Buy'} ${name} Online | Emahu Mall`);
          setMetaDescription(`Get the premium ${name} by ${brand || 'Emahu'}. Highly reviewed, authentic quality, and rapid merchant delivery options. Shop now.`);
          setMetaKeywords(metaKeywordsStr);
          setAltText(`Official photo display of ${brand || 'Emahu'} ${name}`);
          setHighlights(`Premium listing from ${brand || 'authorized seller'} featuring advanced specifications.`);

          setAiStep('');
          setAiGenerating(false);
        }, 800);
      }, 700);
    }, 600);
  };

  // Variant generator builder
  const handleVariantToggle = (type) => {
    setVariantTypes(prev => {
      const next = { ...prev, [type]: !prev[type] };
      generateVariantsList(next);
      return next;
    });
  };

  const handleVariantOptionInputChange = (type, value) => {
    setVariantOptionsInput(prev => {
      const next = { ...prev, [type]: value };
      setTimeout(() => generateVariantsList(variantTypes, next), 0);
      return next;
    });
  };

  const generateVariantsList = (types, inputs = variantOptionsInput) => {
    const activeTypes = Object.keys(types).filter(k => types[k]);
    if (activeTypes.length === 0) {
      setVariantsList([]);
      return;
    }

    // Prepare arrays of choices
    const arrays = activeTypes.map(type => {
      const val = inputs[type] || '';
      return val.split(',').map(s => s.trim()).filter(Boolean);
    });

    // Compute Cartesian product
    const cartesian = (a, b) => a.reduce((r, v) => r.concat(b.map(w => [].concat(v, w))), []);
    let combinations = arrays[0] ? arrays[0].map(x => [x]) : [];
    for (let i = 1; i < arrays.length; i++) {
      combinations = cartesian(combinations, arrays[i]);
    }

    const newVariants = combinations.map((combo, idx) => {
      const nameSpec = combo.join(' / ');
      const skuSuffix = combo.map(c => c.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '')).join('-');
      return {
        id: `var-${idx}-${Date.now()}`,
        name: nameSpec,
        sku: sku ? `${sku}-${skuSuffix}` : `EM-VAR-${skuSuffix}-${idx}`,
        price: price ? parseFloat(price) : 999,
        stock: stock ? parseInt(stock) : 10,
        image: images[0]?.url || '📦'
      };
    });

    setVariantsList(newVariants);
  };

  const handleUpdateVariantField = (idx, field, val) => {
    setVariantsList(prev => prev.map((v, i) => {
      if (i === idx) {
        return {
          ...v,
          [field]: field === 'price' || field === 'stock' ? (parseFloat(val) || 0) : val
        };
      }
      return v;
    }));
  };

  // CSV parsing
  const handleBulkDrop = (e) => {
    e.preventDefault();
    setBulkIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      parseCSV(file);
    }
  };

  const handleBulkFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      parseCSV(file);
    }
  };

  const parseCSV = (file) => {
    setBulkImportStatus('Reading file...');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length <= 1) {
          setBulkImportStatus('CSV is empty or missing headers');
          return;
        }

        // Detect headers
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ''));
        const parsedItems = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          const item = {};
          
          headers.forEach((header, index) => {
            item[header] = cols[index] || '';
          });

          // Core mapping
          parsedItems.push({
            name: item.name || item.title || 'Bulk Product',
            brand: item.brand || 'Generic',
            category: item.category || 'General',
            price: item.price ? parseFloat(item.price) : 499,
            comparePrice: item.compareprice ? parseFloat(item.compareprice) : 999,
            stock: item.stock ? parseInt(item.stock) : 10,
            description: item.description || 'Imported listing.',
            image: item.image || item.imageurl || '📦'
          });
        }

        setBulkProducts(parsedItems);
        setBulkImportStatus(`Parsed ${parsedItems.length} products successfully.`);
      } catch (err) {
        setBulkImportStatus('Parsing error, ensure standard CSV layout');
      }
    };
    reader.readAsText(file);
  };

  const triggerBulkImport = async () => {
    if (bulkProducts.length === 0) return;
    setBulkImportStatus('Importing to database...');
    
    try {
      const token = localStorage.getItem('emahu_seller_token');
      let successCount = 0;

      for (const p of bulkProducts) {
        // Send requests sequentially
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(p)
        });
        const data = await res.json();
        if (data.success) {
          successCount++;
        }
      }

      setBulkImportStatus(`Imported ${successCount}/${bulkProducts.length} successfully!`);
      setTimeout(() => {
        setBulkProducts([]);
        setBulkMode(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);

    } catch (e) {
      setBulkImportStatus('Import failed due to server error');
    }
  };

  // Submit Handler
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (images.length === 0) {
      setFormError('Please add at least one product image in Step 5');
      setCurrentStep(5);
      return;
    }

    if (
      !name.trim() ||
      !brand.trim() ||
      !category.trim() ||
      !price ||
      !comparePrice ||
      !stock ||
      !description.trim()
    ) {
      setFormError('Missing required basic information fields.');
      return;
    }

    const priceNum = parseFloat(price);
    const comparePriceNum = parseFloat(comparePrice);
    const stockNum = parseInt(stock);

    if (comparePriceNum <= priceNum) {
      setFormError('Compare-at MRP price must be higher than selling price.');
      setCurrentStep(3);
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('emahu_seller_token');
      const url = resubmitProductId
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products/${resubmitProductId}/resubmit`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products`;
      const method = resubmitProductId ? 'PUT' : 'POST';

      const payload = {
        name: name.trim(),
        brand: brand.trim(),
        category,
        price: priceNum,
        comparePrice: comparePriceNum,
        stock: stockNum,
        description: description.trim(),
        image: images[0]?.url || '📦',
        images: images.map(img => img.url),
        
        // Extended attributes
        shortTitle: shortTitle.trim(),
        slug: slug.trim(),
        bulletFeatures: bulletFeatures.filter(Boolean),
        highlights: highlights.trim(),
        packageContents: packageContents.trim(),
        warrantyInfo: warrantyInfo.trim(),
        countryOfOrigin,
        manufacturer: manufacturer.trim(),
        modelNumber: modelNumber.trim(),
        sku: sku.trim(),
        barcode: barcode.trim(),
        tax: parseFloat(tax),
        hsnCode: hsnCode.trim(),
        moq: parseInt(moq) || 1,
        maxOrderQty: maxOrderQty ? parseInt(maxOrderQty) : undefined,
        stockStatus: stockNum === 0 ? (backorderAllowed ? 'backorder' : 'out-of-stock') : (stockNum <= parseInt(lowStockAlert) ? 'low-stock' : 'in-stock'),
        warehouse,
        lowStockAlert: parseInt(lowStockAlert) || 10,
        backorderAllowed,
        images360: images360.map(i => i.url),
        videoUrl: videoUrl.trim(),
        altText: altText.trim(),
        weight: weight ? parseFloat(weight) : undefined,
        length: length ? parseFloat(length) : undefined,
        width: width ? parseFloat(width) : undefined,
        height: height ? parseFloat(height) : undefined,
        shippingCharges: parseFloat(shippingCharges) || 0,
        freeShipping,
        deliveryTime,
        dynamicAttributes,
        seoTitle: seoTitle.trim(),
        metaDescription: metaDescription.trim(),
        metaKeywords: metaKeywords.split(',').map(s => s.trim()).filter(Boolean),
        canonicalUrl: canonicalUrl.trim(),
        variants: enableVariants ? variantsList : []
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        setFormError(data.error || 'Failed to submit product');
        return;
      }

      // Clear draft on successful listing
      localStorage.removeItem('emahu_product_wizard_draft');

      if (onSuccess) {
        onSuccess(data.product);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setFormError('Connection failed submitting product listing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dynamic-form-overlay">
      <div className="dynamic-form-card">
        
        {/* Card Header */}
        <div className="dynamic-form-header">
          <div>
            <h2>{resubmitProductId ? '🔧 Fix & Resubmit Listing Request' : '🧙‍♂️ Dynamic AI Product Listing Wizard'}</h2>
            <p>Upload merchant catalog items to Emahu corridor with SEO auditing & AI descriptions</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {lastSaved && (
              <span style={{ fontSize: '0.72rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
                💾 Draft Saved at {lastSaved}
              </span>
            )}
            <button 
              className="toggle-preview-mode" 
              onClick={() => setBulkMode(!bulkMode)}
              style={{ border: '1px solid #f59e0b', color: '#f59e0b', background: 'none' }}
            >
              {bulkMode ? '📝 Standard Form' : '📊 Bulk CSV Upload'}
            </button>
            <button className="close-btn" onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Draft Restore Notification Banner */}
        {restoreDraftBanner && (
          <div style={{ background: '#f59e0b', color: '#0f172a', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>📝 We found an unsaved listing draft in your local storage. Would you like to restore it?</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleRestoreDraft} style={{ border: 'none', background: '#0f172a', color: '#fff', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Restore Draft</button>
              <button onClick={handleDiscardDraft} style={{ border: '1px solid #0f172a', background: 'none', color: '#0f172a', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Discard</button>
            </div>
          </div>
        )}

        {formError && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px 24px', fontSize: '0.82rem', fontWeight: 700, borderBottom: '1px solid rgba(239, 68, 68, 0.15)' }}>
            ⚠️ {formError}
          </div>
        )}

        {bulkMode ? (
          /* ================= BULK CSV IMPORT PANEL ================= */
          <div style={{ padding: '32px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="bulk-upload-container">
              <h3 className="form-section-title">📊 Bulk Spreadsheet Products Import</h3>
              <div 
                className="csv-drop-area"
                onDragOver={(e) => { e.preventDefault(); setBulkIsDragging(true); }}
                onDragLeave={() => setBulkIsDragging(false)}
                onDrop={handleBulkDrop}
                style={{ borderColor: bulkIsDragging ? '#f59e0b' : 'rgba(255, 255, 255, 0.15)' }}
              >
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleBulkFileSelect} 
                  style={{ display: 'none' }} 
                  id="csv-file-picker" 
                />
                <label htmlFor="csv-file-picker" style={{ cursor: 'pointer' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📁</div>
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                    Drag & Drop your product catalog CSV sheet here
                  </p>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                    or click to search local folders
                  </p>
                </label>
              </div>

              {bulkImportStatus && (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '10px 16px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 'bold' }}>
                  ℹ️ {bulkImportStatus}
                </div>
              )}

              {bulkProducts.length > 0 && (
                <div>
                  <h4 style={{ color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '8px' }}>Sheet Records Preview ({bulkProducts.length} rows):</h4>
                  <div style={{ overflowX: 'auto', maxHeight: '200px', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px' }}>
                    <table className="bulk-preview-table">
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th>Brand</th>
                          <th>Category</th>
                          <th>Price (₹)</th>
                          <th>MRP (₹)</th>
                          <th>Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkProducts.slice(0, 10).map((p, idx) => (
                          <tr key={idx}>
                            <td>{p.name}</td>
                            <td>{p.brand}</td>
                            <td>{p.category}</td>
                            <td>₹{p.price}</td>
                            <td>₹{p.comparePrice}</td>
                            <td>{p.stock} units</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button 
                    onClick={triggerBulkImport}
                    className="footer-btn submit"
                    style={{ marginTop: '16px', display: 'block', width: '220px' }}
                  >
                    🚀 Import Catalog Items
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ================= STANDARD MULTISTEP WIZARD FORM ================= */
          <>
            {/* Steps Stepper Tracker */}
            <div className="stepper-container">
              {[
                { s: 1, label: 'Category & Brand' },
                { s: 2, label: 'Basic Info' },
                { s: 3, label: 'Pricing & Shipping' },
                { s: 4, label: 'Inventory & Variants' },
                { s: 5, label: 'Media Uploads' },
                { s: 6, label: 'Specs & SEO' },
                { s: 7, label: 'Submit Status' }
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
              
              {/* LEFT Workspace fields */}
              <div className="form-fields-column">
                
                {/* STEP 1: CATEGORY & BRAND */}
                {currentStep === 1 && (
                  <>
                    <h3 className="form-section-title">📂 Category & brand parameters</h3>
                    
                    <div className="form-group">
                      <label className="form-label">Search & Select Category *</label>
                      <CategorySelector 
                        value={category} 
                        onChange={handleCategoryChange} 
                      />
                    </div>

                    <div className="form-group" style={{ position: 'relative' }}>
                      <label className="form-label">Brand Name *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Type or select brand (e.g. Apple, Nike, Prestige)"
                        value={brand}
                        onChange={(e) => {
                          setBrand(e.target.value);
                          setBrandQuery(e.target.value);
                          setShowBrandSuggestions(true);
                        }}
                        onBlur={() => setTimeout(() => setShowBrandSuggestions(false), 200)}
                        required
                      />
                      {showBrandSuggestions && matchingBrands.length > 0 && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, width: '100%',
                          maxHeight: '150px', overflowY: 'auto', background: '#1e293b',
                          border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', zIndex: 999
                        }}>
                          {matchingBrands.map(b => (
                            <div 
                              key={b} 
                              onClick={() => { setBrand(b); setShowBrandSuggestions(false); }}
                              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                              onMouseEnter={(e) => e.target.style.background = '#06b6d4'}
                              onMouseLeave={(e) => e.target.style.background = 'none'}
                            >
                              {b}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Product Type / Sub-Class</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Smartphones, Polo Shirt, Office Chairs"
                        value={productType}
                        onChange={(e) => setProductType(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* STEP 2: BASIC PRODUCT INFORMATION */}
                {currentStep === 2 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 className="form-section-title">📝 Basic product details</h3>
                      <button 
                        type="button" 
                        className="ai-trigger-btn" 
                        onClick={handleAIGenerate}
                        disabled={aiGenerating}
                      >
                        {aiGenerating ? (
                          <span className="loading-dots">🧙‍♂️ AI is generating<span>.</span><span>.</span><span>.</span></span>
                        ) : '🧙‍♂️ Generate Listing with AI'}
                      </button>
                    </div>

                    {aiStep && (
                      <div style={{ background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.25)', color: '#d8b4fe', padding: '10px 14px', borderRadius: '8px', fontSize: '0.78rem' }}>
                        🔮 <strong>AI Status:</strong> {aiStep}
                      </div>
                    )}

                    {isDuplicateListing && (
                      <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '10px 14px', borderRadius: '8px', fontSize: '0.78rem', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 600 }}>
                        ⚠️ Potential Duplicate Listing Detected: A product with title &quot;{name}&quot; and brand &quot;{brand}&quot; already exists in your catalog.
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Product Name *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Emahu Bluetooth 5.3 Waterproof Earbuds"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Short Title / Subtitle</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="e.g. Ergonomic design with 40H battery"
                          value={shortTitle}
                          onChange={(e) => setShortTitle(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">SEO URL Slug</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="auto-generated-slug"
                          value={slug}
                          onChange={(e) => setSlug(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Product Description (HTML Rich Text representation) *</label>
                      <div className="rich-text-editor-stub">
                        <div className="editor-toolbar">
                          <button type="button" className="toolbar-btn" onClick={() => setDescription(prev => prev + '<strong></strong>')}>B</button>
                          <button type="button" className="toolbar-btn" onClick={() => setDescription(prev => prev + '<em></em>')}>I</button>
                          <button type="button" className="toolbar-btn" onClick={() => setDescription(prev => prev + '<h3></h3>')}>H3</button>
                          <button type="button" className="toolbar-btn" onClick={() => setDescription(prev => prev + '<ul><li>Item</li></ul>')}>List</button>
                        </div>
                        <textarea 
                          className="form-textarea" 
                          rows={6}
                          placeholder="Provide a detailed sales copy with bullet lists, styling etc."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Key Bullet Features</label>
                      <div className="bullet-list-container">
                        {bulletFeatures.map((b, idx) => (
                          <div key={idx} className="bullet-item">
                            <input 
                              type="text" 
                              className="form-input" 
                              style={{ flex: 1 }}
                              placeholder={`Feature #${idx + 1}`}
                              value={b}
                              onChange={(e) => {
                                const next = [...bulletFeatures];
                                next[idx] = e.target.value;
                                setBulletFeatures(next);
                              }}
                            />
                            <button 
                              type="button" 
                              className="remove-btn" 
                              onClick={() => setBulletFeatures(bulletFeatures.filter((_, i) => i !== idx))}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button 
                          type="button" 
                          onClick={() => setBulletFeatures([...bulletFeatures, ''])}
                          style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#06b6d4', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                        >
                          + Add Feature Bullet
                        </button>
                      </div>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Manufacturer</label>
                        <input type="text" className="form-input" value={manufacturer} onChange={e => setManufacturer(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Model Number</label>
                        <input type="text" className="form-input" value={modelNumber} onChange={e => setModelNumber(e.target.value)} />
                      </div>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Warranty / Service Information</label>
                        <input type="text" className="form-input" value={warrantyInfo} placeholder="e.g. 1 Year Brand Warranty" onChange={e => setWarrantyInfo(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Country of Origin</label>
                        <select className="form-select" value={countryOfOrigin} onChange={e => setCountryOfOrigin(e.target.value)}>
                          <option value="India">India</option>
                          <option value="United States">United States</option>
                          <option value="China">China</option>
                          <option value="Germany">Germany</option>
                          <option value="Japan">Japan</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* STEP 3: PRICING & SHIPPING */}
                {currentStep === 3 && (
                  <>
                    <h3 className="form-section-title">💰 Pricing, Tax charges & HSN</h3>
                    
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">MRP (Compare-at price) *</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          placeholder="₹12,499"
                          value={comparePrice}
                          onChange={(e) => setComparePrice(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Selling Price *</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          placeholder="₹9,999"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {discountPercent > 0 && (
                      <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold' }}>
                        🏷️ Discount applied: {discountPercent}% off MRP
                      </span>
                    )}

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">GST Tax Slab (%)</label>
                        <select className="form-select" value={tax} onChange={e => setTax(e.target.value)}>
                          <option value="0">0% (Nil Rated)</option>
                          <option value="5">5% GST</option>
                          <option value="12">12% GST</option>
                          <option value="18">18% GST (Standard)</option>
                          <option value="28">28% GST</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">HSN Code</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="e.g. 85183000"
                          value={hsnCode}
                          onChange={(e) => setHsnCode(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">MOQ (Min Order Qty)</label>
                        <input type="number" className="form-input" value={moq} onChange={e => setMoq(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Max Limit Order Qty</label>
                        <input type="number" className="form-input" value={maxOrderQty} placeholder="Unlimited" onChange={e => setMaxOrderQty(e.target.value)} />
                      </div>
                    </div>

                    <h3 className="form-section-title" style={{ marginTop: '20px' }}>📦 Shipping weight & dimensions</h3>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Package Weight (kg)</label>
                        <input type="number" step="0.01" className="form-input" placeholder="e.g. 0.8" value={weight} onChange={e => setWeight(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Delivery Timeline</label>
                        <select className="form-select" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)}>
                          <option value="Same Day">Same Day Delivery</option>
                          <option value="1-2 Days">Express (1-2 Days)</option>
                          <option value="3-5 Days">Standard (3-5 Days)</option>
                          <option value="5-7 Days">Economy (5-7 Days)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">Length (cm)</label>
                        <input type="number" className="form-input" value={length} onChange={e => setLength(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Width (cm)</label>
                        <input type="number" className="form-input" value={width} onChange={e => setWidth(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Height (cm)</label>
                        <input type="number" className="form-input" value={height} onChange={e => setHeight(e.target.value)} />
                      </div>
                    </div>

                    <div className="form-grid-2" style={{ marginTop: '8px' }}>
                      <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" checked={freeShipping} onChange={e => { setFreeShipping(e.target.checked); if (e.target.checked) setShippingCharges('0'); }} style={{ width: '16px', height: '16px', accentColor: '#06b6d4' }} />
                        <label className="form-label">Offer Free Shipping</label>
                      </div>
                      {!freeShipping && (
                        <div className="form-group">
                          <label className="form-label">Flat Shipping Charges (₹)</label>
                          <input type="number" className="form-input" value={shippingCharges} onChange={e => setShippingCharges(e.target.value)} />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* STEP 4: INVENTORY & VARIANTS */}
                {currentStep === 4 && (
                  <>
                    <h3 className="form-section-title">📊 Inventory & warehouse</h3>
                    
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Stock Quantity *</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          placeholder="e.g. 50"
                          value={stock}
                          onChange={(e) => setStock(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Low Stock Alert Limit</label>
                        <input type="number" className="form-input" value={lowStockAlert} onChange={e => setLowStockAlert(e.target.value)} />
                      </div>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Warehouse Dispatch Hub</label>
                        <select className="form-select" value={warehouse} onChange={e => setWarehouse(e.target.value)}>
                          <option value="Main Hub - Delhi">Main Hub - Delhi</option>
                          <option value="South Hub - Bangalore">South Hub - Bangalore</option>
                          <option value="West Hub - Mumbai">West Hub - Mumbai</option>
                          <option value="East Hub - Kolkata">East Hub - Kolkata</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', paddingTop: '28px' }}>
                        <input type="checkbox" checked={backorderAllowed} onChange={e => setBackorderAllowed(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#06b6d4' }} />
                        <label className="form-label">Allow Backorders (Pre-booking)</label>
                      </div>
                    </div>

                    <h3 className="form-section-title" style={{ marginTop: '20px' }}>🎨 Multi-option product variants</h3>

                    <div style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', display: 'flex', marginBottom: '14px' }}>
                      <input type="checkbox" checked={enableVariants} onChange={e => { setEnableVariants(e.target.checked); if (e.target.checked) generateVariantsList(variantTypes); }} style={{ width: '16px', height: '16px', accentColor: '#06b6d4' }} />
                      <label className="form-label" style={{ fontSize: '0.9rem', color: '#f8fafc' }}>Enable Variants (Colors, Sizes, RAM, etc.)</label>
                    </div>

                    {enableVariants && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: 0 }}>Select variants options to configure combinations:</p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          {Object.keys(variantTypes).map(type => (
                            <div key={type} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.78rem', color: '#cbd5e1', cursor: 'pointer' }}>
                                <input type="checkbox" checked={variantTypes[type]} onChange={() => handleVariantToggle(type)} style={{ accentColor: '#06b6d4' }} />
                                <span>Config {type.toUpperCase()}</span>
                              </label>
                              {variantTypes[type] && (
                                <input 
                                  type="text" 
                                  className="form-input" 
                                  style={{ height: '30px', fontSize: '0.78rem', padding: '4px 8px' }}
                                  value={variantOptionsInput[type]}
                                  onChange={(e) => handleVariantOptionInputChange(type, e.target.value)}
                                  placeholder="Comma separated options"
                                />
                              )}
                            </div>
                          ))}
                        </div>

                        {variantsList.length > 0 && (
                          <div style={{ marginTop: '14px' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#06b6d4' }}>Combinations Matrix:</span>
                            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', marginTop: '6px' }}>
                              <table className="bulk-preview-table" style={{ fontSize: '0.75rem' }}>
                                <thead>
                                  <tr>
                                    <th>Option</th>
                                    <th>Variant SKU</th>
                                    <th>Price (₹)</th>
                                    <th>Stock</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {variantsList.map((v, idx) => (
                                    <tr key={v.id}>
                                      <td style={{ fontWeight: '600' }}>{v.name}</td>
                                      <td>
                                        <input 
                                          type="text" 
                                          value={v.sku} 
                                          className="form-input" 
                                          style={{ height: '26px', fontSize: '0.72rem', padding: '2px 6px', margin: 0 }}
                                          onChange={e => handleUpdateVariantField(idx, 'sku', e.target.value)}
                                        />
                                      </td>
                                      <td>
                                        <input 
                                          type="number" 
                                          value={v.price} 
                                          className="form-input" 
                                          style={{ height: '26px', fontSize: '0.72rem', padding: '2px 6px', margin: 0, width: '80px' }}
                                          onChange={e => handleUpdateVariantField(idx, 'price', e.target.value)}
                                        />
                                      </td>
                                      <td>
                                        <input 
                                          type="number" 
                                          value={v.stock} 
                                          className="form-input" 
                                          style={{ height: '26px', fontSize: '0.72rem', padding: '2px 6px', margin: 0, width: '60px' }}
                                          onChange={e => handleUpdateVariantField(idx, 'stock', e.target.value)}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* STEP 5: MEDIA UPLOADS */}
                {currentStep === 5 && (
                  <>
                    <h3 className="form-section-title">🖼️ Product images & video assets</h3>

                    <label className="form-label">Drag/Drop Product Images * (Resolution check active)</label>
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
                        id="image-file-picker" 
                      />
                      <label htmlFor="image-file-picker" style={{ cursor: 'pointer' }}>
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
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>Uploaded Gallery:</span>
                        <div className="gallery-grid">
                          {images.map((img, idx) => (
                            <div key={idx} className="gallery-thumb-container">
                              <img src={img.url} alt="product" className="gallery-thumb" />
                              <button 
                                type="button" 
                                className="remove-thumb-btn" 
                                onClick={() => setImages(images.filter((_, i) => i !== idx))}
                              >
                                ×
                              </button>
                              <span className={`quality-badge ${img.isWarning ? 'warning' : ''}`}>
                                {img.quality}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="form-group" style={{ marginTop: '12px' }}>
                      <label className="form-label">Product Video URL (YouTube, Vimeo, MP4 link)</label>
                      <input 
                        type="url" 
                        className="form-input" 
                        placeholder="e.g. https://youtube.com/watch?v=..."
                        value={videoUrl}
                        onChange={e => setVideoUrl(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* STEP 6: DYNAMIC CATEGORY ATTRIBUTES & SEO */}
                {currentStep === 6 && (
                  <>
                    <h3 className="form-section-title">🧬 Dynamic Category Specifications ({category})</h3>
                    
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px' }}>
                      {Object.keys(dynamicAttributes).length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>Choose a categories node in Step 1 to load specific attribute forms.</p>
                      ) : (
                        <div className="form-grid-2">
                          {Object.keys(dynamicAttributes).map(attr => (
                            <div key={attr} className="form-group">
                              <label className="form-label" style={{ textTransform: 'capitalize' }}>
                                {attr.replace(/([A-Z])/g, ' $1')}
                              </label>
                              <input 
                                type="text" 
                                className="form-input" 
                                value={dynamicAttributes[attr]}
                                onChange={(e) => {
                                  setDynamicAttributes({
                                    ...dynamicAttributes,
                                    [attr]: e.target.value
                                  });
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <h3 className="form-section-title" style={{ marginTop: '20px' }}>🔍 SEO Meta Fields & Keywords</h3>

                    <div className="form-group">
                      <label className="form-label">SEO Meta Title (Ideal: 40-70 characters)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={seoTitle} 
                        onChange={e => setSeoTitle(e.target.value)} 
                        maxLength={80}
                      />
                      <span style={{ fontSize: '0.68rem', color: seoTitle.length >= 40 && seoTitle.length <= 70 ? '#10b981' : '#f59e0b', alignSelf: 'flex-end' }}>
                        Length: {seoTitle.length} / 70 characters
                      </span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Meta Description (Ideal: 120-160 characters)</label>
                      <textarea 
                        className="form-textarea" 
                        rows={3} 
                        value={metaDescription} 
                        onChange={e => setMetaDescription(e.target.value)}
                        maxLength={200}
                      />
                      <span style={{ fontSize: '0.68rem', color: metaDescription.length >= 120 && metaDescription.length <= 160 ? '#10b981' : '#f59e0b', alignSelf: 'flex-end' }}>
                        Length: {metaDescription.length} / 160 characters
                      </span>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Meta Keywords (Comma separated)</label>
                        <input type="text" className="form-input" value={metaKeywords} onChange={e => setMetaKeywords(e.target.value)} placeholder="tech, phone, s24" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Image Alt Text (Alt attributes)</label>
                        <input type="text" className="form-input" value={altText} onChange={e => setAltText(e.target.value)} placeholder="e.g. Side angle view of laptop" />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Canonical URL</label>
                      <input type="url" className="form-input" value={canonicalUrl} onChange={e => setCanonicalUrl(e.target.value)} />
                    </div>
                  </>
                )}

                {/* STEP 7: LISTING STATUS & SUBMIT */}
                {currentStep === 7 && (
                  <>
                    <h3 className="form-section-title">🚦 Launch status & publication</h3>
                    
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🚀</div>
                      <h4 style={{ color: '#f8fafc', fontSize: '1rem', fontWeight: 'bold', margin: '0 0 8px 0' }}>Almost Live!</h4>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 auto 20px auto', maxWidth: '400px', lineHeight: '1.4' }}>
                        Choose your initial product listing registration status. Approved products will be listed live on Emahu.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '320px', margin: '0 auto', textAlign: 'left' }}>
                        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ fontSize: '1.25rem' }}>⏳</span>
                          <div>
                            <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#f8fafc', display: 'block' }}>Pending review (Default)</span>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Sent to Emahu Admin Corridor for SKU Assignment</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

              </div>

              {/* RIGHT Workspace - LIVE PREVIEW & SEO */}
              <div className="preview-column">
                
                {/* Real-time Circular SEO Score */}
                <div className="seo-score-container">
                  <div className="seo-ring-outer">
                    <svg width="54" height="54" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="3.5"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke={seoAudit.score >= 80 ? '#10b981' : seoAudit.score >= 50 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="3.5"
                        strokeDasharray={`${seoAudit.score}, 100`}
                        style={{ transition: 'stroke-dasharray 0.3s ease' }}
                      />
                    </svg>
                    <span className="seo-score-num">{seoAudit.score}</span>
                  </div>
                  <div>
                    <span className="seo-score-label">Live SEO Score Audit</span>
                    <span className="seo-score-desc">Automatic evaluation based on metadata density.</span>
                  </div>
                </div>

                {/* Audit checklist */}
                <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>SEO CHECKLIST STATUS:</span>
                  {seoAudit.checks.map((chk, i) => (
                    <div key={i} style={{ fontSize: '0.68rem', color: '#cbd5e1', display: 'flex', gap: '4px', marginBottom: '3px' }}>
                      <span>•</span> <span>{chk}</span>
                    </div>
                  ))}
                </div>

                {/* Live storefront preview canvas */}
                <div>
                  <div className="preview-header-stub" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="form-label" style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>👁️ Real-time Storefront Preview</span>
                    <button 
                      type="button" 
                      className="toggle-preview-mode" 
                      onClick={() => setPreviewMode(previewMode === 'desktop' ? 'mobile' : 'desktop')}
                    >
                      Mode: {previewMode.toUpperCase()}
                    </button>
                  </div>

                  <div className={`preview-canvas ${previewMode === 'mobile' ? 'mobile' : ''}`}>
                    
                    {/* Visual Slider */}
                    <div className="preview-image-slider">
                      {images.length > 0 ? (
                        <img src={images[activePreviewImage]?.url || images[0]?.url} alt="preview" />
                      ) : (
                        <span>🖼️ Image</span>
                      )}
                      {discountPercent > 0 && (
                        <div className="preview-discount-badge">-{discountPercent}% OFF</div>
                      )}
                    </div>

                    {/* Thumbnails */}
                    {images.length > 1 && (
                      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
                        {images.map((img, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => setActivePreviewImage(idx)}
                            style={{ 
                              width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', 
                              border: activePreviewImage === idx ? '2px solid #06b6d4' : '1px solid rgba(255,255,255,0.1)',
                              cursor: 'pointer'
                            }}
                          >
                            <img src={img.url} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.65rem', color: '#06b6d4', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        {brand || 'Brand'} · {category}
                      </span>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
                        {name || 'Product Title / Name'}
                      </h4>
                      {shortTitle && (
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', lineBreak: 'anywhere' }}>
                          {shortTitle}
                        </span>
                      )}
                    </div>

                    {/* Pricing */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#10b981' }}>
                        ₹{price ? parseFloat(price).toLocaleString('en-IN') : '9,999'}
                      </span>
                      {comparePrice && (
                        <span style={{ fontSize: '0.78rem', color: '#ef4444', textDecoration: 'line-through' }}>
                          ₹{parseFloat(comparePrice).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    {/* Variants pills demo */}
                    {enableVariants && variantsList.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Available Variants:</span>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {variantsList.slice(0, 4).map(v => (
                            <span key={v.id} style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '4px', padding: '2px 6px', fontSize: '0.65rem', color: '#cbd5e1' }}>
                              {v.name}
                            </span>
                          ))}
                          {variantsList.length > 4 && <span style={{ fontSize: '0.65rem', color: '#06b6d4' }}>+{variantsList.length - 4} more</span>}
                        </div>
                      </div>
                    )}

                    {/* Dynamic Specs table */}
                    {Object.keys(dynamicAttributes).length > 0 && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                        <span style={{ fontSize: '0.68rem', color: '#cbd5e1', fontWeight: 'bold' }}>SPECIFICATIONS:</span>
                        <table style={{ width: '100%', fontSize: '0.62rem', borderCollapse: 'collapse', marginTop: '4px' }}>
                          <tbody>
                            {Object.keys(dynamicAttributes).slice(0, 4).map(attr => (
                              <tr key={attr} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <td style={{ color: '#94a3b8', padding: '2px 0', textTransform: 'capitalize' }}>{attr}:</td>
                                <td style={{ color: '#f8fafc', padding: '2px 0', textAlign: 'right' }}>{dynamicAttributes[attr]}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Trust badges */}
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.65rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '4px' }}>
                      <span>🚚 {freeShipping ? 'Free Shipping' : 'Fast Delivery'}</span>
                      <span>🛡️ {warrantyInfo || 'No warranty details'}</span>
                    </div>

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
                      if (currentStep === 1 && (!brand.trim() || !category.trim())) {
                        setFormError('Please select category and provide a brand name.');
                        return;
                      }
                      if (currentStep === 2 && (!name.trim() || !description.trim())) {
                        setFormError('Product Name and Description are required in Step 2.');
                        return;
                      }
                      if (currentStep === 3 && (!price || !comparePrice)) {
                        setFormError('Listing Price and MRP are required.');
                        return;
                      }
                      if (currentStep === 4 && !stock) {
                        setFormError('Stock Quantity is required.');
                        return;
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
                    {isSubmitting ? 'Submitting to Corridor...' : (resubmitProductId ? 'Resubmit Listing Request' : 'Publish Product Request')}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
