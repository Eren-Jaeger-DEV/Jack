---
id: afk
model: Afk
category: Utility
status: Core
---

# 💤 Afk

The `Afk` model tracks which users are currently "Away from Keyboard" and auto-replies to pings with their saved reason.

## 📋 Schema Fields

### `userId` (String, Unique)
The Discord ID of the user.

### `reason` (String)
The custom message to be displayed when the user is pinged (Default: "AFK").

### `since` (Date)
Timestamp of when the AFK state was activated.

### `pings` (Number)
Counter tracking how many times the user has been mentioned while AFK.

---
**Related Documents:** [[00 - Schema Overview]], [[Player]]
