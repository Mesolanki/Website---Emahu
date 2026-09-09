/**
 * Google Places Service (Places API - New + Multi-City High-Precision Intelligent Fallback)
 * Secure server-side wrapper for Google Places API (New) with instant offline locality coverage.
 * 
 * Endpoints:
 * - Autocomplete: https://places.googleapis.com/v1/places:autocomplete
 * - Place Details: https://places.googleapis.com/v1/places/{placeId}
 */

function getApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY || '';
}

/**
 * Autocomplete address/places search using Places API (New)
 * @param {string} query Search input from user (e.g. "Thaltej", "Satellite Ahmedabad", "380001", "Maninagar")
 * @param {string} sessionToken Optional session token for billing optimization
 * @returns {Promise<Array<{ placeId: string, address: string, mainText: string, secondaryText: string, latitude?: number, longitude?: number, city?: string, state?: string, zipCode?: string }>>}
 */
async function searchPlaces(query, sessionToken = '') {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return [];
  }

  const cleanQuery = query.trim();
  const apiKey = getApiKey();

  // If no Google Maps API Key is configured, provide fallback standard Indian cities suggestions
  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
    return getFallbackPlacesSuggestions(cleanQuery);
  }

  try {
    const url = 'https://places.googleapis.com/v1/places:autocomplete';
    const requestBody = {
      input: cleanQuery,
      includedRegionCodes: ['IN'], // prioritize India
      languageCode: 'en'
    };

    if (sessionToken) {
      requestBody.sessionToken = sessionToken;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      // Quietly route to smart fallback if API key is unbilled or restricted
      return getFallbackPlacesSuggestions(cleanQuery);
    }

    const data = await response.json();
    const suggestions = data.suggestions || [];

    if (suggestions.length === 0) {
      return getFallbackPlacesSuggestions(cleanQuery);
    }

    return suggestions
      .filter(item => item.placePrediction && item.placePrediction.placeId)
      .map(item => {
        const pred = item.placePrediction;
        const mainText = pred.structuredFormat?.mainText?.text || pred.text?.text || '';
        const secondaryText = pred.structuredFormat?.secondaryText?.text || '';
        const fullText = pred.text?.text || [mainText, secondaryText].filter(Boolean).join(', ');

        return {
          placeId: pred.placeId,
          address: fullText,
          mainText,
          secondaryText
        };
      });
  } catch (error) {
    return getFallbackPlacesSuggestions(cleanQuery);
  }
}

/**
 * Get exact coordinates and formatted address for a placeId using Places API (New)
 * @param {string} placeId Google Places ID or Fallback ID
 * @param {string} sessionToken Optional session token
 * @returns {Promise<{ placeId: string, address: string, latitude: number, longitude: number, city?: string, state?: string, zipCode?: string }>}
 */
async function getPlaceDetails(placeId, sessionToken = '') {
  if (!placeId || typeof placeId !== 'string') {
    throw new Error('Place ID is required');
  }

  // Handle fallback place IDs (when API key is missing or for demo locations)
  if (placeId.startsWith('fallback_') || placeId.startsWith('osm_') || placeId.startsWith('loc_')) {
    return getFallbackPlaceDetails(placeId);
  }

  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
    return getFallbackPlaceDetails(placeId);
  }

  try {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'id,formattedAddress,location,displayName,addressComponents'
    };

    if (sessionToken) {
      headers['X-Goog-Session-Token'] = sessionToken;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      return getFallbackPlaceDetails(placeId);
    }

    const data = await response.json();
    const lat = data.location?.latitude;
    const lng = data.location?.longitude;

    if (lat === undefined || lng === undefined) {
      return getFallbackPlaceDetails(placeId);
    }

    let city = '';
    let state = '';
    let zipCode = '';

    if (Array.isArray(data.addressComponents)) {
      for (const comp of data.addressComponents) {
        if (comp.types?.includes('locality') || comp.types?.includes('administrative_area_level_2')) {
          city = comp.longText || comp.shortText || '';
        }
        if (comp.types?.includes('administrative_area_level_1')) {
          state = comp.longText || comp.shortText || '';
        }
        if (comp.types?.includes('postal_code')) {
          zipCode = comp.longText || comp.shortText || '';
        }
      }
    }

    const formattedAddress = data.formattedAddress || data.displayName?.text || '';

    return {
      placeId: data.id || placeId,
      address: formattedAddress,
      latitude: Number(lat),
      longitude: Number(lng),
      city: city || 'Ahmedabad',
      state: state || 'Gujarat',
      zipCode: zipCode || '380001'
    };
  } catch (error) {
    return getFallbackPlaceDetails(placeId);
  }
}

