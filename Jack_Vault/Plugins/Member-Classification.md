---
id: member-classification
name: Member Classification
version: 1.2.0
category: Social
status: Active
---

# 👤 Member Classification

The **Member Classification** plugin ensures that every new user joining the Discord server is correctly categorized as either a **Clan Member** or a **Discord Guest**. This helps in maintaining access control and automating role assignments.

## ⚙️ How it Works

When a new member joins the server:
1. **Detection**: The `guildMemberAdd` event triggers.
2. **Prompt**: An interactive prompt is sent to the configured **Classification Channel**.
3. **Classification**: Admins or moderators select one of two options:
   - **⚔️ Join Clan**: Assigns the Clan Member role and initializes the user's data for competitive plugins (Synergy, Clan Battle, etc.).
   - **👋 Discord Member**: Assigns the guest role and limits access to clan-exclusive channels.

## 📋 Features

- **Awaiting Classification**: The bot tracks all users who have joined but haven't been classified yet.
- **Reminders**: Automated reminders for staff to clear the classification queue.
- **Audit Logging**: Every classification action is logged in the audit channel.

## ⚙️ Configuration

To use this plugin, the following settings must be defined in the global config:
- `classificationChannelId`: The ID of the channel where prompts are sent.
- `clanMemberRoleId`: The role ID for verified clan members.
- `guestRoleId`: The role ID for non-clan members.

---
**Related:** [[00 - Plugins Index]], [[Economy-Social#Greeting]], [[Foster-Program]]
