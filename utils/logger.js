const logs = [];

/**
 * Add a log to the startup collection.
 * @param {string} systemName - The name of the system (e.g., "Counting").
 * @param {string} message - The clean message to display.
 */
function addLog(systemName, message) {
  logs.push({ systemName, message });
}

/**
 * Print all collected logs in a formatted block.
 */
function printLogs() {
  if (logs.length === 0) return;

  const emojiMap = {
    "Counting": "🔢",
    "TempVC": "🎙️",
    "Member System": "👥",
    "Synergy": "📊",
    "Foster Program": "🎓"
  };

  console.log("");
  console.log("╭────────────── JACK SYSTEM BOOT ──────────────╮");
  console.log("");

  logs.forEach(log => {
    const emoji = emojiMap[log.systemName] || "⚙️";
    const paddedName = log.systemName.padEnd(18, " ");
    console.log(`${emoji} ${paddedName} → ${log.message}`);
  });

  console.log("");
  console.log("╰────────────── SYSTEM READY ──────────────╯");
  console.log("");
  
  // Clear logs to prevent double printing if called again
  logs.length = 0;
}

module.exports = { addLog, printLogs };
