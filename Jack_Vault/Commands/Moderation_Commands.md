# ⚡ Command Reference: Moderation

This section provides detailed reference for the bot's core moderation tools. Most of these commands will require elevated Discord permissions (such as `Manage Server`, `Manage Messages`, `Kick Members`, or `Ban Members`).

---

## 🛡️ Moderation Tools
*Use these tools to maintain safety and standard discipline within the server.*

> [!NOTE]
> All moderation commands listed below are implemented as **Slash Commands**. Prefix variations are not supported for these actions to ensure Discord's audit log hooks work correctly.

| Command | Usage | Description |
| --- | --- | --- |
| `addrole` | `/addrole @user @role` | Add a role to a user |
| `removerole`| `/removerole @user @role`| Remove a role from a user |
| `ban` | `/ban @user [reason]` | Ban a member from the server |
| `unban` | `/unban [user-id]` | Unban a user from the server |
| `kick` | `/kick @user [reason]` | Kick a member from the server |
| `mute` | `/mute @user [duration]` | Timeout a member |
| `unmute` | `/unmute @user` | Remove timeout from a member |
| `warn` | `/warn @user [reason]` | Warn a user |
| `unwarn` | `/unwarn @user [id]` | Remove a specific warning from a user |
| `clearwarns`| `/clearwarns @user` | Clear all warnings from a user |
| `warnings` | `/warnings @user` | View warnings for a user |
| `nickname` | `/nickname @user [name]`| Change a user nickname |
| `clear` | `/clear [amount]` | Delete multiple messages from a channel |
| `clearall` | `/clearall` | Delete ALL messages in the channel (Nuke) |
| `lock` | `/lock` | Lock the current channel |
| `unlock` | `/unlock` | Unlock the current channel |

---
**Related Documents:** [[00 - Commands Index]], [[Moderation]], [[System-Admin]]
