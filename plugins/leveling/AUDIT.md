# 🔍 Full Audit: XP & Leveling System

This audit provides a comprehensive technical breakdown of the existing leveling and XP mechanics within the **Jack** Discord bot.

---

## ⚙️ 1. Core XP System Logic

### How XP is Awarded
*   **Message-Based:** Users earn XP exclusively by sending messages in text channels.
*   **XP Gain Rate:** Each message awards a fixed **1 XP**.
*   **Anti-Spam Logic:** A **10-second cooldown** per user per guild is enforced. Messages sent within this window do not grant XP.
*   **Ignored Channels:** The system checks `xpIgnoreChannels` from the guild configuration. If a message is sent in an ignored channel, no XP is awarded.
*   **Multipliers:** Currently, there are **no multipliers** (e.g., for boosters or specific roles) implemented in the base logic.

### Exact XP Gain Formula
The XP required to reach a specific level is calculated using a quadratic progression formula:
```javascript
XP = Math.floor(22.5 * Math.pow(level, 2) + 425.6 * level + 52);
```
*   **Level 1:** 500 XP
*   **Level 10:** 6,558 XP
*   **Level 100:** 267,612 XP

---

## 📊 2. Level Calculation System

### Calculation Method
*   **Threshold-Based:** The system iteratively checks if a user's total XP exceeds the requirement for the next level.
*   **Cumulative XP:** XP is stored as a global total. Levels are derived by checking how many thresholds the total XP has passed.

### Storage & Bounds
*   **Storage:** Levels are stored in the `Level` MongoDB collection but are recalculated during every sync.
*   **Max Level Cap:** There is **no hard-coded maximum level**; it scales indefinitely according to the formula.

---

## 🔁 3. Level-Up Handling

### Detection Mechanism
Level-ups are detected by the **XP Worker** (`xpWorker.js`), which runs every **5 minutes**.
1.  Loads cached XP from memory.
2.  Updates the database.
3.  Compares the `oldLevel` with the `newLevel` (recalculated from the new XP total).
4.  If `newLevel > oldLevel`, the `handleLevelUp` function is triggered.

### Notifications
*   **Announcement:** An embed is sent to the configured `logChannelId` or `modLogChannelId`.
*   **Content:** A congratulatory message pinging the user with their new level.

---

## 🎭 4. Role Rewards System

### Role Mapping
Roles are fetched from the `levelRoles` map in the guild configuration (`config.settings.levelRoles`).
*   **Format:** `Level (String) → Role ID (String)`

### Assignment Logic
*   **Replacement Mode:** When a user levels up, the system identifies the highest role they qualify for. 
*   **Cleanup:** It automatically **removes** all other lower-level rank roles defined in the mapping to prevent "role stacking," ensuring only the highest earned rank role is displayed.

---

## 💬 5. Commands Related to Leveling

| Command | Description | Location |
| :--- | :--- | :--- |
| `rank` | Displays a generated image card with Level, XP, and Server Rank. | `.../leveling/commands/rank.js` |
| `leaderboard` | Shows the top 10 users by Global or Weekly XP. | `.../leveling/commands/leaderboard.js` |
| `rankbackground` | Allows users to customize their rank card background. | `.../leveling/commands/rankbackground.js` |
| `addxp` | (Admin) Adds a specific amount of XP to a user. | `.../leveling/commands/admin/addxp.js` |
| `removexp` | (Admin) Deducts XP from a user (floor at 0). | `.../leveling/commands/admin/removexp.js` |
| `setxp` | (Admin) Sets a user's XP to a specific value. | `.../leveling/commands/admin/setxp.js` |
| `setlevel` | (Admin) Sets a user to a specific level (recalculates XP). | `.../leveling/commands/admin/setlevel.js` |
| `resetxp` | (Admin) Resets a specific user to Level 0. | `.../leveling/commands/admin/resetxp.js` |
| `xpresetweekly` | (Admin) Resets weekly XP for all members in the guild. | `.../leveling/commands/admin/resetweekly.js` |

---

## 🗄️ 6. Database / Storage Structure

### MongoDB Schema (`Level.js`)
*   `userId` (String): Discord User ID.
*   `guildId` (String): Discord Server ID.
*   `xp` (Number): All-time total XP.
*   `weeklyXp` (Number): XP earned in the current week.
*   `level` (Number): Current level.
*   `background` (String): URL/ID for rank card background.
*   `lastMessage` (Date): Timestamp of the last XP-earning message.

### Caching System
The leveling system uses a **Write-Back Cache** strategy:
1.  XP is first stored in a Node.js `Map` (`xpCache.js`).
2.  Every **5 minutes**, `xpWorker.js` flushes the cache to MongoDB in a batch update.
3.  This minimizes database hits and improves performance during high chat activity.

---

## 🔄 7. Event Triggers

| Event | File Location | Description |
| :--- | :--- | :--- |
| `messageCreate` | `.../leveling/events/messageCreate.js` | Triggers the `levelHandler` to process XP gain. |

---

## ⚠️ 8. Edge Cases & Safeguards

*   **Negative XP:** Admin commands (`removexp`) use `Math.max(0, ...)` to ensure XP never drops below zero.
*   **Duplicate Level-Ups:** Since the worker compares `oldLevel` (from DB) to `newLevel` (calculated), as long as the DB is updated, multiple notifications for the same level-up are prevented.
*   **Spam Protection:** Hard 10-second cooldown is enforced before XP is even added to the cache.

---

## 📁 9. File Mapping

```text
/plugins/leveling/
├── index.js              # Plugin entry point; loads cache and starts worker.
├── levelHandler.js      # Core logic for validating and adding XP to cache.
├── xpCache.js           # In-memory storage for pending XP updates.
├── xpWorker.js          # Background service (5m) syncing cache to DB and handling level-ups.
├── rankCard.js          # Canvas-based rank card generator.
├── backgroundCache.js   # Preloads rank card assets.
├── commands/            # User and Admin rank commands.
├── events/              # DiscordJS event listeners (messageCreate).
└── utils/
    ├── xpForLevel.js    # Logic for Level -> XP threshold calculation.
    └── getLevelFromXP.js# Logic for XP -> Level calculation.
```

---

## ✅ Audit Conclusion
The system is **robust and performant** due to its caching layer. It follows a **cumulative XP** model with a **quadratic difficulty curve**. The role rewards system is designed for **exclusive rank roles** (non-stacking). Any modifications to the formula in `xpForLevel.js` will immediately affect all user levels once the worker next synchronizes.
