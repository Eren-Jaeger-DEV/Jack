/**
 * Background worker for the leveling system.
 * Since leveling is now real-time, this worker is retained for potential
 * secondary maintenance tasks (e.g. weekly XP resets).
 */
module.exports = function xpWorker(client) {
  // Main XP sync is now handled in real-time in levelHandler.js
  // 300,000 ms = 5 minutes
  setInterval(async () => {
    // Maintenance logic can be added here if needed
  }, 300000);
};

