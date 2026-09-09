const express = require('express');
const router = express.Router();
const {
  searchLocation,
  getLocationDetails,
  reverseGeocodeLocation,
  calculateDistance,
  getNearbySellers
} = require('../controllers/locationController');

// Search & Autocomplete via Places API (New)
router.get('/search', searchLocation);
router.get('/autocomplete', searchLocation);

// Reverse Geocoding (Coordinates -> Formatted Address & City)
router.get('/reverse', reverseGeocodeLocation);

// Place Details (Coordinates & Formatted Address)
router.get('/details', getLocationDetails);

// Road Distance calculation via Routes API (Compute Route Matrix)
router.post('/distance', calculateDistance);

// Nearby Sellers with road distance
router.post('/nearby-sellers', getNearbySellers);

module.exports = router;
