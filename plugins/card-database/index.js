/**
 * plugins/card-database/index.js — Plugin Entry Point
 *
 * Boots the Card Database CMS:
 *  1. Ensures the main control panel exists in the DB channel on startup
 *  2. Registers all interaction handlers (buttons + modals)
 *  3. Listens for image messages to complete the "Add Card" flow
 *  4. Registers debounced auto-sync event listeners
 */

'use strict';

const { ensurePanel }                                      = require('./handlers/panelManager');
const { handleAddCategory, handleCategoryModal, handleDeleteCategory } = require('./handlers/categoryManager');
const { handleAddCard, handleCardModal, handleImageUpload } = require('./handlers/cardManager');
const { handleSync }                                       = require('./handlers/syncHandler');
const { registerAutoSync }                                 = require('./handlers/autoSync');

module.exports = {
  name: 'card-database',

  async load(client) {
    if (!client.isReady()) {
      client.once('clientReady', () => this.setup(client));
    } else {
      await this.setup(client);
    }
  },

  async setup(client) {
    client.setMaxListeners(30);

    // 1. Ensure the main panel exists
    await ensurePanel(client);

    // 2. Register interaction router
    client.on('interactionCreate', async interaction => {
      try {
        if (interaction.isButton()) {
          if (interaction.customId === 'cdb_add_cat')    return handleAddCategory(interaction);
          if (interaction.customId === 'cdb_sync')       return handleSync(interaction, client);
          if (interaction.customId === 'cdb_add_card')   return handleAddCard(interaction);
          if (interaction.customId === 'cdb_delete_cat') return handleDeleteCategory(interaction);
        }

        if (interaction.isModalSubmit()) {
          if (interaction.customId === 'cdb_modal_cat')  return handleCategoryModal(interaction);
          if (interaction.customId === 'cdb_modal_card') return handleCardModal(interaction);
        }
      } catch (err) {
        console.error('[CardDB] Unhandled interaction error:', err.message);
      }
    });

    // 3. Listen for image uploads (completing the Add Card flow)
    client.on('messageCreate', async message => {
      await handleImageUpload(message);
    });

    // 4. Debounced auto-sync on data changes (threadCreate, messageCreate, messageUpdate, messageDelete)
    registerAutoSync(client);

    console.log('[CardDB] Plugin loaded ✅');
  }
};
