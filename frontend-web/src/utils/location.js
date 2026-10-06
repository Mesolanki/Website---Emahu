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

/**
 * Standard coordinates for Indian cities and regional commercial hubs
 */
export const KNOWN_CITY_COORDINATES = {
  // Ahmedabad & Neighborhoods
  'gota': { latitude: 23.0804, longitude: 72.5312, city: 'Ahmedabad', state: 'Gujarat' },
  'navrangpura': { latitude: 23.0365, longitude: 72.5611, city: 'Ahmedabad', state: 'Gujarat' },
  'vastrapur': { latitude: 23.0375, longitude: 72.5303, city: 'Ahmedabad', state: 'Gujarat' },
  'satellite': { latitude: 23.0298, longitude: 72.5273, city: 'Ahmedabad', state: 'Gujarat' },
  'prahlad nagar': { latitude: 23.0121, longitude: 72.5108, city: 'Ahmedabad', state: 'Gujarat' },
  'prahladnagar': { latitude: 23.0121, longitude: 72.5108, city: 'Ahmedabad', state: 'Gujarat' },
  'bopal': { latitude: 23.0335, longitude: 72.4632, city: 'Ahmedabad', state: 'Gujarat' },
  'south bopal': { latitude: 23.0202, longitude: 72.4601, city: 'Ahmedabad', state: 'Gujarat' },
  'maninagar': { latitude: 22.9968, longitude: 72.6010, city: 'Ahmedabad', state: 'Gujarat' },
  'chandkheda': { latitude: 23.1110, longitude: 72.5850, city: 'Ahmedabad', state: 'Gujarat' },
  'motera': { latitude: 23.0910, longitude: 72.5970, city: 'Ahmedabad', state: 'Gujarat' },
  'ghatlodiya': { latitude: 23.0620, longitude: 72.5380, city: 'Ahmedabad', state: 'Gujarat' },
  'thaltej': { latitude: 23.0520, longitude: 72.5110, city: 'Ahmedabad', state: 'Gujarat' },
  'nikol': { latitude: 23.0430, longitude: 72.6710, city: 'Ahmedabad', state: 'Gujarat' },
  'naroda': { latitude: 23.0720, longitude: 72.6580, city: 'Ahmedabad', state: 'Gujarat' },
  'ahmedabad': { latitude: 23.0225, longitude: 72.5714, city: 'Ahmedabad', state: 'Gujarat' },
  'amdavad': { latitude: 23.0225, longitude: 72.5714, city: 'Ahmedabad', state: 'Gujarat' },
  
  // Gujarat Cities
  'gandhinagar': { latitude: 23.2156, longitude: 72.6369, city: 'Gandhinagar', state: 'Gujarat' },
  'surat': { latitude: 21.1702, longitude: 72.8311, city: 'Surat', state: 'Gujarat' },
  'adajan': { latitude: 21.1959, longitude: 72.7933, city: 'Surat', state: 'Gujarat' },
  'vesu': { latitude: 21.1442, longitude: 72.7725, city: 'Surat', state: 'Gujarat' },
  'vadodara': { latitude: 22.3072, longitude: 73.1812, city: 'Vadodara', state: 'Gujarat' },
  'baroda': { latitude: 22.3072, longitude: 73.1812, city: 'Vadodara', state: 'Gujarat' },
  'rajkot': { latitude: 22.3039, longitude: 70.8022, city: 'Rajkot', state: 'Gujarat' },
  'bhavnagar': { latitude: 21.7645, longitude: 72.1519, city: 'Bhavnagar', state: 'Gujarat' },
  'jamnagar': { latitude: 22.4707, longitude: 70.0577, city: 'Jamnagar', state: 'Gujarat' },
  'junagadh': { latitude: 21.5222, longitude: 70.4579, city: 'Junagadh', state: 'Gujarat' },
  'anand': { latitude: 22.5645, longitude: 72.9289, city: 'Anand', state: 'Gujarat' },
  'nadiad': { latitude: 22.6916, longitude: 72.8634, city: 'Nadiad', state: 'Gujarat' },
  'bharuch': { latitude: 21.7051, longitude: 72.9959, city: 'Bharuch', state: 'Gujarat' },
  'vapi': { latitude: 20.3893, longitude: 72.9106, city: 'Vapi', state: 'Gujarat' },
  'mehsana': { latitude: 23.5880, longitude: 72.3693, city: 'Mehsana', state: 'Gujarat' },
  'bhuj': { latitude: 23.2420, longitude: 69.6669, city: 'Bhuj', state: 'Gujarat' },

  // Maharashtra
  'mumbai': { latitude: 19.0760, longitude: 72.8777, city: 'Mumbai', state: 'Maharashtra' },
  'bombay': { latitude: 19.0760, longitude: 72.8777, city: 'Mumbai', state: 'Maharashtra' },
  'andheri': { latitude: 19.1363, longitude: 72.8277, city: 'Mumbai', state: 'Maharashtra' },
  'bandra': { latitude: 19.0596, longitude: 72.8295, city: 'Mumbai', state: 'Maharashtra' },
  'dadar': { latitude: 19.0178, longitude: 72.8397, city: 'Mumbai', state: 'Maharashtra' },
  'thane': { latitude: 19.2183, longitude: 72.9781, city: 'Thane', state: 'Maharashtra' },
  'navi mumbai': { latitude: 19.0330, longitude: 73.0297, city: 'Navi Mumbai', state: 'Maharashtra' },
  'pune': { latitude: 18.5204, longitude: 73.8567, city: 'Pune', state: 'Maharashtra' },
  'nagpur': { latitude: 21.1458, longitude: 79.0882, city: 'Nagpur', state: 'Maharashtra' },
  'nashik': { latitude: 19.9975, longitude: 73.7898, city: 'Nashik', state: 'Maharashtra' },

  // Delhi NCR
  'delhi': { latitude: 28.6139, longitude: 77.2090, city: 'Delhi', state: 'Delhi' },
  'new delhi': { latitude: 28.6139, longitude: 77.2090, city: 'New Delhi', state: 'Delhi' },
  'noida': { latitude: 28.5355, longitude: 77.3910, city: 'Noida', state: 'Uttar Pradesh' },
  'gurugram': { latitude: 28.4595, longitude: 77.0266, city: 'Gurugram', state: 'Haryana' },
  'gurgaon': { latitude: 28.4595, longitude: 77.0266, city: 'Gurugram', state: 'Haryana' },
  'faridabad': { latitude: 28.4089, longitude: 77.3178, city: 'Faridabad', state: 'Haryana' },
  'ghaziabad': { latitude: 28.6692, longitude: 77.4538, city: 'Ghaziabad', state: 'Uttar Pradesh' },

  // Major Metro Hubs
  'bangalore': { latitude: 12.9716, longitude: 77.5946, city: 'Bangalore', state: 'Karnataka' },
  'bengaluru': { latitude: 12.9716, longitude: 77.5946, city: 'Bengaluru', state: 'Karnataka' },
  'hyderabad': { latitude: 17.3850, longitude: 78.4867, city: 'Hyderabad', state: 'Telangana' },
  'chennai': { latitude: 13.0827, longitude: 80.2707, city: 'Chennai', state: 'Tamil Nadu' },
  'kolkata': { latitude: 22.5726, longitude: 88.3639, city: 'Kolkata', state: 'West Bengal' },
  'jaipur': { latitude: 26.9124, longitude: 75.7873, city: 'Jaipur', state: 'Rajasthan' },
  'lucknow': { latitude: 26.8467, longitude: 80.9462, city: 'Lucknow', state: 'Uttar Pradesh' },
  'chandigarh': { latitude: 30.7333, longitude: 76.7794, city: 'Chandigarh', state: 'Punjab' },
  'indore': { latitude: 22.7196, longitude: 75.8577, city: 'Indore', state: 'Madhya Pradesh' },
  'bhopal': { latitude: 23.2599, longitude: 77.4126, city: 'Bhopal', state: 'Madhya Pradesh' }
};

