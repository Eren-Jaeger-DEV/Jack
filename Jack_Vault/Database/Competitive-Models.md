# ⚔️ Competitive & Match Models

These models power the bot's clan-based warfare, tournament registration, and seasonal rankings.

---

## [[Battle]]
Tracks active clan-vs-clan battles and point contributions.

### 📋 Schema Fields
- `guildId`: The server hosting the battle.
- `active`: Boolean status.
- `players`: An array of user data including `ign`, `todayPoints`, and `totalPoints`.

---

## [[IntraRegistration]]
Manages internal clan tournament registrations and threads.

### 📋 Schema Fields
- `threadId`: The Discord thread where recruitment happens.
- `participants`: List of registered members with their `ign` and registration timestamp.
- `endTime`: When registration automatically closes.

---

## [[Season]]
Tracks archival and active data for seasonal leaderboards.

### 📋 Schema Fields
- `active`: Whether the season is currently accruing points.
- `leaderboardMessageId`: The persistent embed showing the current rankings.

---
**Related Documents:** [[00 - Schema Overview]], [[Clan-Battle]], [[Intra-Match]], [[Seasonal-Synergy]]
