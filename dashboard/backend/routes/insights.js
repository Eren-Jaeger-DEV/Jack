const express = require("express");
const router = express.Router();
const Player = require("../../../bot/database/models/Player");
const ActivityLog = require("../../../bot/database/models/ActivityLog");
const { requireRole } = require("../middleware/auth");

/* MIDDLEWARE REMOVED: Using centralized requireRole from ../middleware/auth */

router.get("/insights", requireRole("admin"), async (req, res) => {
  try {
    const [
      totalPlayers,
      activePlayers,
      deletedPlayers,
      totalLogs,
      totalDeletes,
      totalRestores,
      totalPermanentDeletes
    ] = await Promise.all([
      Player.countDocuments({}),
      Player.countDocuments({ isDeleted: false }),
      Player.countDocuments({ isDeleted: true }),
      ActivityLog.countDocuments({}),
      ActivityLog.countDocuments({ action: "PLAYER_DELETE" }),
      ActivityLog.countDocuments({ action: "UNDO_DELETE" }),
      ActivityLog.countDocuments({ action: "PERMANENT_DELETE" })
    ]);

    res.json({
      totalPlayers,
      activePlayers,
      deletedPlayers,
      totalLogs,
      totalDeletes,
      totalRestores,
      totalPermanentDeletes
    });
  } catch (error) {
    console.error("[Insights API Error]:", error);
    res.status(500).json({ error: "Internal server error fetching system insights." });
  }
});

module.exports = router;
