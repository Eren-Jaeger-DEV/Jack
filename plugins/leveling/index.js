const { MessageFlags } = require('discord.js');
const leaderboardCmd = require("./commands/leaderboard");

module.exports = {
  name: "leveling",
  async load(client) {
    // Initialize the Canvas Preload routine safely
    const { preloadBackgrounds } = require("./backgroundCache");
    await preloadBackgrounds();

    // Start the Background DB Sync Worker
    const startWorker = require("./xpWorker");
    startWorker(client);

    /* ═══════════════════════════════════════════
     *  BUTTON HANDLER — Leaderboard Pagination
     * ═══════════════════════════════════════════ */
    this._interactionHandler = async (interaction) => {
      if (!interaction.isButton()) return;
      if (!interaction.customId.startsWith('leveling_lb_')) return;

      try {
        const parts = interaction.customId.split('_');
        const direction = parts[2]; 
        const currentPage = parseInt(parts[3]);
        const subCommand = parts[4];

        if (isNaN(currentPage)) return;

        // Acknowledge the interaction immediately
        await interaction.deferUpdate().catch(() => {});

        let newPage = direction === 'next' ? currentPage + 1 : currentPage - 1;
        if (newPage < 0) newPage = 0;

        // Mock a Context-like object for the command runner
        const ctx = {
          client: interaction.client,
          guild: interaction.guild,
          user: interaction.user,
          isInteraction: true,
          deferred: true,
          options: {
              getSubcommand: () => subCommand
          },
          editReply: async (payload) => await interaction.editReply(payload),
          reply: async (payload) => await interaction.reply(payload)
        };

        await leaderboardCmd.run(ctx, newPage);

      } catch (err) {
        if (err?.code === 10062) return;
        console.error('[Leveling] Pagination error:', err);
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
