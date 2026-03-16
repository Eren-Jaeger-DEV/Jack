const bot = require("../../bot/index");

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const cors = require("cors");

const app = express();

/* CORS */

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3001"],
  credentials: true,
  methods: ["GET","POST"],
  allowedHeaders: ["Content-Type"]
}));

/* SESSION */

app.use(session({
  secret: process.env.SESSION_SECRET || "jackbotsecret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: "lax"
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

/* DISCORD LOGIN */

app.get("/api/auth/login",
  passport.authenticate("discord")
);

/* DISCORD CALLBACK */

app.get("/api/auth/callback",
  passport.authenticate("discord", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect(process.env.DASHBOARD_FRONTEND_URL || "http://localhost:5173/");
  }
);

/* USER API */

app.get("/api/user", (req, res) => {

  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  res.json(req.user);

});

/* SERVER INFO API */

app.get("/api/server", (req, res) => {

  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const guildId = process.env.GUILD_ID || "1341978655437619250";

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

const verifyGuildPermission = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const guildId = req.params.guildId || req.body.guildId;
  if (!guildId) return next(); // Skip if no guildId in params/body (let specific routes handle it)

  // Verify user has MANAGE_GUILD (0x20)
  const userGuild = (req.user.guilds || []).find(g => g.id === guildId);
  if (!userGuild || (userGuild.permissions & 0x20) !== 0x20) {
    return res.status(403).json({ error: "You do not have permission to manage this server." });
  }

  // Verify bot is in the guild
  if (!bot.guilds.cache.has(guildId)) {
    return res.status(404).json({ error: "Jack Bot is not present in this server." });
  }

  next();
};

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
const welcomePath = path.join(__dirname, "../../config/welcome.json");

/* GET WELCOME SETTINGS */

app.get("/api/welcome", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(welcomePath));
    res.json(data);
  } catch (err) {
    res.json({});
  }
});

/* UPDATE WELCOME SETTINGS */

app.post("/api/welcome", express.json(), (req, res) => {
  try {
    fs.writeFileSync(
      welcomePath,
      JSON.stringify(req.body, null, 2)
    );
    res.json({ status: "saved" });
  } catch (err) {
    res.status(500).json({ error: "Failed to save" });
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

  const pluginFolders = fs.readdirSync(pluginsPath).filter(file => {
    return fs.statSync(path.join(pluginsPath, file)).isDirectory();
  });

  const plugins = pluginFolders.map(folder => {
    return { name: folder };
  });

  res.json(plugins);
});

app.post("/api/plugins/toggle", express.json(), verifyGuildPermission, async (req, res) => {
  const { guildId, plugin, enabled } = req.body;
  
  if (!guildId || !plugin || typeof enabled !== "boolean") {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const GuildConfig = require("../../bot/database/models/GuildConfig");
    
    // Find or create
    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
      config = new GuildConfig({ guildId });
    }

    // Set the specific plugin toggle
    if (!config.plugins) {
      config.plugins = {};
    }
    
    // We cannot just set config.plugins[plugin] = enabled easily if we don't specify it in the model schema as a Map,
    // but we defined it explicitly, so we can do this.
    config.plugins[plugin] = enabled;
    
    await config.save();
    
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
      activePlugins = Object.values(config.plugins).filter(v => v === true).length;
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

/* START SERVER */

app.listen(3000, () => {
  console.log("Dashboard backend running on port 3000");
});