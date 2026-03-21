require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const bot = require("../../bot/index");
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const cors = require("cors");

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
  methods: ["GET","POST"],
  allowedHeaders: ["Content-Type"]
}));

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
    const OWNER_ID = process.env.OWNER_ID || "771611262022844427";
    const GUILD_ID = process.env.GUILD_ID || "1407954932623347783";

    console.log("[RBAC Sync] User:", req.user.username, "(", discordId, ")");

    let highestRole = "none";

    // 1. Role Sync from Discord Guild
    if (discordId === OWNER_ID) {
      highestRole = "owner";
    } else if (bot.isReady()) {
      const guild = bot.guilds.cache.get(GUILD_ID);
      if (guild) {
        try {
          const member = await guild.members.fetch(discordId);
          if (member) {
            const r = member.roles.cache;
            if (r.has("1407978936276746251")) highestRole = "owner";
            else if (r.has("1477874246972604588")) highestRole = "manager";
            else if (r.has("1477874711886303263")) highestRole = "admin";
            else if (r.has("1477874451277287454")) highestRole = "contributor";
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

/* START SERVER */

app.listen(3000, () => {
  console.log("Dashboard backend running on port 3000");
});