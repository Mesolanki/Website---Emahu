const express = require('express');
const router = express.Router();
const { logEvent, getFunnelStats } = require('../controllers/analyticsController');

router.post('/events', logEvent);
router.get('/funnel', getFunnelStats);

module.exports = router;
