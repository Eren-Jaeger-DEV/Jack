const express = require('express');
const router = express.Router();
const configManager = require('../../../bot/utils/configManager');
const UserMemory = require('../../../bot/database/models/UserMemory');
const { requireRole } = require('../middleware/auth');
require('dotenv').config();

/**
 * GET /status
 * Returns current Gemini AI status and metrics.
 */
router.get('/status', async (req, res) => {
  try {
    const keysCount = (process.env.GOOGLE_API_KEYS || "").split(',').length;
    res.json({
      model: 'gemini-2.0-flash',
      multiKeyActive: keysCount > 1,
      keysCount: keysCount,
      reputationMatrix: 'v4.2.0 (Active)',
      status: '🟢 OPERATIONAL'
    });
  } catch (err) {
    res.status(500).json({ error: 'AI status check failed' });
  }
});

/**
 * GET /personality/:guildId
 * Retrieves current personality sliders for a specific guild.
 */
router.get('/personality/:guildId', requireRole('admin'), async (req, res) => {
  try {
    const config = await configManager.getGuildConfig(req.params.guildId);
    const personality = config?.settings?.personality || {
      tone: "calm",
      humor: 10,
      strictness: 60,
      verbosity: 40,
      respect_bias: 60
    };
    res.json(personality);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch personality settings' });
  }
});

/**
 * POST /personality/:guildId
 * Updates personality sliders.
 */
router.post('/personality/:guildId', requireRole('admin'), async (req, res) => {
  try {
    const updates = { 'settings.personality': req.body };
    const newConfig = await configManager.updateGuildConfig(req.params.guildId, updates);
    res.json(newConfig.settings.personality);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update personality settings' });
  }
});

/**
 * GET /memory/:guildId
 * Fetches recent high-importance semantic memories for the guild.
 */
router.get('/memory/:guildId', requireRole('admin'), async (req, res) => {
  try {
    const memories = await UserMemory.find({ guildId: req.params.guildId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    res.json(memories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch semantic memories' });
  }
});

module.exports = router;
