const { MessageFlags } = require('discord.js');
const leaderboardCmd = require("./commands/leaderboard");
const logger = require('../../utils/logger');

module.exports = {
  name: "leveling",
  async load(client) {
    // 1. Initialize Canvas Preload routine
    const { preloadBackgrounds } = require("./backgroundCache");
    await preloadBackgrounds();

    // 2. Start Background DB Sync Worker
    const startWorker = require("./xpWorker");
    startWorker(client);

    // 3. Register Interaction Handler (Leaderboard Pagination)
    this._interactionHandler = async (interaction) => {
      if (!interaction.isButton()) return;
      if (!interaction.customId.startsWith('leveling_lb_')) return;

      try {
        const parts = interaction.customId.split('_');
        const direction = parts[2]; 
        const currentPage = parseInt(parts[3]);
        const subCommand = parts[4];

        if (isNaN(currentPage)) return;

        await interaction.deferUpdate().catch(() => {});

        let newPage = direction === 'next' ? currentPage + 1 : currentPage - 1;
        if (newPage < 0) newPage = 0;

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
        logger.error("Leveling", `Pagination fallback error: ${err.message}`);
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
