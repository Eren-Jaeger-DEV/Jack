const coreLogs = [];
const systemLogs = [];

const coreEmojiMap = {
  "Environment": "⚙️",
  "System": "🌐",
  "Database": "🗄️",
  "Events": "📡",
  "Plugins": "🧩",
  "Dashboard": "🌐"
};

const pluginEmojiMap = {
  "Counting": "🔢",
  "TempVC": "🎙️",
  "Member System": "👥",
  "Synergy": "📊",
  "Foster Program": "🎓"
};

/**
 * Add a log to the startup collection.
 * Roles: Core systems (System, Database, etc.) vs Plugin systems (Recovery logs).
 */
function addLog(systemName, message) {
  if (coreEmojiMap[systemName]) {
    coreLogs.push({ systemName, message });
  } else {
    // Basic deduplication for plugin recovery logs (if same system logs twice)
    const existing = systemLogs.find(l => l.systemName === systemName);
    if (existing) {
      existing.message = `${existing.message} + ${message}`.replace(/restored \+ (.+) restored/g, "restored & $1");
    } else {
      systemLogs.push({ systemName, message });
    }
  }
}

/**
 * Print all collected logs in a structured format.
 */
function printLogs(botTag) {
  console.log("\n🚀 Jack Booting...\n");

  coreLogs.forEach(log => {
      const emoji = coreEmojiMap[log.systemName] || "⚙️";
      const paddedName = log.systemName.padEnd(18, " ");
      console.log(`${emoji} ${paddedName} → ${log.message}`);
  });

  if (systemLogs.length > 0) {
    console.log("\n╭────────────── JACK SYSTEM BOOT ──────────────╮\n");
    systemLogs.forEach(log => {
      const emoji = pluginEmojiMap[log.systemName] || "⚙️";
      const paddedName = log.systemName.padEnd(18, " ");
      console.log(`${emoji} ${paddedName} → ${log.message}`);
    });
    console.log("\n╰────────────── SYSTEM READY ──────────────╯\n");
  }

  if (botTag) {
    console.log(`🤖 Logged in as ${botTag}\n`);
  }

  // Final cleanup
  coreLogs.length = 0;
  systemLogs.length = 0;
}

module.exports = { addLog, printLogs };
