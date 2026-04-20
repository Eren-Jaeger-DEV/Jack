---
id: player
model: Player
category: Users
status: Core
---

# 👤 Player

The `Player` model represents a user's global profile within the bot's network. It tracks clan membership, identity verification, and achievements.

## 📋 Schema Fields

### 🆔 Identity
- `discordId`: Unique Discord user ID.
- `discordName`: Current Discord username.
- `username` / `avatar`: Display name and profile picture URL.
- `ign` / `uid`: In-game name and ID for linkage.

### 🎖️ Permissions & Status
- `role`: Internal hierarchical level (`owner`, `manager`, `admin`, `contributor`, `none`).
- `isClanMember`: Boolean flag for verified clan members.
- `status`: `linked` or `unlinked` account state.

### ⚔️ Seasonal & Match Stats
- `seasonSynergy`: Points earned in the current season.
- `weeklySynergy`: Points earned in the current week.
- `lastSeasonSynergy`: Historical performance data.

### 🏆 Achievements
A nested object tracking wins across various systems:
- `intraWins`, `clanBattleWins`, `fosterWins`, `weeklyMVPCount`.

---
**Related Documents:** [[00 - Schema Overview]], [[Level]], [[Clan]]
