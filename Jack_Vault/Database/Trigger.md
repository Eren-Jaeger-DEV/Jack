---
id: trigger
model: Trigger
category: Automation
status: Core
---

# ⚡ Trigger

The `Trigger` model defines automated keyword-based responses and actions that the bot performs when specific phrases are detected in chat.

## 📋 Schema Fields

### 🔍 Match Configuration
- `guildId`: The server where the trigger is active.
- `trigger`: The keyword or phrase to listen for.
- `matchType`: How the bot matches the input (`substring`, `strict`, `startswith`, `endswith`, `regex`, `exact`).

### 🛠️ Actions
- `response`: The text the bot replies with.
- `actions.addRoles` / `actions.removeRoles`: Automated role management upon trigger.
- `actions.deleteTriggeringMessage`: Whether to delete the user's message.
- `actions.dmResponse`: Whether to send the reply in DMs.

### 🛡️ Filters
- `allowedChannels` / `ignoredChannels`: Where the trigger works.
- `allowedRoles` / `ignoredRoles`: Which users can activate the trigger.

---
**Related Documents:** [[00 - Schema Overview]], [[Triggers]]
