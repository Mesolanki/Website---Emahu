/**
 * Unified Geolocation & Reverse Geocoding Utility for Emahu Marketplace
 */

export const parseNominatimAddress = (data) => {
  if (!data) return { streetAddress: '', city: '', state: '', pincode: '', fullAddress: '' };

  const addr = data.address || {};

  // 1. Building / Premises / House / Flat details
  const building =
    addr.building ||
    addr.house_name ||
    addr.house_number ||
    addr.office ||
    addr.amenity ||
    addr.shop ||
    addr.complex ||
    addr.commercial ||
    addr.industrial ||
    '';

  // 2. Street / Road / Highway
  const road =
    addr.road ||
    addr.street ||
    addr.footway ||
    addr.pedestrian ||
    addr.residential ||
    addr.path ||
    '';

  // 3. Suburb / Area / Colony / Neighbourhood
  const suburb =
    addr.suburb ||
    addr.neighbourhood ||
    addr.quarter ||
    addr.city_district ||
    addr.subdivision ||
    addr.residential_area ||
    '';

  // 4. City / Town / Village / District
  let city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.county ||
    addr.state_district ||
    '';
  if (city) {
    city = city.replace(/District|Corporation|Taluka/gi, '').trim();
    city = city.charAt(0).toUpperCase() + city.slice(1);
  }

  // 5. State / Region
  const state = addr.state || '';

  // 6. Postcode / Pincode
  const pincode = addr.postcode || addr.postal || '';

  // Combine building, road, and suburb into Street Address
  const streetParts = [building, road, suburb].filter(Boolean);
  let streetAddress = Array.from(new Set(streetParts)).join(', ');

  // If streetAddress is too brief or empty, extract from display_name
  if (!streetAddress && data.display_name) {
    const displayParts = data.display_name.split(',').map((s) => s.trim());
    const filteredParts = displayParts.filter((part) => {
      const lower = part.toLowerCase();
      if (city && lower.includes(city.toLowerCase())) return false;
      if (state && lower.includes(state.toLowerCase())) return false;
      if (lower === 'india' || lower === pincode) return false;
      return true;
    });
    streetAddress = filteredParts.join(', ');
  }

  if (!streetAddress) {
    streetAddress = data.display_name || '';
  }

  const fullAddressParts = [streetAddress, city, state].filter(Boolean);
  let fullAddress = fullAddressParts.join(', ');
  if (pincode) fullAddress += ` - ${pincode}`;

  return {
    streetAddress,
    city,
    state,
    pincode,
    fullAddress,
    displayName: data.display_name || fullAddress,
  };
};

import API_BASE from './config';

export const detectLocationWithGPS = (options = {}) => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const coords = {
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lon.toFixed(6)),
        };

        let resolvedAddress = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        let resolvedArea = '';
        let resolvedCity = '';
        let resolvedState = 'Gujarat';
        let resolvedZip = '';

        try {
          // 1. Query backend reverse geocode (Google Maps / OSM)
          const res = await fetch(`${API_BASE}/api/location/reverse?lat=${lat}&lon=${lon}`);
          const data = await res.json();
          if (data.success && data.data) {
            resolvedAddress = data.data.address || resolvedAddress;
            resolvedArea = data.data.area || data.data.sublocality || '';
            resolvedCity = data.data.city || '';
            resolvedState = data.data.state || resolvedState;
            resolvedZip = data.data.zipCode || '';
          }
        } catch (backendErr) {
          console.warn('Backend reverse geocoding fallback:', backendErr);
          try {
            const osmRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
            );
            const osmData = await osmRes.json();
            const parsed = parseNominatimAddress(osmData);
            if (parsed.fullAddress) resolvedAddress = parsed.fullAddress;
            if (parsed.streetAddress) resolvedArea = parsed.streetAddress.split(',')[0].trim();
            if (parsed.city) resolvedCity = parsed.city;
            if (parsed.state) resolvedState = parsed.state;
            if (parsed.pincode) resolvedZip = parsed.pincode;
          } catch (_) {}
        }

        const displayArea = resolvedArea || (resolvedAddress ? resolvedAddress.split(',')[0].trim() : '') || resolvedCity || 'My Location';

        const fullLoc = {
          address: resolvedAddress,
          latitude: coords.latitude,
          longitude: coords.longitude,
          area: resolvedArea || displayArea,
          city: resolvedCity || 'Ahmedabad',
          displayArea,
          state: resolvedState,
          zipCode: resolvedZip
        };

        // Save to localStorage for application-wide persistence
        localStorage.setItem('emahu_buyer_location', JSON.stringify(fullLoc));
        localStorage.setItem('emahu_buyer_coordinates', JSON.stringify(coords));
        localStorage.setItem('emahu_buyer_city', displayArea);
        localStorage.setItem('emahu_buyer_address', resolvedAddress);


        // Dispatch global events for instant reactivity
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('emahu_location_changed', { detail: fullLoc }));

        resolve(fullLoc);
      },
      (error) => {
        reject(error);
      },
      {
        timeout: 15000,
        maximumAge: 0,
        enableHighAccuracy: true,
        ...options
      }
    );
  });
};

