# 📡 Dashboard REST API

The Express backend exposes a protected RESTful API for the React frontend to communicate with the bot instance and the MongoDB database safely.

## 🔐 Authentication Middleware
All protected routes are wrapped in an authorization middleware:
- **`verifyGuildPermission`**: Intercepts the JWT/Discord Oauth token present in the headers, verifies the user payload against the Discord API, and ensures that the user actively holds the `Administrator` permission bit inside the requested Guild ID. If verification fails, a `403 Forbidden` response is returned.

---

## 🛣️ API Endpoints

### 1. `GET /api/guilds`
Retrieves a localized list of Discord servers that both the Bot and the logged-in User share, where the User is an Administrator. 
- **Response**: Array of Guild objects (id, name, icon URL).

### 2. `GET /api/clan`
Fetches competitive analytics for the active guild.
- **Query Params**: `?guildId=[id]`
- **Response**: Returns the summarized array of registered clan profiles, their Battle Points (Synergy), and any active scrim match states.

### 3. `GET /api/foster`
Streams back the live status of the mentor/rookie Foster Program.
- **Response**: Array of current paired sets (Mentor Discord ID -> Rookie Discord ID) and the program's phase (Phase 1, Phase 2, etc).

### 4. `POST /api/settings`
The heavy-lifter endpoint for plugin configuration.
- **Body**: `{ guildId: string, feature: string, enabled: boolean, data: object }`
- **Behavior**: Saves the new toggle state into the `GuildConfig` database model and directly mutates the bot's runtime cache immediately (hot-reload) to reflect the changes in the server without restarting.

---
**Related Documents:** [[Dashboard-Architecture]], [[GuildConfig]]
