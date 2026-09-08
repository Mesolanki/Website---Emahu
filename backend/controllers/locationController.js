const { searchPlaces, getPlaceDetails, reverseGeocode } = require('../services/googlePlacesService');
const {
  isValidCoordinate,
  computeSingleRoadDistance,
  computeRouteMatrix
} = require('../services/googleRoutesService');
const User = require('../models/User');

/**
 * @desc    Reverse geocode coordinates to human-readable address & city
 * @route   GET /api/location/reverse?lat=23.0225&lon=72.5714
 * @access  Public
 */
exports.reverseGeocodeLocation = async (req, res) => {
  try {
    const { lat, lon, latitude, longitude } = req.query;
    const targetLat = parseFloat(lat || latitude);
    const targetLon = parseFloat(lon || longitude);

    if (isNaN(targetLat) || isNaN(targetLon)) {
      return res.status(400).json({
        success: false,
        error: 'Valid latitude and longitude are required'
      });
    }

    const details = await reverseGeocode(targetLat, targetLon);

    res.status(200).json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('Reverse Geocode Controller Error:', error);
    res.status(500).json({
      success: false,
      error: 'Unable to resolve address from coordinates'
    });
  }
};

/**
 * @desc    Search addresses / places using Google Places API (New)
 * @route   GET /api/location/search?query=satellite%20ahmedabad
 * @access  Public
 */
exports.searchLocation = async (req, res) => {
  try {
    const { query, sessionToken } = req.query;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a search query'
      });
    }

    const suggestions = await searchPlaces(query.trim(), sessionToken || '');

    res.status(200).json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Location Search Controller Error:', error);
    res.status(500).json({
      success: false,
      error: 'Unable to find this location'
    });
  }
};

/**
 * @desc    Get exact place coordinates and formatted address
 * @route   GET /api/location/details?placeId=...
 * @access  Public
 */
exports.getLocationDetails = async (req, res) => {
  try {
    const { placeId, sessionToken } = req.query;

    if (!placeId || typeof placeId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Please select a location'
      });
    }

    const details = await getPlaceDetails(placeId, sessionToken || '');

    res.status(200).json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('Location Details Controller Error:', error);
    res.status(500).json({
      success: false,
      error: 'Unable to find this location'
    });
  }
};

/**
 * @desc    Calculate road distance between buyer and seller(s)
 * @route   POST /api/location/distance
 * @access  Public
 */
exports.calculateDistance = async (req, res) => {
  try {
    const { origin, destination, destinations } = req.body;

    // Validate origin (Buyer coordinates)
    if (!origin || !isValidCoordinate(origin.latitude, origin.longitude)) {
      return res.status(400).json({
        success: false,
        error: 'Valid buyer coordinates are required'
      });
    }

    // Handle single destination
    if (destination && isValidCoordinate(destination.latitude, destination.longitude)) {
      const singleDistance = await computeSingleRoadDistance(
        { latitude: Number(origin.latitude), longitude: Number(origin.longitude) },
        { latitude: Number(destination.latitude), longitude: Number(destination.longitude) }
      );

      return res.status(200).json({
        success: true,
        distanceMeters: singleDistance.distanceMeters,
        distanceKm: singleDistance.distanceKm
      });
    }

    // Handle multiple destinations (list of sellers)
    if (Array.isArray(destinations) && destinations.length > 0) {
      const matrixResults = await computeRouteMatrix(
        { latitude: Number(origin.latitude), longitude: Number(origin.longitude) },
        destinations.map(d => ({
          id: d.id || d._id,
          latitude: Number(d.latitude),
          longitude: Number(d.longitude)
        }))
      );

      const formattedResults = destinations.map((dest, idx) => {
        const item = matrixResults[idx] || {};
        return {
          id: dest.id || dest._id,
          distanceMeters: item.distanceMeters || 0,
          distanceKm: item.distanceKm || 0,
          status: item.status || 'OK'
        };
      });

      return res.status(200).json({
        success: true,
        results: formattedResults
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Please provide valid seller destination coordinates'
    });
  } catch (error) {
    console.error('Distance Calculation Controller Error:', error);
    res.status(500).json({
      success: false,
      error: 'Unable to calculate distance right now'
    });
  }
};

/**
 * @desc    Find nearby relevant sellers and calculate road distances
 * @route   POST /api/sellers/nearby (also POST /api/location/nearby-sellers)
 * @access  Public
 */
exports.getNearbySellers = async (req, res) => {
  try {
    const { latitude, longitude, limit = 50 } = req.body;

    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        error: 'Valid buyer coordinates are required'
      });
    }

    const buyerLat = Number(latitude);
    const buyerLon = Number(longitude);

    // 1. Query approved active sellers who have latitude and longitude registered
    const sellerQuery = {
      role: 'seller',
      status: 'approved',
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null }
    };

    const sellers = await User.find(sellerQuery)
      .select('name storeName address city state latitude longitude phone email profilePhoto')
      .limit(Number(limit) || 50)
      .lean();

    if (!sellers || sellers.length === 0) {
      return res.status(200).json({
        success: true,
        sellers: []
      });
    }

    // 2. Prepare destinations for Google Routes API
    const destinations = sellers.map(s => ({
      id: String(s._id),
      latitude: s.latitude,
      longitude: s.longitude
    }));

    // 3. Compute road distance matrix via Routes API
    const matrixResults = await computeRouteMatrix(
      { latitude: buyerLat, longitude: buyerLon },
      destinations
    );

    // 4. Merge distance results and sort nearest to farthest
    const enrichedSellers = sellers
      .map((seller, idx) => {
        const distInfo = matrixResults[idx] || { distanceMeters: 0, distanceKm: 0 };
        return {
          id: String(seller._id),
          name: seller.name,
          storeName: seller.storeName || seller.name,
          address: seller.address || `${seller.city || ''}, ${seller.state || ''}`.replace(/^, |, $/, ''),
          city: seller.city,
          state: seller.state,
          latitude: seller.latitude,
          longitude: seller.longitude,
          distanceMeters: distInfo.distanceMeters,
          distanceKm: distInfo.distanceKm
        };
      })
      .filter(s => s.distanceKm > 0 || (s.latitude === buyerLat && s.longitude === buyerLon))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.status(200).json({
      success: true,
      buyerLocation: {
        latitude: buyerLat,
        longitude: buyerLon
      },
      sellers: enrichedSellers
    });
  } catch (error) {
    console.error('Nearby Sellers Controller Error:', error);
    res.status(500).json({
      success: false,
      error: 'Unable to calculate distance right now'
    });
  }
};
