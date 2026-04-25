/**
 * index.js — Foster Program Plugin Entry Point
 *
 * Responsibilities:
 *  1. Startup recovery — restore active program state
 *  2. Periodic checker — rotation/phase triggers every 60s
 *  3. Button handler — leaderboard pagination
 */

const { MessageFlags } = require('discord.js');
const fosterService = require('./services/fosterService');
const { addLog } = require('../../utils/logger');

module.exports = {
  load(client) {
    // Hidden

    /* ═══════════════════════════════════════════
     *  STARTUP RECOVERY
     * ═══════════════════════════════════════════ */
    setTimeout(async () => {
      try {
        const FosterProgram = require('./models/FosterProgram');
        const active = await FosterProgram.find({ active: true });
        if (active.length > 0) {
          addLog("Foster Program", `${active.length} program${active.length > 1 ? 's' : ''} + leaderboard restored`);
          for (const program of active) {
            await fosterService.refreshLeaderboard(client, program);
          }
          // Run immediate rotation/phase check
          await fosterService.checkRotationAndPhase(client);
        } else {
          addLog("Foster Program", "Idle");
        }
      } catch (err) {
        console.error('[FosterProgram] Startup recovery error:', err.message);
      }
    }, 6000);

    /* ═══════════════════════════════════════════
     *  PERIODIC CHECKER — Rotation & Phase (60s)
     * ═══════════════════════════════════════════ */
    setInterval(async () => {
      try {
        await fosterService.checkRotationAndPhase(client);
      } catch (err) {
        // Silently ignore
      }
    }, 60 * 1000);

    /* ═══════════════════════════════════════════
     *  BUTTON HANDLER — Leaderboard Pagination
     * ═══════════════════════════════════════════ */
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;
      if (!interaction.customId.startsWith('foster_lb_')) return;

      try {
        const parts = interaction.customId.split('_');
        const direction = parts[2]; // 'prev' or 'next'
        const currentPage = parseInt(parts[3]);

        if (isNaN(currentPage)) return;

        const newPage = direction === 'next' ? currentPage + 1 : currentPage - 1;

        const program = await fosterService.getActiveProgram(interaction.guild.id);
        if (!program) {
          return interaction.reply({ content: '❌ No active foster program.', flags: [MessageFlags.Ephemeral] });
        }

        await interaction.deferUpdate().catch(() => {});
        await fosterService.refreshLeaderboard(client, program, newPage);

      } catch (err) {
        if (err?.code === 10062) return;
        console.error('[FosterProgram] Pagination error:', err);
      }
    });

    /* ═══════════════════════════════════════════
     *  BUTTON HANDLER — Foster Start Confirmation
     * ═══════════════════════════════════════════ */
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;
      if (!interaction.customId.startsWith('foster_start_')) return;

      const { PermissionFlagsBits } = require('discord.js');
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ **Jack:** Only administrators can confirm program start.', flags: [MessageFlags.Ephemeral] });
      }

      try {
        const action = interaction.customId.split('_')[2]; // 'confirm' or 'cancel'

        if (action === 'cancel') {
          const container = new ContainerBuilder();
          container.addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ **Foster V2 start cancelled.**'));
          return interaction.update({ content: "", components: [container], flags: MessageFlags.IsComponentsV2, embeds: [] });
        }

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent('⚡ **Jack: Initiating Foster Program v2 — Registration Phase Start...**'));
        await interaction.update({ content: "", components: [container], flags: MessageFlags.IsComponentsV2, embeds: [] });
        
        const result = await fosterService.initiateRegistration(interaction.guild, client);
        if (!result.success) {
          return interaction.followUp({ content: `❌ **Jack ERROR:** ${result.error}`, flags: [MessageFlags.Ephemeral] });
        }

      } catch (err) {
        console.error('[FosterProgram] Start confirmation error:', err);
      }
    });
  }
};
