const bot = require("../../bot/index");

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const cors = require("cors");

const app = express();

/* CORS */

app.use(cors({
  origin: "http://localhost:3001",
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
  callbackURL: process.env.DASHBOARD_CALLBACK_URL || "http://localhost:3000/auth/discord/callback",
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

app.get("/auth/discord",
  passport.authenticate("discord")
);

/* DISCORD CALLBACK */

app.get("/auth/discord/callback",
  passport.authenticate("discord", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect(process.env.DASHBOARD_FRONTEND_URL || "http://localhost:3001/dashboard");
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

const fs = require("fs");
const welcomePath = "../../config/welcome.json";

/* GET WELCOME SETTINGS */

app.get("/api/welcome", (req, res) => {

  const data = JSON.parse(fs.readFileSync(welcomePath));

  res.json(data);

});


/* UPDATE WELCOME SETTINGS */

app.post("/api/welcome", express.json(), (req, res) => {

  fs.writeFileSync(
    welcomePath,
    JSON.stringify(req.body, null, 2)
  );

  res.json({ status: "saved" });

});

/* START SERVER */

app.listen(3000, () => {
  console.log("Dashboard backend running on port 3000");
});