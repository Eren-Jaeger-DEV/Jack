const express = require('express');
const router = express.Router();
const FosterProgram = require('../../../plugins/foster-program/models/FosterProgram');
const Player = require('../../../bot/database/models/Player');

/**
 * GET /active
 * Returns the currently active Foster Program (T1C1, T1C2, etc.)
 * Includes full pair details with IGNs.
 */
router.get('/active', async (req, res) => {
  try {
    const program = await FosterProgram.findOne({ active: true }).lean();
    if (!program) return res.json({ active: false });

    // Fetch IGNs for all participants
    const pairsWithIgns = await Promise.all(program.pairs.map(async (pair) => {
      const mentor = await Player.findOne({ discordId: pair.mentorId }).select('ign').lean();
      const partner = await Player.findOne({ discordId: pair.partnerId }).select('ign').lean();
      return {
        ...pair,
        mentorIgn: mentor?.ign || 'Unknown',
        partnerIgn: partner?.ign || 'Unknown',
        mentorPoints: program.mentorPoints[pair.mentorId] || 0,
        partnerPoints: program.partnerPoints[pair.partnerId] || 0
      };
    }));

    res.json({
      active: true,
      term: program.term,
      cycle: program.cycle,
      status: program.status,
      startedAt: program.startedAt,
      lastRotation: program.lastRotation,
      pairs: pairsWithIgns
    });
  } catch (err) {
    console.error('[Dashboard API] /foster/active error:', err);
    res.status(500).json({ error: 'Failed to fetch active foster program.' });
  }
});

module.exports = router;
