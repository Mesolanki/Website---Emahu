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

export const detectLocationWithGPS = () => {
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
          latitude: lat.toFixed(6),
          longitude: lon.toFixed(6),
        };

        try {
          // Pass addressdetails=1 to Nominatim for full building/road breakdown
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
          );
          const data = await res.json();
          const parsed = parseNominatimAddress(data);

          // Save to localStorage for application-wide persistence
          localStorage.setItem('emahu_buyer_coordinates', JSON.stringify(coords));
          if (parsed.city) localStorage.setItem('emahu_buyer_city', parsed.city);
          if (parsed.fullAddress) localStorage.setItem('emahu_buyer_address', parsed.fullAddress);

          resolve({
            coords,
            ...parsed,
            raw: data,
          });
        } catch (err) {
          // If network fetch fails, still return coordinates
          localStorage.setItem('emahu_buyer_coordinates', JSON.stringify(coords));
          resolve({
            coords,
            streetAddress: '',
            city: '',
            state: '',
            pincode: '',
            fullAddress: '',
            raw: null,
          });
        }
      },
      (error) => {
        reject(error);
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
    );
  });
};
