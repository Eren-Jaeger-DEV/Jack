---
id: tempvc
name: TempVC
version: 1.0.0
category: Voice
status: Active
---

# 🎙️ TempVC

The **TempVC** plugin provides a high-end, dynamic "Join-to-Create" voice channel system. It allows users to own and manage their own private spaces automatically.

## 🎡 Logical Flow

```mermaid
graph TD
    A[User joins 'Create channel'] --> B{Bot creates VC}
    B --> C[Bot moves user to new VC]
    C --> D[Bot assigns Ownership]
    D --> E[Control Panel updates]
    E --> F[User leaves VC]
    F --> G{Channel empty?}
    G -- Yes --> H[Delete channel]
    G -- No --> I[Wait]
```

## 📋 Features

> [!INFO] **Dynamic Ownership**
> The first person to join the newly created channel is the "Owner" and gains exclusive rights to the control panel buttons.

- **Lock/Unlock**: Prevents or allows new users to join.
- **Hide/Show**: Toggles "View Channel" permission for `@everyone`.
- **Rename**: Quickly appends a `(Private)` tag to the VC name.

## ⚡ Commands & Controls

| Action | Description | Emoji |
| --- | --- | --- |
| **Lock** | Restrict access to the VC. | 🔒 |
| **Limit** | Cycle between 5 users and Unlimited. | 👥 |
| **Kick** | Remove a member from your voice space. | 👢 |

---
**Related Documents:** [[00 - Plugins Index]], [[Server-Stats]], [[Utility_Commands]]
