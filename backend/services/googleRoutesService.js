/**
 * Google Routes Service (Routes API - Compute Route Matrix)
 * Secure server-side calculation for road distance between Buyer and Seller locations.
 * 
 * Endpoint:
 * - Compute Route Matrix: https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix
 */

function getApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY || '';
}

// In-memory cache for road distances: key -> { distanceMeters, distanceKm, timestamp }
const distanceCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours cache for identical coordinate pairs

/**
 * Validate latitude and longitude values
 * @param {number} lat Latitude (-90 to 90)
 * @param {number} lon Longitude (-180 to 180)
 * @returns {boolean}
 */
function isValidCoordinate(lat, lon) {
  if (lat === undefined || lat === null || lon === undefined || lon === null) return false;
  const numLat = Number(lat);
  const numLon = Number(lon);
  if (isNaN(numLat) || isNaN(numLon)) return false;
  return numLat >= -90 && numLat <= 90 && numLon >= -180 && numLon <= 180;
}

/**
 * Generate a deterministic cache key for a pair of coordinates
 */
function getCacheKey(originLat, originLon, destLat, destLon) {
  const oLat = Number(originLat).toFixed(4);
  const oLon = Number(originLon).toFixed(4);
  const dLat = Number(destLat).toFixed(4);
  const dLon = Number(destLon).toFixed(4);
  return `${oLat},${oLon}->${dLat},${dLon}`;
}

/**
 * Haversine fallback formula with realistic urban road factor (1.25x - 1.3x)
 */
function calculateHaversineRoadDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const crowDistanceKm = R * c;

  // Road factor to approximate actual street road distance from straight-line crow distance
  const roadFactor = crowDistanceKm < 2 ? 1.35 : crowDistanceKm < 15 ? 1.28 : 1.2;
  const roadDistanceKm = Number((crowDistanceKm * roadFactor).toFixed(2));
  const distanceMeters = Math.round(roadDistanceKm * 1000);

  return {
    distanceMeters,
    distanceKm: roadDistanceKm
  };
}

/**
 * Compute road distance between one origin (Buyer) and one destination (Seller)
 * @param {{ latitude: number, longitude: number }} origin Buyer coordinates
 * @param {{ latitude: number, longitude: number }} destination Seller coordinates
 * @returns {Promise<{ distanceMeters: number, distanceKm: number }>}
 */
async function computeSingleRoadDistance(origin, destination) {
  const results = await computeRouteMatrix(origin, [destination]);
  if (results && results.length > 0 && results[0].status === 'OK') {
    return {
      distanceMeters: results[0].distanceMeters,
      distanceKm: results[0].distanceKm
    };
  }

  // Fallback to Haversine if Routes API did not return OK
  return calculateHaversineRoadDistance(
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude
  );
}

/**
 * Compute Route Matrix between one origin (Buyer) and multiple destinations (Sellers)
 * @param {{ latitude: number, longitude: number }} origin Buyer coordinates
 * @param {Array<{ latitude: number, longitude: number, id?: string }>} destinations Array of Seller coordinates
 * @returns {Promise<Array<{ destinationIndex: number, distanceMeters: number, distanceKm: number, status: string }>>}
 */
