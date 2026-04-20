---
id: command-executor
category: Core
status: Documentation
---

# ⚡ Command Executor

The `CommandExecutor` (`core/commandExecutor.js`) is the high-performance heart of the bot. Every user command passes through this safety wrapper before execution.

## 📋 The Protection Layers

> [!TIP] **Safety First**
> The Executor ensures that one bad command cannot crash the entire bot. It implements a **Timeout Race** (120 seconds) to prevent infinite loops.

### 🛡️ Layer 1: Automated Permissions
- **Enforcement**: Checks `command.userPermissions` automatically in the core executor.
- **Bot Safety**: Verifies if the **Bot** has the required permissions in the target channel.
- **RBAC Resilience**: Uses `PermissionFlagsBits` for stability (immune to role renames).
- **Owner Bypass**: Bot administrators bypass all standard permission checks.

### 🛡️ Layer 2: Cooldowns
- Prevents spamming by enforcing per-user, per-command cooldowns.
- Integrated with `core/cooldownManager.js`.

### 🛡️ Layer 3: Error Handling
- Every command is wrapped in a `try/catch`.
- Failures generate a unique **[[Ref-IDs]]** (e.g., `P9VIB9E`).
- Full stack traces are logged with metadata for developers.

### 🛡️ Layer 4: Metrics & Presence
- Records the execution time (in ms) for performance monitoring.
- Updates the bot's Presence (e.g., "Watching /kick") to give users feedback.

## 🎡 Execution Lifecycle

```mermaid
graph TD
    A[Dispatch] --> B{Validate Structure}
    B --> C{Basic Checks}
    C -- Pass --> D[Execute run()]
    C -- Fail --> E[Reply Error]
    D --> F{Timeout Race}
    F -- Success --> G[Log Success]
    F -- Timeout --> H[Kill Task & Log]
    D -- Exception --> I[handleError]
    I --> J[Generate Ref-ID]
```

---
**Related Documents:** [[00 - Core Architecture]], [[Plugin-Loader]], [[ErrorHandler]]
