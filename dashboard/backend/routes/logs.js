const express = require("express");
const router = express.Router();
const ActivityLog = require("../../../bot/database/models/ActivityLog");
const Player = require("../../../bot/database/models/Player");
const { requireRole } = require("../middleware/auth");

// Get activity logs with optional filters
router.get("/logs", requireRole("admin"), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { action, adminId } = req.query;
    const query = {};
    if (action) query.action = action;
    if (adminId) query.adminId = adminId;

    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await ActivityLog.countDocuments(query);

    res.json({
      data: logs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("[Logs API Error]:", error);
    res.status(500).json({ error: "Internal server error fetching logs." });
  }
});

// Undo an action
router.post("/undo/:logId", requireRole("admin"), async (req, res) => {
  try {
    const logId = req.params.logId;
    const log = await ActivityLog.findById(logId);

    if (!log) {
      return res.status(404).json({ error: "Log entry not found." });
    }

    if (log.action !== "PLAYER_UPDATE" && log.action !== "PLAYER_DELETE") {
      return res.status(400).json({ error: "This action cannot be undone." });
    }

    const { targetId, changes } = log;
    const player = await Player.findOne({ discordId: targetId });

    if (!player) {
      return res.status(404).json({ error: "Target player no longer exists." });
    }

    if (log.action === "PLAYER_UPDATE") {
      // Revert changes
      const undoUpdates = {};
      for (const [key, value] of Object.entries(changes)) {
        if (value && value.from !== undefined) {
          undoUpdates[key] = value.from;
        }
      }

      if (Object.keys(undoUpdates).length === 0) {
        return res.status(400).json({ error: "No changes to undo." });
      }

      // Apply reversion
      await Player.findOneAndUpdate({ discordId: targetId }, { $set: undoUpdates });

      // Create a new log entry for the undo action
      await ActivityLog.create({
        adminId: req.user.id,
        adminUsername: req.user.username,
        adminAvatar: req.user.avatar,
        action: "UNDO_ACTION",
        targetId: targetId,
        targetUsername: log.targetUsername,
        targetAvatar: log.targetAvatar,
        changes: { 
          undoneLogId: logId,
          revertedFields: Object.keys(undoUpdates)
        }
      });
    } else if (log.action === "PLAYER_DELETE") {
      // Restore player
      await Player.findOneAndUpdate({ discordId: targetId }, { $set: { isDeleted: false } });

      // Create a new log entry for the undo action
      await ActivityLog.create({
        adminId: req.user.id,
        adminUsername: req.user.username,
        adminAvatar: req.user.avatar,
        action: "UNDO_DELETE",
        targetId: targetId,
        targetUsername: log.targetUsername,
        targetAvatar: log.targetAvatar,
        changes: { 
          restoredLogId: logId
        }
      });
    }

    res.json({ success: true, message: "Action undone successfully." });
  } catch (error) {
    console.error("[Undo API Error]:", error);
    res.status(500).json({ error: "Internal server error performing undo." });
  }
});

module.exports = router;