/**
 * Resolve coordinates for a given city name, area, or address
 */
export const getCoordinatesForCity = (cityName) => {
  if (!cityName || typeof cityName !== 'string') return null;
  const clean = cityName.toLowerCase().trim();

  // 1. Direct match
  if (KNOWN_CITY_COORDINATES[clean]) {
    return KNOWN_CITY_COORDINATES[clean];
  }

  // 2. Partial match
  for (const [key, coords] of Object.entries(KNOWN_CITY_COORDINATES)) {
    if (clean.includes(key) || key.includes(clean)) {
      return coords;
    }
  }

  return null;
};

/**
 * Dynamically set buyer location by city name or address, updating coordinates and triggering reactive events
 */
export const setBuyerLocationByCity = (cityName) => {
  if (!cityName) return null;
  const found = getCoordinatesForCity(cityName);
  const cleanCity = cityName.trim();

  const coords = found
    ? { latitude: found.latitude, longitude: found.longitude }
    : { latitude: 23.0225, longitude: 72.5714 }; // Default to Ahmedabad if completely unknown

  const locObj = {
    address: `${cleanCity}, ${found?.state || 'Gujarat'}`,
    latitude: coords.latitude,
    longitude: coords.longitude,
    city: found?.city || cleanCity,
    state: found?.state || 'Gujarat'
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem('emahu_buyer_city', cleanCity);
    localStorage.setItem('emahu_buyer_coordinates', JSON.stringify(coords));
    localStorage.setItem('emahu_buyer_location', JSON.stringify(locObj));

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('emahu_location_changed', { detail: locObj }));
  }
  return locObj;
};

/**
 * Calculate road distance between coordinates with realistic urban detour factor
 */
export const calculateHaversineRoadDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = (Number(lat2) - Number(lat1)) * (Math.PI / 180);
  const dLon = (Number(lon2) - Number(lon1)) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(Number(lat1) * (Math.PI / 180)) *
    Math.cos(Number(lat2) * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const crowDistanceKm = R * c;

  const roadFactor = crowDistanceKm < 2 ? 1.35 : crowDistanceKm < 15 ? 1.28 : 1.2;
  const roadDistanceKm = Number((crowDistanceKm * roadFactor).toFixed(2));
  const distanceMeters = Math.round(roadDistanceKm * 1000);

  return {
    distanceMeters,
    distanceKm: roadDistanceKm
  };
};


