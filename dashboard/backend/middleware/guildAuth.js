const bot = require("../../../bot/index");

const verifyGuildPermission = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const guildId = req.params.guildId || req.body.guildId;
  if (!guildId) return next(); 

  const userGuild = (req.user.guilds || []).find(g => g.id === guildId);
  if (!userGuild || (userGuild.permissions & 0x20) !== 0x20) {
    return res.status(403).json({ error: "You do not have permission to manage this server." });
  }

  // Verify bot is in the guild
  if (!bot.guilds.cache.has(guildId)) {
    console.warn(`[Auth] Bot not in guild ${guildId}. Cache size: ${bot.guilds.cache.size}`);
    return res.status(404).json({ error: "Jack Bot is not present in this server." });
  }

  next();
};

module.exports = { verifyGuildPermission };
