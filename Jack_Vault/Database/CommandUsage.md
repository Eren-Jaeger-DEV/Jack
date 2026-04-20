---
id: commandusage
model: CommandUsage
category: Analytics
status: Core
---

# 📊 CommandUsage

The `CommandUsage` model tracks every execution of a command to provide popularity metrics and system diagnostic data.

## 📋 Schema Fields

### `commandName` (String, Indexed)
The lowercase name of the command that was run.

### `userID` / `guildID`
The identifiers for the execution context.

### `timestamp` (Date, Indexed)
When the command was triggered.

## 📈 Optimization
This model utilizes a high-performance compound index on `{ commandName: 1, timestamp: -1 }` to allow for rapid querying of recent command trends.

---
**Related Documents:** [[00 - Schema Overview]], [[ActivityLog]]
