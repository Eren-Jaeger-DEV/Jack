# 🛡️ Moderation

The Moderation plugin handles disciplinary actions and server safety.

## 📋 Features
- **Kick**: Remove members with hierarchy protection.
- **Ban**: Permanent removal from the server.
- **Nickname**: Force change user nicknames.
- **Clear**: Bulk message deletion.

## 📂 Architecture
- `commands/`: Individual moderation logic.
- `index.js`: Plugin entry point and safety checks.

## ⚙️ Configuration
| Setting | Description |
| --- | --- |
| `modLogChannel` | Where disciplinary logs are sent. |
| `bypassRoles` | Roles immune to moderation. |

---
**Related:** [[Audit]], [[Server-Overview]]
