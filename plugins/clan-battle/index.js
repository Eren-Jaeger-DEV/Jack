/**
 * index.js — Clan Battle Plugin Entry Point
 *
 * Responsibilities:
 *  1. Daily reset scheduler — resets todayPoints at midnight
 *  2. Leaderboard pagination button handler
 */

const battleService = require('./services/battleService');
const Battle = require('./models/Battle');

module.exports = {
  load(client) {
    console.log('[ClanBattle] Clan battle plugin loaded.');

    /* ═══════════════════════════════════════════
     *  DAILY RESET — Check every 60 seconds
     * ═══════════════════════════════════════════ */
    let lastResetDate = '';

    setInterval(async () => {
      try {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        if (todayStr !== lastResetDate && now.getHours() === 0 && now.getMinutes() < 2) {
          lastResetDate = todayStr;

          // Find all active battles and reset daily points
          const activeBattles = await Battle.find({ active: true });
          for (const battle of activeBattles) {
            await battleService.resetDailyPoints(battle.guildId);

            // Refresh leaderboard in the channel
            try {
              const guild = client.guilds.cache.get(battle.guildId);
              if (!guild) continue;
              const channel = guild.channels.cache.get(battle.channelId);
              if (!channel) continue;

              const freshBattle = await battleService.getActiveBattle(battle.guildId);
              if (freshBattle) {
                await battleService.refreshLeaderboard(channel, freshBattle);
              }
            } catch (err) {
              console.error(`[ClanBattle] Leaderboard refresh after reset failed:`, err.message);
            }
          }
        }
      } catch (err) {
        // Silently ignore DB issues during polling
      }
    }, 60 * 1000);

    /* ═══════════════════════════════════════════
     *  BUTTON HANDLER — Leaderboard Pagination
     * ═══════════════════════════════════════════ */
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;
      if (!interaction.customId.startsWith('battle_lb_')) return;

      try {
        const parts = interaction.customId.split('_');
        // battle_lb_prev_<page> or battle_lb_next_<page>
        const direction = parts[2]; // 'prev' or 'next'
        const currentPage = parseInt(parts[3]);

        if (isNaN(currentPage)) return;

        const newPage = direction === 'next' ? currentPage + 1 : currentPage - 1;

        const battle = await battleService.getActiveBattle(interaction.guild.id);
        if (!battle) {
          return interaction.reply({ content: '❌ No active battle.', ephemeral: true });
        }

        const lb = battleService.getLeaderboardPage(battle, newPage);
        const components = lb.totalPages > 1 ? [battleService.buildButtons(lb.page, lb.totalPages)] : [];

        await interaction.update({ embeds: [lb.embed], components });

      } catch (err) {
        if (err?.code === 10062) return; // Unknown interaction
        console.error('[ClanBattle] Pagination error:', err);
      }
    });
  }
};
