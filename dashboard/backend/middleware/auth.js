const Player = require("../../../bot/database/models/Player");

const ROLE_LEVELS = {
  owner: 3,
  manager: 3,
  admin: 2,
  contributor: 1,
  none: 0
};

const requireRole = (minRole) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const discordId = req.user.discordId || req.user.id;
    const OWNER_ID = process.env.OWNER_ID;


    // 1. Hard Bypass for Bot Owner (Always Owner Role)
    if (discordId === OWNER_ID) {
      return next();
    }

    try {
      const player = await Player.findOne({ discordId: discordId }).lean();
      const userRole = player ? player.role : "none";
      const userLevel = ROLE_LEVELS[userRole] || 0;
      const requiredLevel = ROLE_LEVELS[minRole] || 0;

      if (userLevel >= requiredLevel) {
        return next();
      }

      console.warn(`[RBAC] Access Denied: User ${discordId} (Role: ${userRole}) attempted ${req.originalUrl} requiring ${minRole}`);
      res.status(403).json({ 
        error: "Forbidden: Higher role required.",
        requiredRole: minRole,
        yourRole: userRole
      });
    } catch (err) {
      console.error("[RBAC Error]:", err);
      res.status(500).json({ error: "Server error checking permissions." });
    }
  };
};

module.exports = { requireRole, ROLE_LEVELS };
