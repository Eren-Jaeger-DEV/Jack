const battleService = require('./services/battleService');
const Battle = require('./models/Battle');
const panelHandler = require('./handlers/panelHandler');
const sessionService = require('./services/sessionService');
const logger = require('../../utils/logger');

module.exports = {
  load(client) {
    // Initialize Automation Panel
    setTimeout(() => {
      panelHandler.ensurePanel(client);
    }, 10000);

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
                await battleService.refreshLeaderboard(client, freshBattle);
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
     *  INTERACTION HANDLER — Routing
     * ═══════════════════════════════════════════ */
    this._interactionHandler = async (interaction) => {
      const customId = interaction.customId;

      // Route battle automation interactions
      if (customId && customId.startsWith('battle_') && !customId.startsWith('battle_lb_')) {
        return panelHandler.handleInteraction(interaction);
      }

      if (!interaction.isButton()) return;
      if (!customId.startsWith('battle_lb_')) return;

      try {
        const parts = customId.split('_');
        const direction = parts[2]; 
        const currentPage = parseInt(parts[3]);

        if (isNaN(currentPage)) return;

        const newPage = direction === 'next' ? currentPage + 1 : currentPage - 1;

        const battle = await battleService.getActiveBattle(interaction.guild.id);
        if (!battle) {
          return interaction.reply({ content: '❌ No active battle.', ephemeral: true });
        }

        // Acknowledge the interaction immediately to prevent timeouts
        await interaction.deferUpdate().catch(() => {});
        
        await battleService.refreshLeaderboard(client, battle, newPage, interaction);

      } catch (err) {
        if (err?.code === 10062) return;
        console.error('[ClanBattle] Pagination error:', err);
      }
    };

    client.on('interactionCreate', this._interactionHandler);

    /* ═══════════════════════════════════════════
     *  MESSAGE LISTENER — Screenshot Collection
     * ═══════════════════════════════════════════ */
    this._messageHandler = async (message) => {
      if (message.author.bot || !message.guild) return;
      if (message.channel.id !== panelHandler.MOD_CHANNEL_ID) return;

      const session = sessionService.getSession(message.author.id);
      if (!session) return;

      const images = message.attachments.filter(a => a.contentType?.startsWith('image/'));
      if (images.size > 0) {
        for (const [, img] of images) {
          sessionService.addImage(message.author.id, img.url);
        }
        await message.react('✅').catch(() => {});
        logger.info("ClanBattle", `Collected ${images.size} battle attachment(s) from ${message.author.tag}`);
      }
    };

    client.on('messageCreate', this._messageHandler);
  },

  unload(client) {
    if (this._interactionHandler) {
      client.removeListener('interactionCreate', this._interactionHandler);
      this._interactionHandler = null;
    }
    if (this._messageHandler) {
      client.removeListener('messageCreate', this._messageHandler);
      this._messageHandler = null;
    }
  }
};
