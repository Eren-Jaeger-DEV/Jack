/**
 * index.js — Seasonal Synergy Plugin Entry Point
 *
 * Responsibilities:
 *  1. Weekly reset scheduler — resets weekly energy every Monday at 00:00 IST
 *  2. Leaderboard pagination button handler
 *  3. Restart recovery — restore active season state on boot
 */

const synergyService = require('./services/synergyService');
const Season = require('./models/Season');
const profileService = require('../clan/services/profileService');
const { addLog } = require('../../utils/logger');

/**
 * Get current date/time in Asia/Kolkata timezone.
 */
function getIST() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}

module.exports = {
  load(client) {
    // Hidden

    /* ═══════════════════════════════════════════
     *  PATCH 3 — RESTART RECOVERY
     *  On startup, restore active season state and
     *  refresh leaderboard to ensure sync.
     * ═══════════════════════════════════════════ */
    setTimeout(async () => {
      try {
        const activeSeasons = await Season.find({ active: true });
        if (activeSeasons.length > 0) {
          addLog("Synergy", `${activeSeasons.length} season${activeSeasons.length > 1 ? 's' : ''} + leaderboard restored`);
          for (const season of activeSeasons) {
            const guild = client.guilds.cache.get(season.guildId);
            if (!guild) continue;

            // Refresh leaderboard to ensure sync
            await synergyService.refreshLeaderboard(client, season);
          }
        } else {
          addLog("Synergy", "Idle");
        }
      } catch (err) {
        console.error('[SeasonalSynergy] Restart recovery error:', err.message);
      }
    }, 5000); // Wait 5s for client to be fully ready

    /* ═══════════════════════════════════════════
     *  PATCH 1 — WEEKLY RESET (IST TIMEZONE)
     *  Check every 60 seconds, trigger Monday 00:00 IST
     * ═══════════════════════════════════════════ */
    let lastResetDate = '';

    setInterval(async () => {
      try {
        const now = getIST();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // Monday = 1, trigger within first 2 minutes of midnight IST
        if (todayStr !== lastResetDate && now.getDay() === 1 && now.getHours() === 0 && now.getMinutes() < 2) {
          lastResetDate = todayStr;

          console.log('[SeasonalSynergy] Weekly reset triggered (IST).');

          // Get top 3 before reset
          const top3 = await synergyService.resetWeeklyEnergy();

          // Achievement: increment weeklyMVPCount for #1
          if (top3.length > 0) {
            await profileService.incrementAchievement(top3[0].discordId, 'achievements.weeklyMVPCount');
          }

          // PATCH 5 — Role stacking fix: fetch all members, remove from ALL holders first
          const activeSeasons = await Season.find({ active: true });
          for (const season of activeSeasons) {
            try {
              const guild = client.guilds.cache.get(season.guildId);
              if (!guild) continue;

              const mvpRole = guild.roles.cache.get(synergyService.WEEKLY_MVP_ROLE_ID);
              if (mvpRole) {
                // Fetch all guild members to ensure cache is populated
                await guild.members.fetch().catch(() => {});

                // Remove from ALL current holders
                for (const [, member] of mvpRole.members) {
                  await member.roles.remove(mvpRole).catch(() => {});
                }

                // Assign to new top 3
                for (const p of top3) {
                  try {
                    const member = await guild.members.fetch(p.discordId).catch(() => null);
                    if (member) await member.roles.add(mvpRole);
                  } catch (err) {
                    console.error(`[SeasonalSynergy] Failed to assign MVP role to ${p.discordId}:`, err.message);
                  }
                }
              }

              // Refresh leaderboard
              const freshSeason = await synergyService.getActiveSeason(season.guildId);
              if (freshSeason) {
                await synergyService.refreshLeaderboard(client, freshSeason);
              }
            } catch (err) {
              console.error(`[SeasonalSynergy] Weekly reset error for guild ${season.guildId}:`, err.message);
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
    this._interactionHandler = async (interaction) => {
      if (!interaction.isButton()) return;
      if (!interaction.customId.startsWith('synergy_lb_')) return;

      try {
        const parts = interaction.customId.split('_');
        const direction = parts[2]; 
        const currentPage = parseInt(parts[3]);

        if (isNaN(currentPage)) return;

        // Acknowledge the interaction immediately to prevent timeouts
        await interaction.deferUpdate().catch(() => {});

        let newPage = direction === 'next' ? currentPage + 1 : currentPage - 1;

        const season = await synergyService.getActiveSeason(interaction.guild.id);
        if (!season) {
          return interaction.followUp({ content: '❌ No active season.', ephemeral: true });
        }

        const guild = await client.guilds.fetch(season.guildId).catch(() => null);
        const lb = await synergyService.getLeaderboardPayload(guild, season, newPage);

        if (newPage < 0) newPage = 0;
        if (newPage >= lb.totalPages) newPage = lb.totalPages - 1;

        const components = lb.totalPages > 1 ? [synergyService.buildButtons(lb.page, lb.totalPages)] : [];

        const files = [];
        let embeds = [];
        if (lb.embed) embeds.push(lb.embed);

        if (lb.playersArray && lb.playersArray.length > 0) {
          const { AttachmentBuilder } = require('discord.js');
          const { generateLeaderboardImage } = require('../../utils/leaderboardCanvas');
          const buffer = await generateLeaderboardImage(lb.playersArray, lb.page);
          const attachment = new AttachmentBuilder(buffer, { name: 'leaderboard.png' });
          files.push(attachment);
        }

        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ embeds, components, files });
        } else {
          await interaction.update({ embeds, components, files });
        }

      } catch (err) {
        if (err?.code === 10062) return;
        console.error('[SeasonalSynergy] Pagination error:', err);
      }
    };

    client.on('interactionCreate', this._interactionHandler);
  },

  unload(client) {
    if (this._interactionHandler) {
      client.removeListener('interactionCreate', this._interactionHandler);
      this._interactionHandler = null;
    }
  }
};
