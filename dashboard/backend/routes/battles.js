const express = require("express");
const router = express.Router();
const Battle = require("../../../plugins/clan-battle/models/Battle");

/**
 * GET /active
 * Fetches the currently active clan battle.
 */
router.get("/active", async (req, res) => {
  try {
    const battle = await Battle.findOne({ active: true }).lean();
    if (!battle) return res.json({ active: false });

    // Sort players by totalPoints descending
    if (battle.players) {
      battle.players.sort((a, b) => b.totalPoints - a.totalPoints);
    }

    res.json({
      active: true,
      data: battle
    });
  } catch (err) {
    console.error("Failed to fetch active battle:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /history
 * Fetches the last 5 completed clan battles.
 */
router.get("/history", async (req, res) => {
  try {
    const battles = await Battle.find({ active: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({
      success: true,
      data: battles
    });
  } catch (err) {
    console.error("Failed to fetch battle history:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
