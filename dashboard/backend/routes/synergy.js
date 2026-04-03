const express = require('express');
const router = express.Router();
const Player = require('../../../bot/database/models/Player');

/**
 * GET /rankings
 * Fetches the top-performing synergy players for dashboard charts.
 */
router.get('/rankings', async (req, res) => {
  try {
    const players = await Player.find({ seasonSynergy: { $gt: 0 } })
      .sort({ seasonSynergy: -1 })
      .limit(10)
      .select('ign seasonSynergy discordId')
      .lean();

    res.json({
      success: true,
      data: players
    });
  } catch (err) {
    console.error('[Dashboard API] /synergy/rankings error:', err);
    res.status(500).json({ error: 'Failed to fetch synergy rankings.' });
  }
});

module.exports = router;
