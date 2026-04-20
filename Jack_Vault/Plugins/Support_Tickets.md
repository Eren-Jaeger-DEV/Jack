# 🎟️ Support Tickets

The `tickets` plugin provides a complete, thread-based customer support engine inside the server.

---

## 📋 Features

### Ticket Panels
Administrators can deploy the interactive support portal using the `/ticketpanel` command.
- **Dropdown Integration**: The panel utilizes `StringSelectMenuBuilder` to present categorized support sectors (e.g. "Report a User", "Server Support", "Billing").
- **Persistent Message**: The portal message will automatically stay up-to-date and maintain its listeners even after bot restarts.

### Ticket Handling (Threads)
When a user selects an option from the panel:
- **Private Threads**: The bot creates a private Thread channel `ticket-[username]`.
- **Automatic Ping**: It pulls in the necessary support roles (configured via dashboard/env) to address the concern.
- **Transcripts**: (Planned Feature/Coming soon) Outputting ticket content to HTML before closure.

### ⚡ Available Commands
| Command | Usage | Description |
| --- | --- | --- |
| `ticketpanel` | `/ticketpanel` | Create advanced ticket panel with dropdown options |

---
**Related Documents:** [[00 - Plugins Index]], [[System-Admin]]
