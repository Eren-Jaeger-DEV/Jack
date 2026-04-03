require("dotenv").config({ path: require("path").join(__dirname, "../../.env"), quiet: true });
const bot = require("../../bot/index");
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const cors = require("cors");
const configManager = require("../../bot/utils/configManager");

const app = express();

// Trust Nginx reverse proxy so secure cookies and callbacks resolve to HTTPS correctly
app.set("trust proxy", 1);

/* CORS */

app.use(cors({
  origin: [
    "http://localhost:5173", 
    "http://localhost:3001", 
    "https://dashboard.mceclipsehub.online",
    "https://devdashboard.mceclipsehub.online"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type"]
}));

app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  next();
});

/* SESSION */

app.use(session({
  secret: process.env.SESSION_SECRET || "jackbotsecret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV !== "development", // Secure must be true for SameSite=none
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "development" ? "lax" : "none"
  }
}));

app.use(passport.initialize());
app.use(passport.session());

/* PASSPORT */

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.DASHBOARD_CALLBACK_URL || "http://localhost:3000/api/auth/callback",
  scope: ["identify", "guilds"]
},
(accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

/* TEST */

app.get("/test", (req, res) => {
  res.send("Backend works");
});

app.get("/api/test-session", (req, res) => {
  req.session.test = "test-value-123";
  res.json({ message: "Session Set!", sessionID: req.sessionID });
});

app.get("/api/test-session2", (req, res) => {
  res.json({ sessionID: req.sessionID, testValue: req.session.test || null });
});

/* DISCORD LOGIN */

app.get("/api/auth/login",
  passport.authenticate("discord")
);

/* DISCORD CALLBACK */

app.get("/api/auth/callback",
  (req, res, next) => {
    passport.authenticate("discord", (err, user, info) => {
      if (err) {
        console.error("Discord Auth System Error:", err);
        return res.status(500).send(`Authentication Error: ${err.message || err}`);
      }
      if (!user) {
        console.error("Discord Auth Rejected (No User):", info);
        return res.status(401).send(`Authentication Failed: ${JSON.stringify(info)}`);
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("Express Login Error:", loginErr);
          return res.status(500).send(`Login Error: ${loginErr.message}`);
        }
        res.redirect(process.env.DASHBOARD_FRONTEND_URL || "http://localhost:5173/");
      });
    })(req, res, next);
  }
);

/* USER API */

app.get("/api/user", async (req, res) => {
  res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.header("Expires", "-1");
  res.header("Pragma", "no-cache");

  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const Player = require("../../bot/database/models/Player");
    const discordId = req.user.discordId || req.user.id;
    const OWNER_ID = process.env.OWNER_ID;
    const GUILD_ID = process.env.GUILD_ID;

    console.log("[RBAC Sync] User:", req.user.username, "(", discordId, ")");

    let highestRole = "none";

    // 1. Role Sync from Discord Guild
    if (OWNER_ID && discordId === OWNER_ID) {
      highestRole = "owner";
    } else if (bot.isReady() && GUILD_ID) {
      const guild = bot.guilds.cache.get(GUILD_ID);
      if (guild) {
        try {
          const member = await guild.members.fetch(discordId);
          if (member) {
            const config = await configManager.getGuildConfig(GUILD_ID);
            const s = config?.settings || {};
            const r = member.roles.cache;

            if (s.ownerRoleId && r.has(s.ownerRoleId)) highestRole = "owner";
            else if (s.managerRoleId && r.has(s.managerRoleId)) highestRole = "manager";
            else if (s.adminRoleId && r.has(s.adminRoleId)) highestRole = "admin";
            else if (s.contributorRoleId && r.has(s.contributorRoleId)) highestRole = "contributor";
          }
        } catch (e) {
          console.warn(`[RBAC Sync] member.fetch fail for ${discordId}`);
        }
      }
    }

    // 2. Database Sync
    let player = await Player.findOne({ discordId: discordId });

    if (!player) {
      console.log("[RBAC Sync] New user discovered, creating record with role:", highestRole);
      player = await Player.create({
        discordId: discordId,
        username: req.user.username,
        avatar: req.user.avatar,
        role: highestRole
      });
    } else {
      // Update role and identity
      const updates = { 
        username: req.user.username, 
        avatar: req.user.avatar 
      };
      
      // Only upgrade role if discord has a valid high role, or sync it
      if (highestRole !== "none") {
        updates.role = highestRole;
      }

      await Player.updateOne({ discordId: discordId }, updates);
      player.role = updates.role || player.role;
    }

    res.json({
      ...req.user,
      role: player.role,
      roleLevel: (require("./middleware/auth").ROLE_LEVELS)[player.role] || 0
    });
  } catch (err) {
    console.error("[RBAC Sync Error]:", err);
    res.json(req.user);
  }
});

