/**
 * index.js — Intra-Match Plugin Entry Point
 *
 * Starts an auto-close scheduler that checks every 30 seconds
 * for registrations that have passed their endTime and locks
 * the corresponding thread.
 */

const registrationManager = require('./services/registrationManager');

module.exports = {
  load(client) {
    console.log('[IntraMatch] Intra-match plugin loaded.');

    // Auto-close scheduler: runs every 30 seconds
    setInterval(async () => {
      try {
        const expired = await registrationManager.getExpired();

        for (const reg of expired) {
          try {
            const guild = client.guilds.cache.get(reg.guildId);
            if (!guild) continue;

            const thread = guild.channels.cache.get(reg.threadId);

            if (thread) {
              // Lock the thread (do NOT archive)
              await thread.setLocked(true).catch(() => {});

              // Send closing message
              await thread.send(
                `🛑 **Registration Closed!**\n\n` +
                `📊 Total registered participants: **${reg.participants.length}**\n` +
                `This thread is now locked. Good luck to all participants!`
              ).catch(() => {});
            }

            // Mark as inactive
            await registrationManager.closeRegistration(reg._id);

            console.log(`[IntraMatch] Auto-closed registration in guild ${reg.guildId}`);
          } catch (innerErr) {
            console.error(`[IntraMatch] Error closing registration ${reg._id}:`, innerErr.message);
          }
        }
      } catch (err) {
        // Silently ignore DB connection issues during polling
      }
    }, 30 * 1000);
  }
};
