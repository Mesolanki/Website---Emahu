const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/authMiddleware');

// @desc    Get admin audit logs
// @route   GET /api/audit
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const logs = await AuditLog.find().populate('admin', 'name email').sort({ createdAt: -1 });
    res.status(200).json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