/* SERVER INFO API */

app.get("/api/server", (req, res) => {

  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const guildId = process.env.GUILD_ID;


  if (!bot.isReady()) {
    return res.json({
      name: "Starting...",
      members: 0,
      channels: 0,
      bot: "Starting"
    });
  }

  const guild = bot.guilds.cache.get(guildId);

  if (!guild) {
    return res.json({
      name: "Server not found",
      members: 0,
      channels: 0,
      bot: "Offline"
    });
  }

  res.json({
    name: guild.name,
    members: guild.memberCount,
    channels: guild.channels.cache.size,
    bot: "Online"
  });

});

/* AUTH MIDDLEWARE */

const { verifyGuildPermission } = require("./middleware/guildAuth");

/* GUILDS API */

app.get("/api/guilds", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  if (!bot.isReady()) {
    return res.status(503).json({ error: "Bot is starting" });
  }

  // Filter guilds where user has MANAGE_GUILD (0x20) AND bot is present
  const userGuilds = req.user.guilds || [];
  
  const manageableGuilds = userGuilds
    .filter(g => (g.permissions & 0x20) === 0x20 && bot.guilds.cache.has(g.id))
    .map(g => {
      const guild = bot.guilds.cache.get(g.id);
      return {
        id: g.id,
        name: g.name,
        botPresent: true,
        iconUrl: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.${g.icon.startsWith('a_') ? 'gif' : 'png'}` : null,
        memberCount: guild.memberCount
      };
    });

  res.json(manageableGuilds);
});

const fs = require("fs");
const path = require("path");
/* GET WELCOME SETTINGS */

app.get("/api/welcome", async (req, res) => {
  const guildId = req.query.guildId || process.env.GUILD_ID;

  try {
    const GuildConfig = require("../../bot/database/models/GuildConfig");
    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
      config = await GuildConfig.create({ guildId });
    }
    res.json({
      enabled: config.greetingData?.welcomeEnabled || false,
      channelId: config.greetingData?.welcomeChannelId || '',
      message: config.greetingData?.welcomeMessage || '',
      imageCardEnabled: !!config.greetingData?.welcomeImage,
      backgroundImageUrl: config.greetingData?.welcomeImage || ''
    });
  } catch (err) {
    console.error("Error fetching welcome config:", err);
    res.json({});
  }
});

/* UPDATE WELCOME SETTINGS */

app.post("/api/welcome", express.json(), async (req, res) => {
  const guildId = req.body.guildId || process.env.GUILD_ID;

  try {
    const payload = req.body;
    const greetingData = {
      welcomeEnabled: payload.enabled,
      welcomeChannelId: payload.channelId,
      welcomeMessage: payload.message,
      welcomeImage: payload.imageCardEnabled ? payload.backgroundImageUrl : ''
    };
    await configManager.updateGuildConfig(guildId, { greetingData });
    res.json({ status: "saved" });
  } catch (err) {
    console.error("Error saving welcome config:", err);
    res.status(500).json({ error: "Failed to save" });
  }
});

/* MODERATION SETTINGS API */

app.get("/api/moderation", async (req, res) => {
  const guildId = req.query.guildId || process.env.GUILD_ID;
  try {
    const GuildConfig = require("../../bot/database/models/GuildConfig");
    let config = await GuildConfig.findOne({ guildId });
    if (!config) config = await GuildConfig.create({ guildId });
    
    res.json({
      antiLink: config.moderation?.antiLink || false,
      antiSpam: config.moderation?.antiSpam || false,
      blacklistedWords: config.moderation?.blacklistedWords || [],
      maxMentions: config.moderation?.maxMentions || 5,
      muteRoleId: config.moderation?.muteRoleId || '',
      modLogChannelId: config.settings?.modLogChannelId || ''
    });
  } catch (err) {
    console.error("Error fetching moderation settings:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

app.post("/api/moderation", express.json(), async (req, res) => {
  const guildId = req.body.guildId || process.env.GUILD_ID;
  try {
    const { antiLink, antiSpam, blacklistedWords, maxMentions, muteRoleId, modLogChannelId } = req.body;
    
    const updates = {
      "moderation.antiLink": antiLink,
      "moderation.antiSpam": antiSpam,
      "moderation.blacklistedWords": blacklistedWords,
      "moderation.maxMentions": maxMentions,
      "moderation.muteRoleId": muteRoleId,
      "settings.modLogChannelId": modLogChannelId
    };

    await configManager.updateGuildConfig(guildId, updates);
    res.json({ status: "success" });
  } catch (err) {
    console.error("Error saving moderation settings:", err);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

/* PLUGINS API */

app.get("/api/plugins", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const pluginsPath = path.join(__dirname, "../../plugins");
  if (!fs.existsSync(pluginsPath)) {
    return res.json([]);
  }

  const PLUGIN_METADATA = {
    admin: { category: "Moderation", icon: "Shield" },
    audit: { category: "Moderation", icon: "Activity" },
    moderation: { category: "Moderation", icon: "Gavel", hasSettings: true },
    'member-classification': { category: "Moderation", icon: "UserCheck" },
    utility: { category: "Utility", icon: "Wrench" },
    roles: { category: "Utility", icon: "UserPlus", hasSettings: true },
    emoji: { category: "Utility", icon: "Smile" },
    sticker: { category: "Utility", icon: "Image" },
    tempvc: { category: "Utility", icon: "Mic" },
    channelManagement: { category: "Utility", icon: "Hash" },
    tickets: { category: "Utility", icon: "MessageSquare", hasSettings: true },
    triggers: { category: "Utility", icon: "Zap", hasSettings: true },
    leveling: { category: "Engagement", icon: "TrendingUp", hasSettings: true },
    greeting: { category: "Engagement", icon: "Users", hasSettings: true },
    counting: { category: "Engagement", icon: "Hash" },
    'seasonal-synergy': { category: "Engagement", icon: "BarChart" },
    clan: { category: "Engagement", icon: "Users", hasSettings: true },
    'clan-battle': { category: "Engagement", icon: "Sword" },
    fun: { category: "Fun", icon: "Gamepad" },
    market: { category: "Fun", icon: "ShoppingCart" },
    packs: { category: "Fun", icon: "Package" },
    'foster-program': { category: "Fun", icon: "Heart" },
    teamup: { category: "Fun", icon: "Users" },
    'intra-match': { category: "Fun", icon: "Target" }
  };

  const pluginFolders = fs.readdirSync(pluginsPath).filter(file => {
    const fullPath = path.join(pluginsPath, file);
    return fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, "plugin.json"));
  });

  const plugins = pluginFolders.map(folder => {
    const manifestPath = path.join(pluginsPath, folder, "plugin.json");
    const meta = PLUGIN_METADATA[folder] || { category: "Miscellaneous", icon: "Package" };
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      return {
        id: folder,
        name: manifest.name || folder,
        description: manifest.description || "No description provided.",
        version: manifest.version || "1.0.0",
        category: meta.category,
        icon: meta.icon,
        hasSettings: meta.hasSettings || false
      };
    } catch (e) {
      return { 
        id: folder, 
        name: folder, 
        description: "Error reading plugin manifest.",
        category: meta.category,
        icon: meta.icon,
        hasSettings: false
      };
    }
  });

  res.json(plugins);
});

app.post("/api/plugins/toggle", express.json(), verifyGuildPermission, async (req, res) => {
  const { guildId, plugin, enabled } = req.body;
  
  if (!guildId || !plugin || typeof enabled !== "boolean") {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Set the specific plugin toggle
    const updates = {};
    updates[`plugins.${plugin}`] = enabled;
    
    await configManager.updateGuildConfig(guildId, updates);
    
    const config = await configManager.getGuildConfig(guildId);
    res.json({ status: "success", plugins: config.plugins });
  } catch (err) {
    console.error("Error toggling plugin:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/guilds/:guildId/config", verifyGuildPermission, async (req, res) => {
  const { guildId } = req.params;

  try {
    const GuildConfig = require("../../bot/database/models/GuildConfig");
    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
      config = new GuildConfig({ guildId });
      await config.save();
    }
    res.json(config);
  } catch (err) {
    console.error("Error fetching config:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/guilds/:guildId/config", express.json(), verifyGuildPermission, async (req, res) => {
  const { guildId } = req.params;
  const updates = req.body;

  try {
    const config = await configManager.updateGuildConfig(guildId, updates);
    res.json(config);
  } catch (err) {
    console.error("Error updating config:", err);
    res.status(500).json({ error: "Failed to update configuration" });
  }
});

app.get("/api/guilds/:guildId/channels", verifyGuildPermission, async (req, res) => {
  const { guildId } = req.params;
  const guild = bot.guilds.cache.get(guildId);
  if (!guild) return res.status(404).json({ error: "Guild not found" });

  try {
    const fetchedChannels = await guild.channels.fetch();
    const channels = fetchedChannels
      .filter(c => c.type === 0) // GuildText
      .map(c => ({ id: c.id, name: c.name }));
    
    console.log(`[API] Fetched ${fetchedChannels.size} channels for guild ${guildId}, filtered to ${channels.length} text channels.`);
    res.json(channels);
  } catch (err) {
    console.error("Error fetching channels:", err);
    res.status(500).json({ error: "Failed to fetch channels from Discord" });
  }
});

app.get("/api/guilds/:guildId/roles", verifyGuildPermission, async (req, res) => {
  const { guildId } = req.params;
  const guild = bot.guilds.cache.get(guildId);
  if (!guild) return res.status(404).json({ error: "Guild not found" });

  try {
    const fetchedRoles = await guild.roles.fetch();
    const roles = fetchedRoles
      .filter(r => r.name !== "@everyone")
      .map(r => ({ id: r.id, name: r.name, color: r.hexColor }));
    
    console.log(`[API] Fetched ${fetchedRoles.size} roles for guild ${guildId}, filtered to ${roles.length} roles.`);
    res.json(roles);
  } catch (err) {
    console.error("Error fetching roles:", err);
    res.status(500).json({ error: "Failed to fetch roles from Discord" });
  }
});

/* STATS API */

app.get("/api/guilds/:guildId/stats", verifyGuildPermission, async (req, res) => {
  const { guildId } = req.params;
  const guild = bot.guilds.cache.get(guildId);

  try {
    const GuildConfig = require("../../bot/database/models/GuildConfig");
    const config = await GuildConfig.findOne({ guildId });
    
    // Count active plugins
    let activePlugins = 0;
    if (config && config.plugins) {
      // config.plugins is a Map, convert to values array
      activePlugins = Array.from(config.plugins.values()).filter(v => v === true).length;
    }

    res.json({
      memberCount: guild.memberCount,
      activePlugins: activePlugins,
      commandCount: bot.commands.size
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

/* ANALYTICS API */

app.get("/api/guilds/:guildId/analytics", verifyGuildPermission, async (req, res) => {
  const { guildId } = req.params;

  try {
    const CommandUsage = require("../../bot/database/models/CommandUsage");
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const commandsToday = await CommandUsage.countDocuments({
      guildID: guildId,
      timestamp: { $gte: startOfToday }
    });

    const activeUsers = await CommandUsage.distinct("userID", {
      guildID: guildId,
      timestamp: { $gte: startOfToday }
    });

    const mostUsed = await CommandUsage.aggregate([
      { $match: { guildID: guildId } },
      { $group: { _id: "$commandName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    res.json({
      commandsExecutedToday: commandsToday,
      activeUsers: activeUsers.length,
      mostUsedPlugin: mostUsed.length > 0 ? mostUsed[0]._id : "None"
    });
  } catch (err) {
    console.error("Analytics Error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

/* PLUGIN SETTINGS API */

app.get("/api/guilds/:guildId/plugin/:pluginName", verifyGuildPermission, async (req, res) => {
  const { guildId, pluginName } = req.params;

  try {
    const GuildConfig = require("../../bot/database/models/GuildConfig");
    const config = await GuildConfig.findOne({ guildId });
    
    const settings = (config && config.pluginSettings && config.pluginSettings.get(pluginName)) || {};
    
    // If it's leveling, we might want to include available channels
    let extraData = {};
    if (pluginName === 'leveling') {
      const guild = bot.guilds.cache.get(guildId);
      extraData.channels = guild.channels.cache
        .filter(c => c.type === 0) // Text channels
        .map(c => ({ id: c.id, name: c.name }));
    }

    res.json({ settings, ...extraData });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch plugin settings" });
  }
});

app.post("/api/guilds/:guildId/plugin/:pluginName", express.json(), verifyGuildPermission, async (req, res) => {
  const { guildId, pluginName } = req.params;
  const newSettings = req.body;

  try {
    const GuildConfig = require("../../bot/database/models/GuildConfig");
    let config = await GuildConfig.findOne({ guildId });
    if (!config) config = new GuildConfig({ guildId });

    if (!config.pluginSettings) config.pluginSettings = new Map();
    
    config.pluginSettings.set(pluginName, newSettings);
    await config.save();

    res.json({ status: "success", settings: newSettings });
  } catch (err) {
    res.status(500).json({ error: "Failed to save plugin settings" });
  }
});

/* CLAN ANALYTICS ENDPOINT */

const clanRoute = require("./routes/clan");
app.use("/api/clan", clanRoute);

/* PLAYER MANAGEMENT ENDPOINTS */

const playersRoute = require("./routes/players");
app.use("/api", playersRoute);

/* ACTIVITY LOGS ENDPOINT */

const logsRoute = require("./routes/logs");
app.use("/api", logsRoute);

/* SYSTEM INSIGHTS ENDPOINT */

const insightsRoute = require("./routes/insights");
app.use("/api", insightsRoute);

/* FOSTER PROGRAM ENDPOINT */
const fosterRoute = require("./routes/foster");
app.use("/api/foster", fosterRoute);

/* SYNERGY ENDPOINT */
const synergyRoute = require("./routes/synergy");
app.use("/api/synergy", synergyRoute);

/* AI ENDPOINT */
const aiRoute = require("./routes/ai");
app.use("/api/ai", aiRoute);

/* BATTLES ENDPOINT */
const battlesRoute = require("./routes/battles");
app.use("/api/battles", battlesRoute);

/* TRIGGER ENDPOINT */
const triggersRoute = require("./routes/triggers");
app.use("/api", triggersRoute);

/* START SERVER */

module.exports = { app, verifyGuildPermission };

app.listen(3000, () => {
  // Silenced
});