/**
 * Curated high-precision locality database covering major Gujarat & Indian Metros
 */
const KNOWN_LOCATIONS = [
  // Ahmedabad - West & SG Highway
  { placeId: 'loc_thaltej', mainText: 'Thaltej', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Thaltej, Ahmedabad, Gujarat 380059, India', latitude: 23.0485, longitude: 72.5117, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380059' },
  { placeId: 'loc_sghighway', mainText: 'SG Highway (Sarkhej - Gandhinagar)', secondaryText: 'Ahmedabad, Gujarat, India', address: 'SG Highway, Ahmedabad, Gujarat 380054, India', latitude: 23.0478, longitude: 72.5086, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380054' },
  { placeId: 'loc_sbr', mainText: 'Sindhu Bhavan Road (SBR)', secondaryText: 'Bodakdev, Ahmedabad, Gujarat, India', address: 'Sindhu Bhavan Road, Bodakdev, Ahmedabad, Gujarat 380054, India', latitude: 23.0450, longitude: 72.5020, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380054' },
  { placeId: 'loc_bodakdev', mainText: 'Bodakdev', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Bodakdev, Ahmedabad, Gujarat 380054, India', latitude: 23.0425, longitude: 72.5115, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380054' },
  { placeId: 'loc_judges', mainText: 'Judges Bungalow Road', secondaryText: 'Bodakdev, Ahmedabad, Gujarat, India', address: 'Judges Bungalow Road, Bodakdev, Ahmedabad, Gujarat 380054, India', latitude: 23.0410, longitude: 72.5180, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380054' },
  { placeId: 'loc_vastrapur', mainText: 'Vastrapur', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Vastrapur, Ahmedabad, Gujarat 380015, India', latitude: 23.0375, longitude: 72.5303, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380015' },
  { placeId: 'loc_satellite', mainText: 'Satellite', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Satellite Road, Ahmedabad, Gujarat 380015, India', latitude: 23.0298, longitude: 72.5273, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380015' },
  { placeId: 'loc_prahladnagar', mainText: 'Prahlad Nagar', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Prahlad Nagar Garden Road, Ahmedabad, Gujarat 380015, India', latitude: 23.0121, longitude: 72.5108, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380015' },
  { placeId: 'loc_shyamal', mainText: 'Shyamal Cross Roads', secondaryText: 'Satellite, Ahmedabad, Gujarat, India', address: 'Shyamal Cross Roads, Satellite, Ahmedabad, Gujarat 380015, India', latitude: 23.0180, longitude: 72.5290, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380015' },
  { placeId: 'loc_iscon', mainText: 'Iscon Cross Roads', secondaryText: 'SG Highway, Ahmedabad, Gujarat, India', address: 'Iscon Cross Roads, SG Highway, Ahmedabad, Gujarat 380054, India', latitude: 23.0305, longitude: 72.5075, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380054' },
  { placeId: 'loc_bopal', mainText: 'Bopal', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Bopal, Ahmedabad, Gujarat 380058, India', latitude: 23.0335, longitude: 72.4632, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380058' },
  { placeId: 'loc_southbopal', mainText: 'South Bopal (SOBO)', secondaryText: 'Ahmedabad, Gujarat, India', address: 'South Bopal, Ahmedabad, Gujarat 380058, India', latitude: 23.0202, longitude: 72.4601, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380058' },
  { placeId: 'loc_shela', mainText: 'Shela', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Club O7 Road, Shela, Ahmedabad, Gujarat 380058, India', latitude: 23.0080, longitude: 72.4510, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380058' },
  { placeId: 'loc_shilaj', mainText: 'Shilaj', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Shilaj, Ahmedabad, Gujarat 380059, India', latitude: 23.0610, longitude: 72.4780, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380059' },
  { placeId: 'loc_sciencecity', mainText: 'Science City', secondaryText: 'Sola, Ahmedabad, Gujarat, India', address: 'Science City Road, Sola, Ahmedabad, Gujarat 380060, India', latitude: 23.0763, longitude: 72.5027, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380060' },
  { placeId: 'loc_sola', mainText: 'Sola', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Sola, Ahmedabad, Gujarat 380060, India', latitude: 23.0734, longitude: 72.5255, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380060' },
  { placeId: 'loc_gota', mainText: 'Gota', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Gota, SG Highway, Ahmedabad, Gujarat 382481, India', latitude: 23.0804, longitude: 72.5312, city: 'Ahmedabad', state: 'Gujarat', zipCode: '382481' },
  { placeId: 'loc_chandkheda', mainText: 'Chandkheda', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Chandkheda, Ahmedabad, Gujarat 382424, India', latitude: 23.1110, longitude: 72.5850, city: 'Ahmedabad', state: 'Gujarat', zipCode: '382424' },
  { placeId: 'loc_motera', mainText: 'Motera (Narendra Modi Stadium)', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Motera, Ahmedabad, Gujarat 380005, India', latitude: 23.0910, longitude: 72.5970, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380005' },
  { placeId: 'loc_ghatlodiya', mainText: 'Ghatlodiya', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Ghatlodiya, Ahmedabad, Gujarat 380061, India', latitude: 23.0620, longitude: 72.5380, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380061' },
  { placeId: 'loc_memnagar', mainText: 'Memnagar', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Memnagar, Ahmedabad, Gujarat 380052, India', latitude: 23.0510, longitude: 72.5390, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380052' },
  { placeId: 'loc_gurukul', mainText: 'Gurukul Road', secondaryText: 'Memnagar, Ahmedabad, Gujarat, India', address: 'Gurukul Road, Memnagar, Ahmedabad, Gujarat 380052, India', latitude: 23.0490, longitude: 72.5320, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380052' },
  { placeId: 'loc_navrangpura', mainText: 'Navrangpura', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Navrangpura, Ahmedabad, Gujarat 380009, India', latitude: 23.0365, longitude: 72.5611, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380009' },
  { placeId: 'loc_cgrodes', mainText: 'CG Road', secondaryText: 'Navrangpura, Ahmedabad, Gujarat, India', address: 'CG Road, Navrangpura, Ahmedabad, Gujarat 380009, India', latitude: 23.0310, longitude: 72.5580, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380009' },
  { placeId: 'loc_naranpura', mainText: 'Naranpura', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Naranpura, Ahmedabad, Gujarat 380013, India', latitude: 23.0550, longitude: 72.5530, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380013' },
  { placeId: 'loc_ambawadi', mainText: 'Ambawadi', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Ambawadi, Ahmedabad, Gujarat 380006, India', latitude: 23.0230, longitude: 72.5480, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380006' },
  { placeId: 'loc_paldi', mainText: 'Paldi', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Paldi, Ahmedabad, Gujarat 380007, India', latitude: 23.0130, longitude: 72.5620, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380007' },
  { placeId: 'loc_ashramroad', mainText: 'Ashram Road', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Ashram Road, Ahmedabad, Gujarat 380009, India', latitude: 23.0320, longitude: 72.5710, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380009' },
  { placeId: 'loc_sabarmati', mainText: 'Sabarmati', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Sabarmati, Ahmedabad, Gujarat 380005, India', latitude: 23.0780, longitude: 72.5830, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380005' },
  { placeId: 'loc_ranip', mainText: 'Ranip', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Ranip, Ahmedabad, Gujarat 382480, India', latitude: 23.0750, longitude: 72.5680, city: 'Ahmedabad', state: 'Gujarat', zipCode: '382480' },

  // Ahmedabad - East & South
  { placeId: 'loc_maninagar', mainText: 'Maninagar', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Maninagar, Ahmedabad, Gujarat 380008, India', latitude: 22.9968, longitude: 72.6010, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380008' },
  { placeId: 'loc_kankaria', mainText: 'Kankaria Lake', secondaryText: 'Maninagar, Ahmedabad, Gujarat, India', address: 'Kankaria, Ahmedabad, Gujarat 380022, India', latitude: 23.0060, longitude: 72.5990, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380022' },
  { placeId: 'loc_nikol', mainText: 'Nikol', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Nikol, Ahmedabad, Gujarat 382350, India', latitude: 23.0430, longitude: 72.6710, city: 'Ahmedabad', state: 'Gujarat', zipCode: '382350' },
  { placeId: 'loc_naroda', mainText: 'Naroda', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Naroda, Ahmedabad, Gujarat 382330, India', latitude: 23.0720, longitude: 72.6580, city: 'Ahmedabad', state: 'Gujarat', zipCode: '382330' },
  { placeId: 'loc_vastral', mainText: 'Vastral', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Vastral, Ahmedabad, Gujarat 382418, India', latitude: 23.0030, longitude: 72.6530, city: 'Ahmedabad', state: 'Gujarat', zipCode: '382418' },
  { placeId: 'loc_odhav', mainText: 'Odhav', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Odhav, Ahmedabad, Gujarat 382415, India', latitude: 23.0180, longitude: 72.6620, city: 'Ahmedabad', state: 'Gujarat', zipCode: '382415' },
  { placeId: 'loc_bapunagar', mainText: 'Bapunagar', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Bapunagar, Ahmedabad, Gujarat 380024, India', latitude: 23.0370, longitude: 72.6310, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380024' },
  { placeId: 'loc_krishnanagar', mainText: 'Krishnanagar', secondaryText: 'Naroda, Ahmedabad, Gujarat, India', address: 'Krishnanagar, Naroda, Ahmedabad, Gujarat 382345, India', latitude: 23.0560, longitude: 72.6450, city: 'Ahmedabad', state: 'Gujarat', zipCode: '382345' },
  { placeId: 'loc_shahibaug', mainText: 'Shahibaug', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Shahibaug, Ahmedabad, Gujarat 380004, India', latitude: 23.0550, longitude: 72.5930, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380004' },
  { placeId: 'loc_bhadra', mainText: 'Bhadra / Lal Darwaja', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Bhadra, Lal Darwaja, Ahmedabad, Gujarat 380001, India', latitude: 23.0264, longitude: 72.5815, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380001' },
  { placeId: 'loc_vejalpur', mainText: 'Vejalpur', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Vejalpur, Ahmedabad, Gujarat 380051, India', latitude: 23.0060, longitude: 72.5220, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380051' },
  { placeId: 'loc_makarba', mainText: 'Makarba', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Makarba, SG Highway, Ahmedabad, Gujarat 380051, India', latitude: 22.9960, longitude: 72.5020, city: 'Ahmedabad', state: 'Gujarat', zipCode: '380051' },
  { placeId: 'loc_sarkhej', mainText: 'Sarkhej', secondaryText: 'Ahmedabad, Gujarat, India', address: 'Sarkhej, Ahmedabad, Gujarat 382210, India', latitude: 22.9850, longitude: 72.4980, city: 'Ahmedabad', state: 'Gujarat', zipCode: '382210' },

  // Gandhinagar
  { placeId: 'loc_giftcity', mainText: 'GIFT City', secondaryText: 'Gandhinagar, Gujarat, India', address: 'GIFT City, Gandhinagar, Gujarat 382355, India', latitude: 23.1590, longitude: 72.6840, city: 'Gandhinagar', state: 'Gujarat', zipCode: '382355' },
  { placeId: 'loc_kudasan', mainText: 'Kudasan', secondaryText: 'Gandhinagar, Gujarat, India', address: 'Kudasan, Gandhinagar, Gujarat 382421, India', latitude: 23.1870, longitude: 72.6320, city: 'Gandhinagar', state: 'Gujarat', zipCode: '382421' },
  { placeId: 'loc_infocity', mainText: 'Infocity', secondaryText: 'Gandhinagar, Gujarat, India', address: 'Infocity, Gandhinagar, Gujarat 382007, India', latitude: 23.1930, longitude: 72.6280, city: 'Gandhinagar', state: 'Gujarat', zipCode: '382007' },
  { placeId: 'loc_sector21', mainText: 'Sector 21', secondaryText: 'Gandhinagar, Gujarat, India', address: 'Sector 21, Gandhinagar, Gujarat 382021, India', latitude: 23.2270, longitude: 72.6510, city: 'Gandhinagar', state: 'Gujarat', zipCode: '382021' },

  // Surat
  { placeId: 'loc_vesu_surat', mainText: 'Vesu', secondaryText: 'Surat, Gujarat, India', address: 'Vesu Main Road, Surat, Gujarat 395007, India', latitude: 21.1442, longitude: 72.7725, city: 'Surat', state: 'Gujarat', zipCode: '395007' },
  { placeId: 'loc_adajan_surat', mainText: 'Adajan', secondaryText: 'Surat, Gujarat, India', address: 'Adajan, Surat, Gujarat 395009, India', latitude: 21.1959, longitude: 72.7933, city: 'Surat', state: 'Gujarat', zipCode: '395009' },
  { placeId: 'loc_pal_surat', mainText: 'Pal', secondaryText: 'Surat, Gujarat, India', address: 'Pal Gam, Surat, Gujarat 395009, India', latitude: 21.1930, longitude: 72.7660, city: 'Surat', state: 'Gujarat', zipCode: '395009' },
  { placeId: 'loc_citylight_surat', mainText: 'Citylight', secondaryText: 'Surat, Gujarat, India', address: 'Citylight Town, Surat, Gujarat 395007, India', latitude: 21.1660, longitude: 72.7880, city: 'Surat', state: 'Gujarat', zipCode: '395007' },
  { placeId: 'loc_piplod_surat', mainText: 'Piplod', secondaryText: 'Surat, Gujarat, India', address: 'Dumas Road, Piplod, Surat, Gujarat 395007, India', latitude: 21.1550, longitude: 72.7750, city: 'Surat', state: 'Gujarat', zipCode: '395007' },
  { placeId: 'loc_varachha_surat', mainText: 'Varachha', secondaryText: 'Surat, Gujarat, India', address: 'Varachha Main Road, Surat, Gujarat 395006, India', latitude: 21.2180, longitude: 72.8530, city: 'Surat', state: 'Gujarat', zipCode: '395006' },
  { placeId: 'loc_katargam_surat', mainText: 'Katargam', secondaryText: 'Surat, Gujarat, India', address: 'Katargam, Surat, Gujarat 395004, India', latitude: 21.2290, longitude: 72.8250, city: 'Surat', state: 'Gujarat', zipCode: '395004' },

  // Vadodara
  { placeId: 'loc_alkapuri_vad', mainText: 'Alkapuri', secondaryText: 'Vadodara, Gujarat, India', address: 'Alkapuri, Vadodara, Gujarat 390007, India', latitude: 22.3110, longitude: 73.1750, city: 'Vadodara', state: 'Gujarat', zipCode: '390007' },
  { placeId: 'loc_gotri_vad', mainText: 'Gotri', secondaryText: 'Vadodara, Gujarat, India', address: 'Gotri Road, Vadodara, Gujarat 390021, India', latitude: 22.3160, longitude: 73.1420, city: 'Vadodara', state: 'Gujarat', zipCode: '390021' },
  { placeId: 'loc_manjalpur_vad', mainText: 'Manjalpur', secondaryText: 'Vadodara, Gujarat, India', address: 'Manjalpur, Vadodara, Gujarat 390011, India', latitude: 22.2710, longitude: 73.1890, city: 'Vadodara', state: 'Gujarat', zipCode: '390011' },
  { placeId: 'loc_akota_vad', mainText: 'Akota', secondaryText: 'Vadodara, Gujarat, India', address: 'Akota, Vadodara, Gujarat 390020, India', latitude: 22.2980, longitude: 73.1680, city: 'Vadodara', state: 'Gujarat', zipCode: '390020' },

  // Rajkot
  { placeId: 'loc_kalavad_raj', mainText: 'Kalavad Road', secondaryText: 'Rajkot, Gujarat, India', address: 'Kalavad Road, Rajkot, Gujarat 360005, India', latitude: 22.2850, longitude: 70.7680, city: 'Rajkot', state: 'Gujarat', zipCode: '360005' },
  { placeId: 'loc_150ring_raj', mainText: '150 Feet Ring Road', secondaryText: 'Rajkot, Gujarat, India', address: '150 Feet Ring Road, Rajkot, Gujarat 360005, India', latitude: 22.2810, longitude: 70.7780, city: 'Rajkot', state: 'Gujarat', zipCode: '360005' },
  { placeId: 'loc_university_raj', mainText: 'University Road', secondaryText: 'Rajkot, Gujarat, India', address: 'University Road, Rajkot, Gujarat 360005, India', latitude: 22.2970, longitude: 70.7650, city: 'Rajkot', state: 'Gujarat', zipCode: '360005' },

  // Mumbai
  { placeId: 'loc_andheri_mum', mainText: 'Andheri West', secondaryText: 'Mumbai, Maharashtra, India', address: 'Andheri West, Mumbai, Maharashtra 400053, India', latitude: 19.1363, longitude: 72.8277, city: 'Mumbai', state: 'Maharashtra', zipCode: '400053' },
  { placeId: 'loc_bandra_mum', mainText: 'Bandra West (Linking Road)', secondaryText: 'Mumbai, Maharashtra, India', address: 'Bandra West, Mumbai, Maharashtra 400050, India', latitude: 19.0596, longitude: 72.8295, city: 'Mumbai', state: 'Maharashtra', zipCode: '400050' },
  { placeId: 'loc_dadar_mum', mainText: 'Dadar West', secondaryText: 'Mumbai, Maharashtra, India', address: 'Dadar West, Mumbai, Maharashtra 400028, India', latitude: 19.0178, longitude: 72.8397, city: 'Mumbai', state: 'Maharashtra', zipCode: '400028' },
  { placeId: 'loc_thane_mum', mainText: 'Thane West', secondaryText: 'Thane, Maharashtra, India', address: 'Ghopbunder Road, Thane West, Maharashtra 400601, India', latitude: 19.2183, longitude: 72.9781, city: 'Thane', state: 'Maharashtra', zipCode: '400601' },
  { placeId: 'loc_vashi_mum', mainText: 'Vashi', secondaryText: 'Navi Mumbai, Maharashtra, India', address: 'Vashi, Navi Mumbai, Maharashtra 400703, India', latitude: 19.0771, longitude: 72.9986, city: 'Navi Mumbai', state: 'Maharashtra', zipCode: '400703' },

  // Delhi NCR
  { placeId: 'loc_cp_del', mainText: 'Connaught Place (CP)', secondaryText: 'New Delhi, Delhi, India', address: 'Connaught Place, New Delhi, Delhi 110001, India', latitude: 28.6315, longitude: 77.2167, city: 'New Delhi', state: 'Delhi', zipCode: '110001' },
  { placeId: 'loc_saket_del', mainText: 'Saket', secondaryText: 'New Delhi, Delhi, India', address: 'Saket, New Delhi, Delhi 110017, India', latitude: 28.5245, longitude: 77.2066, city: 'New Delhi', state: 'Delhi', zipCode: '110017' },
  { placeId: 'loc_dwarka_del', mainText: 'Dwarka', secondaryText: 'New Delhi, Delhi, India', address: 'Dwarka Sector 12, New Delhi, Delhi 110075, India', latitude: 28.5921, longitude: 77.0460, city: 'New Delhi', state: 'Delhi', zipCode: '110075' },
  { placeId: 'loc_cybercity_ggn', mainText: 'DLF Cyber City', secondaryText: 'Gurugram, Haryana, India', address: 'DLF Cyber City, DLF Phase 2, Gurugram, Haryana 122002, India', latitude: 28.4950, longitude: 77.0895, city: 'Gurugram', state: 'Haryana', zipCode: '122002' },
  { placeId: 'loc_sector62_noida', mainText: 'Sector 62', secondaryText: 'Noida, Uttar Pradesh, India', address: 'Sector 62, Noida, Uttar Pradesh 201309, India', latitude: 28.6279, longitude: 77.3649, city: 'Noida', state: 'Uttar Pradesh', zipCode: '201309' },

  // Bengaluru
  { placeId: 'loc_koramangala_blr', mainText: 'Koramangala', secondaryText: 'Bengaluru, Karnataka, India', address: 'Koramangala, Bengaluru, Karnataka 560034, India', latitude: 12.9352, longitude: 77.6245, city: 'Bengaluru', state: 'Karnataka', zipCode: '560034' },
  { placeId: 'loc_indiranagar_blr', mainText: 'Indiranagar (100 Feet Road)', secondaryText: 'Bengaluru, Karnataka, India', address: '100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038, India', latitude: 12.9784, longitude: 77.6408, city: 'Bengaluru', state: 'Karnataka', zipCode: '560038' },
  { placeId: 'loc_whitefield_blr', mainText: 'Whitefield', secondaryText: 'Bengaluru, Karnataka, India', address: 'Whitefield, Bengaluru, Karnataka 560066, India', latitude: 12.9698, longitude: 77.7500, city: 'Bengaluru', state: 'Karnataka', zipCode: '560066' },
  { placeId: 'loc_hsr_blr', mainText: 'HSR Layout', secondaryText: 'Bengaluru, Karnataka, India', address: 'HSR Layout Sector 1, Bengaluru, Karnataka 560102, India', latitude: 12.9121, longitude: 77.6446, city: 'Bengaluru', state: 'Karnataka', zipCode: '560102' }
];

// In-memory cache for fast lookups
const fallbackPlacesCache = new Map();

/**
 * Enhanced Fallback Place Suggestions with instant local indexing and OpenStreetMap live lookup
 */
async function getFallbackPlacesSuggestions(query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results = [];
  const seenPlaceIds = new Set();

  // 1. High-Precision Local Matching (Word-start and Token matches)
  const matched = KNOWN_LOCATIONS.filter(loc => {
    const main = loc.mainText.toLowerCase();
    const addr = loc.address.toLowerCase();
    const sec = loc.secondaryText.toLowerCase();
    const zip = (loc.zipCode || '').toLowerCase();

    return (
      main.startsWith(q) ||
      main.includes(q) ||
      addr.includes(q) ||
      sec.includes(q) ||
      zip.startsWith(q)
    );
  });

  matched.slice(0, 6).forEach(m => {
    seenPlaceIds.add(m.placeId);
    results.push({
      placeId: m.placeId,
      address: m.address,
      mainText: m.mainText,
      secondaryText: m.secondaryText
    });
  });

  // If local dictionary matched 4 or more, return immediately for super-fast UX
  if (results.length >= 4) {
    return results.slice(0, 6);
  }

  // 2. Fetch live OpenStreetMap suggestions (India priority)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=6&countrycodes=in`;
    const res = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'EmahuMarketplaceAddressSearch/1.0',
        'Accept-Language': 'en'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        data.forEach((item) => {
          const placeId = `osm_${item.place_id}`;
          if (seenPlaceIds.has(placeId)) return;

          const addr = item.address || {};
          const mainText = item.name || addr.road || addr.suburb || addr.neighbourhood || addr.city || query;
          const secondaryParts = [
            addr.suburb,
            addr.city || addr.town || addr.village || addr.city_district,
            addr.state,
            addr.postcode
          ].filter(Boolean);

          const secondaryText = secondaryParts.join(', ');
          const formattedAddress = item.display_name;

          // Save coordinates in memory cache for instant detail lookups
          fallbackPlacesCache.set(placeId, {
            placeId,
            address: formattedAddress,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            city: addr.city || addr.town || addr.village || addr.city_district || 'Ahmedabad',
            state: addr.state || 'Gujarat',
            zipCode: addr.postcode || '380001'
          });

          seenPlaceIds.add(placeId);
          results.push({
            placeId,
            address: formattedAddress,
            mainText,
            secondaryText: secondaryText || 'India'
          });
        });
      }
    }
  } catch (_) { }

  if (results.length > 0) {
    return results.slice(0, 6);
  }

  // If nothing matched, generate a clean custom entry
  return [
    {
      placeId: `fallback_custom_${encodeURIComponent(q.slice(0, 25))}`,
      address: `${query.charAt(0).toUpperCase() + query.slice(1)}, Ahmedabad, Gujarat, India`,
      mainText: query.charAt(0).toUpperCase() + query.slice(1),
      secondaryText: 'Ahmedabad, Gujarat, India'
    }
  ];
}

async function getFallbackPlaceDetails(placeId) {
  // 1. Check in-memory cache
  if (fallbackPlacesCache.has(placeId)) {
    return fallbackPlacesCache.get(placeId);
  }

  // 2. Check KNOWN_LOCATIONS
  const match = KNOWN_LOCATIONS.find(l => l.placeId === placeId);
  if (match) {
    return {
      placeId: match.placeId,
      address: match.address,
      latitude: match.latitude,
      longitude: match.longitude,
      city: match.city,
      state: match.state,
      zipCode: match.zipCode || '380001'
    };
  }

  // 3. OSM ID lookup
  if (placeId.startsWith('osm_')) {
    const rawId = placeId.replace('osm_', '');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/details?place_id=${rawId}&format=json&addressdetails=1`, {
        headers: { 'User-Agent': 'EmahuMarketplaceAddressSearch/1.0' }
      });
      if (res.ok) {
        const item = await res.json();
        const addr = item.address || {};
        return {
          placeId,
          address: item.calculated_address || item.local_name || 'India',
          latitude: parseFloat(item.centroid?.coordinates?.[1] || item.lat || 23.0225),
          longitude: parseFloat(item.centroid?.coordinates?.[0] || item.lon || 72.5714),
          city: addr.city || addr.town || addr.village || 'Ahmedabad',
          state: addr.state || 'Gujarat',
          zipCode: addr.postcode || '380001'
        };
      }
    } catch (_) { }
  }

  // 4. fallback_custom ID
  if (placeId.startsWith('fallback_custom_')) {
    const rawText = decodeURIComponent(placeId.replace('fallback_custom_', ''));
    return {
      placeId,
      address: `${rawText.charAt(0).toUpperCase() + rawText.slice(1)}, Ahmedabad, Gujarat, India`,
      latitude: 23.0225,
      longitude: 72.5714,
      city: 'Ahmedabad',
      state: 'Gujarat',
      zipCode: '380001'
    };
  }

}

async function reverseGeocode(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  const apiKey = getApiKey();

  if (apiKey && apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY') {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          let sublocality = '';
          let neighbourhood = '';
          let locality = '';
          let city = '';
          let state = '';
          let zipCode = '';

          for (const comp of result.address_components || []) {
            if (comp.types.includes('sublocality_level_1') || comp.types.includes('sublocality')) {
              sublocality = comp.long_name;
            } else if (comp.types.includes('neighborhood')) {
              neighbourhood = comp.long_name;
            } else if (comp.types.includes('locality')) {
              locality = comp.long_name;
            } else if (comp.types.includes('administrative_area_level_2')) {
              city = comp.long_name;
            } else if (comp.types.includes('administrative_area_level_1')) {
              state = comp.long_name;
            } else if (comp.types.includes('postal_code')) {
              zipCode = comp.long_name;
            }
          }

          const area = sublocality || neighbourhood || locality || city || 'Current Location';
          const finalCity = locality || city || 'Gujarat';

          return {
            address: result.formatted_address,
            latitude: lat,
            longitude: lon,
            area,
            sublocality,
            city: finalCity,
            state: state || 'Gujarat',
            zipCode
          };
        }
      }
    } catch (e) {
      console.warn('Google reverse geocode error:', e);
    }
  }

  // OpenStreetMap Nominatim reverse geocode fallback
  try {
    const osmRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`, {
      headers: { 'User-Agent': 'EmahuMarketplaceGPSDetection/1.0' }
    });
    if (osmRes.ok) {
      const osmData = await osmRes.json();
      const addr = osmData.address || {};
      const area = addr.suburb || addr.neighbourhood || addr.quarter || addr.residential || addr.road || addr.city_district || addr.city || addr.town || 'Current Location';
      const city = addr.city || addr.town || addr.village || addr.state_district || 'Ahmedabad';
      const state = addr.state || 'Gujarat';
      return {
        address: osmData.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
        latitude: lat,
        longitude: lon,
        area,
        sublocality: addr.suburb || addr.neighbourhood || '',
        city,
        state,
        zipCode: addr.postcode || ''
      };
    }
  } catch (err) {
    console.warn('OSM reverse geocoding fallback error:', err);
  }

  return {
    address: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    latitude: lat,
    longitude: lon,
    area: 'Current Location',
    city: 'Ahmedabad',
    state: 'Gujarat'
  };
}

module.exports = {
  searchPlaces,
  getPlaceDetails,
  reverseGeocode
};


