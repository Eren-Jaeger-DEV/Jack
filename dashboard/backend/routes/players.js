const express = require("express");
const router = express.Router();
const Player = require("../../../bot/database/models/Player");
const ActivityLog = require("../../../bot/database/models/ActivityLog");
const { requireRole } = require("../middleware/auth");

// Pagination and Search for all players
router.get("/players", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    let query = { isDeleted: false };
    if (search) {
      query = {
        isDeleted: false,
        $or: [
          { discordId: { $regex: search, $options: "i" } },
          { username: { $regex: search, $options: "i" } },
          { ign: { $regex: search, $options: "i" } },
        ]
      };
    }

    const players = await Player.find(query)
      .select("discordId username ign synergyPoints registered isClanMember")
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Player.countDocuments(query);

    res.json({
      data: players,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error("[Players API Error]:", error);
    res.status(500).json({ error: "Internal server error fetching players." });
  }
});

// Get a single player
router.get("/player/:id", async (req, res) => {
  try {
    const player = await Player.findOne({ discordId: req.params.id, isDeleted: false }).lean();
    if (!player) {
      return res.status(404).json({ error: "Player not found or has been deleted." });
    }
    res.json(player);
  } catch (error) {
    console.error("[Player API Error]:", error);
    res.status(500).json({ error: "Internal server error fetching player details." });
  }
});

/* MIDDLEWARE REMOVED: Using centralized requireRole from ../middleware/auth */

// Update a player
router.patch("/player/:id", requireRole("admin"), async (req, res) => {
  try {
    const { ign, synergyPoints, registered, isClanMember } = req.body;
    
    // Validation
    if (synergyPoints !== undefined && typeof synergyPoints !== "number") {
      return res.status(400).json({ error: "synergyPoints must be a number." });
    }
    if (ign !== undefined && typeof ign !== "string") {
      return res.status(400).json({ error: "ign must be a string." });
    }

    const oldPlayer = await Player.findOne({ discordId: req.params.id }).lean();
    if (!oldPlayer) {
      return res.status(404).json({ error: "Player not found." });
    }

    const updates = {};
    const changes = {};

    if (ign !== undefined && oldPlayer.ign !== ign) {
      updates.ign = ign;
      changes.ign = { from: oldPlayer.ign, to: ign };
    }
    if (synergyPoints !== undefined && oldPlayer.synergyPoints !== synergyPoints) {
      updates.synergyPoints = synergyPoints;
      changes.synergyPoints = { from: oldPlayer.synergyPoints, to: synergyPoints };
    }
    if (registered !== undefined && !!oldPlayer.registered !== Boolean(registered)) {
      updates.registered = Boolean(registered);
      changes.registered = { from: !!oldPlayer.registered, to: Boolean(registered) };
    }
    if (isClanMember !== undefined && !!oldPlayer.isClanMember !== Boolean(isClanMember)) {
      updates.isClanMember = Boolean(isClanMember);
      changes.isClanMember = { from: !!oldPlayer.isClanMember, to: Boolean(isClanMember) };
    }

    if (Object.keys(changes).length === 0) {
      return res.json(oldPlayer); // No changes made
    }

    const updatedPlayer = await Player.findOneAndUpdate(
      { discordId: req.params.id },
      { $set: updates },
      { new: true } // Return the updated document
    ).lean();

    // Log the activity
    await ActivityLog.create({
      adminId: req.user.id,
      adminUsername: req.user.username,
      adminAvatar: req.user.avatar,
      action: "PLAYER_UPDATE",
      targetId: req.params.id,
      targetUsername: oldPlayer.username,
      targetAvatar: oldPlayer.avatar,
      changes: changes
    });

    res.json(updatedPlayer);
  } catch (error) {
    console.error("[Player Patch API Error]:", error);
    res.status(500).json({ error: "Internal server error updating player." });
  }
});

// Soft Delete a player
router.delete("/player/:id", requireRole("manager"), async (req, res) => {
  try {
    const deletedPlayer = await Player.findOneAndUpdate(
      { discordId: req.params.id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );

    if (!deletedPlayer) {
      return res.status(404).json({ error: "Player not found or already deleted." });
    }

    // Log the activity
    await ActivityLog.create({
      adminId: req.user.id,
      adminUsername: req.user.username,
      adminAvatar: req.user.avatar,
      action: "PLAYER_DELETE",
      targetId: req.params.id,
      targetUsername: deletedPlayer.username,
      targetAvatar: deletedPlayer.avatar,
      changes: { deleted: true }
    });

    res.json({ success: true, message: "Player soft-deleted successfully." });
  } catch (error) {
    console.error("[Player Delete API Error]:", error);
    res.status(500).json({ error: "Internal server error deleting player." });
  }
});

// Get all deleted players (Trash)
router.get("/players/deleted", requireRole("admin"), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { isDeleted: true };
    const players = await Player.find(query)
      .select("discordId username ign synergyPoints registered isClanMember")
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Player.countDocuments(query);

    res.json({
      data: players,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("[Deleted Players API Error]:", error);
    res.status(500).json({ error: "Internal server error fetching deleted players." });
  }
});

// Restore a deleted player
router.post("/player/:id/restore", requireRole("admin"), async (req, res) => {
  try {
    const restoredPlayer = await Player.findOneAndUpdate(
      { discordId: req.params.id, isDeleted: true },
      { isDeleted: false },
      { new: true }
    );

    if (!restoredPlayer) {
      return res.status(404).json({ error: "Deleted player not found." });
    }

    // Log the activity
    await ActivityLog.create({
      adminId: req.user.id,
      adminUsername: req.user.username,
      adminAvatar: req.user.avatar,
      action: "UNDO_DELETE",
      targetId: req.params.id,
      targetUsername: restoredPlayer.username,
      targetAvatar: restoredPlayer.avatar,
      changes: { restored: true }
    });

    res.json({ success: true, message: "Player restored successfully." });
  } catch (error) {
    console.error("[Player Restore API Error]:", error);
    res.status(500).json({ error: "Internal server error restoring player." });
  }
});

// Permanent Delete a player (Only from Trash)
router.delete("/player/:id/permanent", requireRole("manager"), async (req, res) => {
  try {
    // Strict check: must exist AND be soft-deleted
    const player = await Player.findOne({ discordId: req.params.id, isDeleted: true });

    if (!player) {
      return res.status(404).json({ error: "Player not found in trash bin. Permanent deletion aborted." });
    }

    // Permanently remove
    await Player.findOneAndDelete({ discordId: req.params.id });

    // Log the activity
    await ActivityLog.create({
      adminId: req.user.id,
      adminUsername: req.user.username,
      adminAvatar: req.user.avatar,
      action: "PERMANENT_DELETE",
      targetId: req.params.id,
      targetUsername: player.username,
      targetAvatar: player.avatar,
      changes: { permanent: true }
    });

    res.json({ success: true, message: "Player permanently deleted from database." });
  } catch (error) {
    console.error("[Player Permanent Delete API Error]:", error);
    res.status(500).json({ error: "Internal server error performing permanent delete." });
  }
});

module.exports = router;
