const express = require("express");
const router = express.Router();
const Player = require("../../../bot/database/models/Player");

router.get("/stats", async (req, res) => {
  try {
    // 1. Fetch only verified clan members natively from MongoDB
    const clanMembers = await Player.find({ isClanMember: true }).lean();

    // 2. Compute the analytics logic flawlessly
    const total = clanMembers.length;
    let registered = 0;

    for (const member of clanMembers) {
      if (member.registered) registered++;
    }

    const unregistered = total - registered;
    
    // Safety check div-by-zero
    let percentage = 0;
    if (total > 0) {
      percentage = parseFloat(((registered / total) * 100).toFixed(2));
    }

    // 3. Return secure identical JSON structure
    res.json({
      total,
      registered,
      unregistered,
      percentage
    });

  } catch (error) {
    console.error("[Clan Analytics API Error]:", error);
    res.status(500).json({ error: "Internal server error fetching clan statistics." });
  }
});

router.get("/unregistered", async (req, res) => {
  try {
    const unregisteredMembers = await Player.find({ isClanMember: true, registered: false })
      .select("discordId -_id")
      .lean();

    res.json({
      total: unregisteredMembers.length,
      members: unregisteredMembers
    });
  } catch (error) {
    console.error("[Clan Unregistered API Error]:", error);
    res.status(500).json({ error: "Internal server error fetching unregistered members." });
  }
});

module.exports = router;
