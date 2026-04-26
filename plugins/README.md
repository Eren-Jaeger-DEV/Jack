# Jack Plugins Directory

This directory contains the modular features of the Jack bot. Each plugin is designed to be 100% self-contained.

## Plugin Structure
All plugins MUST follow this structure to be correctly loaded by `core/pluginLoader.js`:

```
my-plugin/
├── plugin.json          ← Metadata (ID, Name, Version)
├── index.js             ← Lifecycle (load, unload, enable, disable)
├── commands/            ← Slash commands
├── events/              ← Event listeners
├── handlers/            ← UI Interaction handlers
└── services/            ← Pure business logic
```

## Documentation Standard
Every plugin should contain a `README.md` (Technical Manifest) that links to the corresponding operational guide in the **Jack Vault**.

## Maintenance
To update the global command reference, run:
```bash
npm run docs
```

---
*For architectural details, see [JACK_BLUEPRINT.md](../JACK_BLUEPRINT.md)*
