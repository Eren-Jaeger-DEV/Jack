---
id: activitylog
model: ActivityLog
category: Audit/Logs
status: Core
---

# 📝 ActivityLog

The `ActivityLog` model records every administrative action taken through the bot's intervention system.

## 📋 Schema Fields

### 👮 Administrator
- `adminId`: Discord ID of the moderator.
- `adminUsername` / `adminAvatar`: Snapshot of the moderator at the time of the action.

### 🎯 Target
- `targetId`: Discord ID of the affected user.
- `targetUsername` / `targetAvatar`: Snapshot of the target user.

### 🛠️ Action Data
- `action`: The type of event (e.g., `ROLE_ADD`, `BAN`, `KICK`).
- `changes`: A mixed object showing exactly what was modified (Old value vs New value).
- `timestamp`: Date and time of the event.

---
**Related Documents:** [[00 - Schema Overview]], [[Audit]], [[Moderation]]
