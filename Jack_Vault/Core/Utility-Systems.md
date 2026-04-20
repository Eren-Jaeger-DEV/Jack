# 🛠️ Utility Systems

The bot relies on several specialized utility modules to handle permissions, configuration, and logging across the entire system.

---

## [[Permission-Utils]] (`bot/utils/permissionUtils.js`)
Centralized Role-Based Access Control (RBAC).
- `isOwner()`: Checks for technical IDs or "Supreme" roles.
- `isManagement()`: High-level access (Admins, Moderators).
- `isHighStaff()`: Includes Contributors.
- `hasRole()`: Generic cache-based role checker.

---

## [[Config-Manager]] (`bot/utils/configManager.js`)
A performance-focused configuration bridge.
- **Caching**: Stores guild configs in a `Map` to reduce MongoDB lookups.
- **Deep Proxying**: Ensures changes to the config are synced back to the database.

---

## [[Guild-Logger]] (`bot/utils/guildLogger.js`)
The bridge between bot events and Discord channels.
- **Routing**: Automatically routes logs to `mod-log`, `invite-log`, or `market-log` based on the event type.
- **Fallbacks**: If specific channel IDs are missing, it uses the `serverMap` to find the best match.

---

## [[Logger]] (`utils/logger.js`)
The celestial console reporter.
- **Privacy Scrubber**: Automatically detects and masks Discord Tokens, Mongo URIs, and Secrets in logs.
- **Ref-ID Injection**: Automatically adds unique IDs to error strings for tracking.
- **Metadata Support**: Captures scrubbed context objects for debugging without leaking secrets.

---
**Related Documents:** [[00 - Core Architecture]], [[Database]], [[Command-Executor]]
