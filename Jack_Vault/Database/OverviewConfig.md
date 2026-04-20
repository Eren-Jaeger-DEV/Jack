---
id: overviewconfig
model: OverviewConfig
category: Presentation
status: Plugin-Specific
---

# 📋 OverviewConfig

The `OverviewConfig` model stores the structure and content of the **Server Overview** panels.

## 📋 Schema Fields

### 📍 Pointers
- `guildId`: Unique server identifier.
- `overviewMessageId`: The ID of the public-facing embed.
- `controlMessageId`: The ID of the administrator control panel.

### 🗂️ Content Structure (`sections`)
An array of section objects containing:
- `name`: The title of the category (e.g., "Socials").
- `items`: An array of item objects:
    - `title`: The key for the piece of info.
    - `description`: The detailed text content.

---
**Related Documents:** [[00 - Schema Overview]], [[Server-Overview]], [[Admin]]
