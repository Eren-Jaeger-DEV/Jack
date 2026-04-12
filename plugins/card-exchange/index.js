/**
 * plugins/card-exchange/index.js — Plugin Entry Point
 *
 * Boots the Card Exchange system:
 *  1. Ensures the panel message is present in the exchange channel on startup
 *  2. Listens for new messages to repost the panel (keeping it at the bottom)
 *  3. Registers all interaction handlers via the exchange handler
 */

'use strict';

const configManager = require('../../bot/utils/configManager');
const { ensurePanel, repostPanel, getPanelMessageId } = require('./handlers/panelManager');
const { registerHandler, cleanupExchanges } = require('./handlers/exchangeHandler');
const { addLog } = require('../../utils/logger');

module.exports = {
  name: 'card-exchange',

  async load(client) {
    // Increase max listeners early to prevent memory leak warnings from multiple plugins
    client.setMaxListeners(25);

    // Wait until Discord is ready before touching channels
    if (!client.isReady()) {
      client.once('clientReady', () => this.setup(client));
    } else {
      await this.setup(client);
    }
  },

  async setup(client) {
    // 1. Ensure panel exists on startup
    await ensurePanel(client);

    // 2. Register interaction handlers
    registerHandler(client);

    // 3. Listen for messages in exchange channel to repost panel
    client.on('messageCreate', async message => {
      // Ignore DMs, other channels, and the bot's own panel message
      if (!message.guild || message.author.bot) return;

      const config = await configManager.getGuildConfig(message.guild.id);
      const exchangeChannelId = config?.settings?.cardExchangeChannelId;

      if (!exchangeChannelId || message.channelId !== exchangeChannelId) return;

      // Small debounce — only repost panel if the message is NOT the panel itself
      const panelId = getPanelMessageId();
      if (message.id === panelId) return;

      // Repost panel at bottom
      await repostPanel(client);
    });

    // 4. Periodically cleanup expired exchanges (every 1 minute)
    setInterval(() => cleanupExchanges(client), 60 * 1000);

    addLog('CardExchange', 'Plugin loaded ✅');
  }
};
