---
id: guildconfig
model: GuildConfig
category: Management
status: Core
---

# 📜 GuildConfig

The `GuildConfig` model is the central "brain" of every server the bot is in. It stores all feature toggles, role IDs, and channel IDs.

## 📋 Schema Fields

### `guildId` (String, Unique)
The unique Discord ID of the guild.

### `features` (Object)
Boolean flags to enable/disable specific modules:
- `moderation`, `leveling`, `tempvc`, `market`, `foster-program`, `ai`, etc.

### `settings` (Object)
Detailed configuration for various plugins:

#### 📂 Logging Channels
- `logChannelId`: General bot logs.
- `modLogChannelId`: Disciplinary actions.
- `inviteLogChannelId`: Join/Leave events.

#### 🎭 Essential roles
- `ownerRoleId`, `managerRoleId`, `adminRoleId`.
- `clanMemberRoleId`, `discordMemberRoleId`.
- `mentorRoleId`, `rookieRoleId`.

#### 🎙️ TempVC Config
- `tempvcCreateChannelId`: The trigger channel.
- `tempvcPanelChannelId`: Where the buttons live.
- `tempvcCategoryId`: Where new rooms appear.

---
**Related Documents:** [[00 - Schema Overview]], [[Moderation]], [[TempVC]], [[Admin]]
