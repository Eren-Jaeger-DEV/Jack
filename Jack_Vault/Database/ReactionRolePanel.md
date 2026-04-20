---
id: reactionrolepanel
model: ReactionRolePanel
category: Utility/Roles
status: Core
---

# 🎭 Reaction Role Panel

The `ReactionRolePanel` model stores configuration for interactive messages that allow users to self-assign roles via reactions.

## 📋 Schema Fields

### 📍 Location
- `panelID`: Unique identifier for the configuration.
- `guildID` / `channelID` / `messageID`: Precise location of the panel in Discord.

### 🎨 Visuals
- `title` / `description`: Content of the embed.
- `color`: Hex color for the embed sidebar.

### 🎭 Role Mapping
- `roles`: An array of objects containing:
    - `roleID`: The role to be granted.
    - `emoji`: The reaction that triggers the grant.
    - `label`: Human-readable name for the role.

---
**Related Documents:** [[00 - Schema Overview]], [[Roles]]
