---
id: startup-sequence
category: Core
status: Documentation
---

# 🚀 Startup Sequence

The Jack bot uses a multi-stage boot sequence to ensure that all systems, databases, and modular plugins are initialized correctly before the Discord client connects.

## 🕒 The Workflow

```mermaid
sequenceDiagram
    participant OS as OS/PM2
    participant Main as main.js
    participant Bot as bot/index.js
    participant DB as MongoDB
    participant PL as PluginLoader
    
    OS->>Main: node main.js
    Main->>Main: Load .env & Dashboard
    Main->>Bot: Initialize(client)
    Bot->>DB: Connect to Atlas
    Bot->>PL: loadAll(client)
    PL->>PL: Sequential Scan /plugins
    PL->>PL: Isolation Checks
    PL->>Bot: Plugins Ready
    Bot->>OS: Client Login (Online)
```

## 📂 Stage 1: The Entry Point (`main.js`)
The application entry point is responsible for:
- Initializing the **Environment Variables**.
- Spawning the **Backend API** for the dashboard.
- Handling global process rejections and shutdown signals.

## 📂 Stage 2: Bot Initialization (`bot/index.js`)
This module creates the `Discord.Client` and sets up the primary infrastructure:
- **Database Connection**: Establishes the link to Mongoose.
- **System Bible**: Loads internal constants and strings.
- **Global Handlers**: Mounts the main event listeners.
- **The Call to Loaders**: Triggers the modular loading system.

---
**Related Documents:** [[00 - Core Architecture]], [[Plugin-Loader]], [[Database]]