async function computeRouteMatrix(origin, destinations) {
  if (!origin || !isValidCoordinate(origin.latitude, origin.longitude)) {
    throw new Error('Valid buyer coordinates (latitude -90 to 90, longitude -180 to 180) are required');
  }

  if (!Array.isArray(destinations) || destinations.length === 0) {
    return [];
  }

  const validDestinations = destinations.map((dest, idx) => ({
    ...dest,
    originalIndex: idx,
    isValid: isValidCoordinate(dest.latitude, dest.longitude)
  }));

  const results = new Array(destinations.length).fill(null);

  // Check cache or prepare destinations that need API call
  const destinationsToFetch = [];

  validDestinations.forEach(dest => {
    if (!dest.isValid) {
      results[dest.originalIndex] = {
        destinationIndex: dest.originalIndex,
        distanceMeters: 0,
        distanceKm: 0,
        status: 'INVALID_COORDINATES'
      };
      return;
    }

    const cacheKey = getCacheKey(origin.latitude, origin.longitude, dest.latitude, dest.longitude);
    const cached = distanceCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      results[dest.originalIndex] = {
        destinationIndex: dest.originalIndex,
        distanceMeters: cached.distanceMeters,
        distanceKm: cached.distanceKm,
        status: 'OK',
        cached: true
      };
    } else {
      destinationsToFetch.push(dest);
    }
  });

  // If all results were satisfied by cache/invalidity, return immediately
  if (destinationsToFetch.length === 0) {
    return results;
  }

  const apiKey = getApiKey();
  // If no Google API key is configured, use Haversine fallback calculation
  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
    destinationsToFetch.forEach(dest => {
      const calc = calculateHaversineRoadDistance(
        origin.latitude,
        origin.longitude,
        dest.latitude,
        dest.longitude
      );
      results[dest.originalIndex] = {
        destinationIndex: dest.originalIndex,
        distanceMeters: calc.distanceMeters,
        distanceKm: calc.distanceKm,
        status: 'OK'
      };
    });
    return results;
  }

  try {
    const url = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';
    const requestBody = {
      origins: [
        {
          waypoint: {
            location: {
              latLng: {
                latitude: Number(origin.latitude),
                longitude: Number(origin.longitude)
              }
            }
          },
          routeModifiers: {
            avoidTolls: false,
            avoidHighways: false,
            avoidFerries: true
          }
        }
      ],
      destinations: destinationsToFetch.map(dest => ({
        waypoint: {
          location: {
            latLng: {
              latitude: Number(dest.latitude),
              longitude: Number(dest.longitude)
            }
          }
        }
      })),
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_UNAWARE'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'originIndex,destinationIndex,status,distanceMeters,duration,condition'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Google Routes API Matrix Warning] HTTP ${response.status}:`, errText);
      // Fallback to Haversine for the pending destinations
      destinationsToFetch.forEach(dest => {
        const calc = calculateHaversineRoadDistance(
          origin.latitude,
          origin.longitude,
          dest.latitude,
          dest.longitude
        );
        results[dest.originalIndex] = {
          destinationIndex: dest.originalIndex,
          distanceMeters: calc.distanceMeters,
          distanceKm: calc.distanceKm,
          status: 'OK'
        };
      });
      return results;
    }

    const responseData = await response.json();
    const matrixElements = Array.isArray(responseData) ? responseData : [responseData];

    // Map Google API matrix stream/array responses back to destinations
    matrixElements.forEach(item => {
      const destIndexInFetch = item.destinationIndex !== undefined ? item.destinationIndex : 0;
      const targetDest = destinationsToFetch[destIndexInFetch];
      if (!targetDest) return;

      if (item.status && item.status.code !== undefined && item.status.code !== 0) {
        // Fallback for this single pair
        const calc = calculateHaversineRoadDistance(
          origin.latitude,
          origin.longitude,
          targetDest.latitude,
          targetDest.longitude
        );
        results[targetDest.originalIndex] = {
          destinationIndex: targetDest.originalIndex,
          distanceMeters: calc.distanceMeters,
          distanceKm: calc.distanceKm,
          status: 'OK'
        };
        return;
      }

      const distanceMeters = item.distanceMeters !== undefined ? item.distanceMeters : 0;
      const distanceKm = Number((distanceMeters / 1000).toFixed(2));

      // Cache the result
      const cacheKey = getCacheKey(
        origin.latitude,
        origin.longitude,
        targetDest.latitude,
        targetDest.longitude
      );
      distanceCache.set(cacheKey, {
        distanceMeters,
        distanceKm,
        timestamp: Date.now()
      });

      results[targetDest.originalIndex] = {
        destinationIndex: targetDest.originalIndex,
        distanceMeters,
        distanceKm,
        status: 'OK'
      };
    });

    // Fill in any destinations that weren't returned in the matrix response with Haversine fallback
    destinationsToFetch.forEach(dest => {
      if (!results[dest.originalIndex]) {
        const calc = calculateHaversineRoadDistance(
          origin.latitude,
          origin.longitude,
          dest.latitude,
          dest.longitude
        );
        results[dest.originalIndex] = {
          destinationIndex: dest.originalIndex,
          distanceMeters: calc.distanceMeters,
          distanceKm: calc.distanceKm,
          status: 'OK'
        };
      }
    });

    return results;
  } catch (error) {
    console.error('[Google Routes Service Matrix Error]:', error.message || error);
    // Fallback to Haversine for all remaining destinations
    destinationsToFetch.forEach(dest => {
      const calc = calculateHaversineRoadDistance(
        origin.latitude,
        origin.longitude,
        dest.latitude,
        dest.longitude
      );
      results[dest.originalIndex] = {
        destinationIndex: dest.originalIndex,
        distanceMeters: calc.distanceMeters,
        distanceKm: calc.distanceKm,
        status: 'OK'
      };
    });
    return results;
  }
}

/**
 * Clear distance cache if needed (e.g. for testing)
 */
function clearDistanceCache() {
  distanceCache.clear();
}

module.exports = {
  isValidCoordinate,
  computeSingleRoadDistance,
  computeRouteMatrix,
  calculateHaversineRoadDistance,
  clearDistanceCache
};
