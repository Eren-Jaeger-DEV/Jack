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

const asciiJack = `
    __  ___   ________ __
   / / /   | / ____/ //_/
  / / / /| |/ /   / ,<   
 / /_/ ___ / /___/ /| |  
 \\____/_/  |_\\____/_/ |_|  
`;

/**
 * Print all collected logs in a structured format.
 */
function printLogs(botTag) {
  console.log("\\x1b[36m" + asciiJack + "\\x1b[0m");
  console.log("\\x1b[1m\\x1b[34m[ INITIALIZING BOOT SEQUENCE ]\\x1b[0m\\n");

  coreLogs.forEach(log => {
      const emoji = coreEmojiMap[log.systemName] || "⚙️";
      const paddedName = log.systemName.padEnd(18, " ");
      console.log(`\\x1b[35m${emoji}\\x1b[0m \\x1b[1m${paddedName}\\x1b[0m \\x1b[90m→\\x1b[0m \\x1b[32m${log.message}\\x1b[0m`);
  });

  if (systemLogs.length > 0) {
    console.log("\\n\\x1b[36m╭─────────── SYSTEM MODULES ───────────╮\\x1b[0m\\n");
    systemLogs.forEach(log => {
      const emoji = pluginEmojiMap[log.systemName] || "⚙️";
      const paddedName = log.systemName.padEnd(18, " ");
      console.log(`  ${emoji} \\x1b[1m${paddedName}\\x1b[0m \\x1b[90m→\\x1b[0m \\x1b[33m${log.message}\\x1b[0m`);
    });
    console.log("\\n\\x1b[36m╰──────────────────────────────────────╯\\x1b[0m\\n");
  }

  if (botTag) {
    console.log(`\\x1b[32m✅ SYSTEM ONLINE \\x1b[0m\\x1b[90m—\\x1b[0m Logged in as \\x1b[1m${botTag}\\x1b[0m\\n`);
  }

  // Final cleanup
  coreLogs.length = 0;
  systemLogs.length = 0;
}

/* ─────────────────────────────────────────────────
 *  RUNTIME LOGGING  (info / warn / error / debug)
 *  Used throughout plugin files as:
 *    const logger = require('../../utils/logger');
 *    logger.info("Tag", "message")
 * ───────────────────────────────────────────────── */

function _timestamp() {
  return new Date().toTimeString().slice(0, 8); // HH:MM:SS
}

function info(tag, message) {
  console.log(`\x1b[36m[${_timestamp()}]\x1b[0m \x1b[32mINFO\x1b[0m  [${tag}] ${message}`);
}

function warn(tag, message) {
  console.warn(`\x1b[36m[${_timestamp()}]\x1b[0m \x1b[33mWARN\x1b[0m  [${tag}] ${message}`);
}

function error(tag, message) {
  console.error(`\x1b[36m[${_timestamp()}]\x1b[0m \x1b[31mERROR\x1b[0m [${tag}] ${message}`);
}

function debug(tag, message) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`\x1b[36m[${_timestamp()}]\x1b[0m \x1b[35mDEBUG\x1b[0m [${tag}] ${message}`);
  }
}

module.exports = { addLog, printLogs, info, warn, error, debug };
