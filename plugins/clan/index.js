/**
 * plugins/clan/index.js
 * 
 * Entry point for the Clan Plugin. Handles initialization of the registration panel
 * and routes interactions to the registration service.
 */

const { MessageFlags } = require('discord.js');
const regService = require('./services/registrationService');
const configManager = require('../../bot/utils/configManager');
const logger = require('../../utils/logger');
const Player = require('../../bot/database/models/Player');

module.exports = {
  async load(client) {
    // Initialize Panel on startup
    setTimeout(() => {
      this.ensurePanel(client);
    }, 10000); // 10s delay to ensure client is ready

    this._interactionHandler = async (interaction) => {
      if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
      if (!interaction.customId.startsWith('clan_reg_')) return;

      try {
        await this.handleInteraction(interaction);
      } catch (err) {
        logger.error('Registration', `Interaction error: ${err.message}`);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ An error occurred.', flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }
      }
    };

    client.on('interactionCreate', this._interactionHandler);
    logger.info('ClanPlugin', 'Loaded & interaction listener attached.');
  },

  async unload(client) {
    if (this._interactionHandler) {
      client.removeListener('interactionCreate', this._interactionHandler);
      this._interactionHandler = null;
    }
  },

  /**
   * Ensure the registration panel exists in the specified channel.
   */
  async ensurePanel(client) {
    try {
      const channel = await client.channels.fetch(regService.PANEL_CHANNEL_ID).catch(() => null);
      if (!channel) return logger.warn('Registration', `Panel channel ${regService.PANEL_CHANNEL_ID} not found.`);

      const messages = await channel.messages.fetch({ limit: 50 });
      const existing = messages.find(m => m.author.id === client.user.id && m.embeds?.[0]?.title === '🏆 CLAN REGISTRATION CENTER');

      if (existing) {
        logger.info('Registration', 'Panel already exists.');
      } else {
        await channel.send(regService.buildPanel());
        logger.info('Registration', 'Panel deployed successfully.');
      }
    } catch (err) {
      logger.error('Registration', `ensurePanel error: ${err.message}`);
    }
  },

  /**
   * Main interaction router for registration actions.
   */
  async handleInteraction(interaction) {
    const { customId, user, guild, member } = interaction;

    // 1. START REGISTRATION
    if (customId === 'clan_reg_start') {
      // Check if already registered
      const existing = await Player.findOne({ discordId: user.id });
      if (existing) {
        return interaction.reply({ content: '❌ You are already registered. Use the **Edit Profile** button if you need to update information.', flags: [MessageFlags.Ephemeral] });
      }
      return interaction.reply(regService.buildRoleSelection());
    }

    // 2. ROLE SELECTION (Dropdown)
    if (customId === 'clan_reg_role_select') {
      const selection = interaction.values[0];
      const config = await configManager.getGuildConfig(guild.id);
      const clanRoleId = config?.settings?.clanMemberRoleId || '1477856665817714699'; // Default fallback

      const verification = await regService.verifyRole(member, selection, clanRoleId);
      if (!verification.success) {
        return interaction.update({ content: verification.error, components: [], flags: [MessageFlags.Ephemeral] });
      }

      // If verified, open the modal
      const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
      const modal = new ModalBuilder()
        .setCustomId('player_register_modal')
        .setTitle('BGMI Player Registration');

      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ign').setLabel('In-Game Name').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('uid').setLabel('BGMI UID').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('level').setLabel('Account Level').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('modes').setLabel('Preferred Modes (TDM, Classic, etc)').setStyle(TextInputStyle.Short).setRequired(true))
      );

      await interaction.showModal(modal);
    }

    // 3. EDIT PROFILE
    if (customId === 'clan_reg_edit') {
      const player = await Player.findOne({ discordId: user.id });
      if (!player) {
        return interaction.reply({ content: '❌ You are not registered yet. Click **Register** to create a profile.', flags: [MessageFlags.Ephemeral] });
      }

      const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
      const modal = new ModalBuilder()
        .setCustomId('edit_profile_modal')
        .setTitle('Edit BGMI Profile');

      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ign').setLabel('In-Game Name').setStyle(TextInputStyle.Short).setValue(player.ign || '').setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('uid').setLabel('BGMI UID').setStyle(TextInputStyle.Short).setValue(player.uid || '').setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('level').setLabel('Account Level').setStyle(TextInputStyle.Short).setValue(player.accountLevel || '').setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('modes').setLabel('Preferred Modes').setStyle(TextInputStyle.Short).setValue(player.preferredModes?.join(', ') || '').setRequired(true))
      );

      await interaction.showModal(modal);
    }

    // 4. DELETE PROFILE
    if (customId === 'clan_reg_delete') {
      const player = await Player.findOne({ discordId: user.id });
      if (!player) {
        return interaction.reply({ content: '❌ No profile found to delete.', flags: [MessageFlags.Ephemeral] });
      }

      await Player.deleteOne({ discordId: user.id });
      return interaction.reply({ content: '✅ Your profile has been removed from the database.', flags: [MessageFlags.Ephemeral] });
    }
  }
};
