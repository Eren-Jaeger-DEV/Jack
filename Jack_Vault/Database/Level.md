---
id: level
model: Level
category: Economy/Social
status: Core
---

# 📈 Level

The `Level` model stores experience points (XP) and leveling progress for users within specific guilds.

## 📋 Schema Fields

### `userId` / `guildId`
The unique identifier for the user and the specific server where the XP is earned.

### `xp` (Number)
The total lifetime experience points earned in this guild.

### `weeklyXp` (Number)
XP earned in the current week, used for weekly leaderboards.

### `level` (Number)
The current numerical level calculated from total XP.

### `background` (String)
URL or name of the custom rank card background.

### `lastMessage` (Date)
Timestamp of the last message that granted XP (used for anti-spam cooldowns).

## 🚀 Performance
This model has optimized indexes for:
1.  **Top XP** (`guildId` + `xp`)
2.  **Top Weekly XP** (`guildId` + `weeklyXp`)
3.  **Fast Lookups** (`guildId` + `userId`)

---
**Related Documents:** [[00 - Schema Overview]], [[Leveling]], [[Player]]
