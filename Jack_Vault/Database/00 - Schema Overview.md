# 🗃️ Schema Overview

The Jack bot uses **MongoDB** with the **Mongoose** ODM for its data storage. The database is organized into several key domains.

## 🗺️ Data Domains

### 🛡️ Guild Configuration
Notes focused on per-server settings, feature toggles, and role/channel mapping.
- [[GuildConfig]]: The master configuration for every server.

### 👤 User & leveling
Notes focused on individual player data, experience points, and profiles.
- [[Player]]: The global user profile.
- [[Level]]: XP and leveling history.
- [[Afk]]: Presence and AFK status tracking.

### ⚔️ Clans & Competition
Notes focused on team-based features and wars.
- [[Clan]]: Clan identities and membership.
- [[FosterPairing]]: Mentor/Rookie relationships.

### 📊 Logs & Metrics
Notes focused on tracking bot usage and server activity.
- [[ActivityLog]]: Chronological event log.
- [[CommandUsage]]: Statistics on command popularity.

---

> [!TIP]
> Each model note includes a **Field Reference** that explains every single property in the database schema.
