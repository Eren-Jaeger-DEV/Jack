const teamService = require("./services/teamService");

module.exports = {
  load(client) {
    // Silenced

    // Scheduler: Check every minute for expired teams and reminders
    setInterval(async () => {
      try {
        await teamService.cleanupExpired(client);
        await teamService.sendReminders(client);
      } catch (err) {
        console.error("[TeamUp] Scheduler error:", err);
      }
    }, 60 * 1000);
  }
};
