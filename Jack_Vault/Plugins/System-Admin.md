# 🛠️ System & Administration Plugins

These plugins provide the underlying management and logging capabilities for the Discord server.

---

## [[Admin]]
Core instance management and developer tools.

### 📋 Features
- **Evaluation**: Run JS code directly from Discord (Owner only).
- **Maintenance**: Reload plugins, clear caches, or shutdown the bot safely.
- **Diagnostics**: View system RAM, CPU, and websocket latency.

---

## [[Audit]]
Comprehensive tracking of server activity and user behavioral changes.

### 📋 Features
- **Action Logs**: Records role changes, nickname updates, and channel modifications.
- **Analytics**: Feeds data into the [[UserActivity]] model to generate engagement scores.
- **Search**: Allows looking up historical administrative actions via the [[ActivityLog]].

---

## [[Triggers]]
Automated Carl-bot style responses and advanced behavioral triggers.

### 📋 Features
- **Keywords**: Define strings that trigger specific replies.
- **Recursive Actions**: Triggers can add roles, remove roles, or DM users.
- **Regex Support**: Advanced matching for professional filter systems.

---

## Logger
Centralized logging operations ensuring all bot actions are beautifully formatted and pushed to designated hook channels.

### 📋 Features
- **Categorization**: Splits logs into Error, Moderation, Action, and Security.
- **Transports**: Hooks directly into the `logs/` directory for filesystem backup.

---

## Prefix
Dynamic guild-level prefix overrides.

### 📋 Features
- **Cache-Driven**: Resolves the custom prefix from Redis/RAM before hitting the DB.
- **Commands**: Integrates `/prefix` and `j prefixtest` directly.

---
**Related Documents:** [[00 - Plugins Index]], [[GuildConfig]], [[ActivityLog]]
