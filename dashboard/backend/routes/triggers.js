const express = require('express');
const router = express.Router();
const Trigger = require('../../../bot/database/models/Trigger');
const { verifyGuildPermission } = require('../middleware/guildAuth');

router.get('/guilds/:guildId/triggers', verifyGuildPermission, async (req, res) => {
  const { guildId } = req.params;
  try {
    const triggers = await Trigger.find({ guildId }).sort({ createdAt: -1 });
    res.json(triggers);
  } catch (err) {
    console.error('[Triggers API Error]:', err);
    res.status(500).json({ error: 'Failed to fetch triggers' });
  }
});

router.post('/guilds/:guildId/triggers', express.json(), verifyGuildPermission, async (req, res) => {
  const { guildId } = req.params;
  const data = req.body;
  try {
    const trigger = new Trigger({ ...data, guildId });
    await trigger.save();
    res.json(trigger);
  } catch (err) {
    console.error('[Triggers API Error]:', err);
    res.status(500).json({ error: 'Failed to create trigger' });
  }
});

router.put('/guilds/:guildId/triggers/:id', express.json(), verifyGuildPermission, async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const trigger = await Trigger.findByIdAndUpdate(id, data, { new: true });
    res.json(trigger);
  } catch (err) {
    console.error('[Triggers API Error]:', err);
    res.status(500).json({ error: 'Failed to update trigger' });
  }
});

router.delete('/guilds/:guildId/triggers/:id', verifyGuildPermission, async (req, res) => {
  const { id } = req.params;
  try {
    await Trigger.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    console.error('[Triggers API Error]:', err);
    res.status(500).json({ error: 'Failed to delete trigger' });
  }
});

module.exports = router;
