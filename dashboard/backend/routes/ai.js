const express = require('express');
const router = express.Router();
require('dotenv').config();

/**
 * GET /status
 * Returns current Gemini AI status and metrics.
 */
router.get('/status', async (req, res) => {
  try {
    const keysCount = (process.env.GOOGLE_API_KEYS || "").split(',').length;
    res.json({
      model: 'gemini-3.1-pro-preview',
      multiKeyActive: keysCount > 1,
      keysCount: keysCount,
      reputationMatrix: 'v4.2.0 (Active)',
      status: '🟢 OPERATIONAL'
    });
  } catch (err) {
    res.status(500).json({ error: 'AI status check failed' });
  }
});

module.exports = router;
