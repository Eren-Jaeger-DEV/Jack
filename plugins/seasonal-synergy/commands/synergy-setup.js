/**
 * synergy-setup.js - Deploy the Synergy Automation Panel
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const panelHandler = require('../handlers/panelHandler');
const perms = require('../../../bot/utils/permissionUtils');

module.exports = {
  name: 'synergy-setup',
  category: 'seasonal-synergy',
  description: 'Deploy the Synergy Automation Panel to the moderation channel',
  usage: '/synergy-setup',
  
  data: new SlashCommandBuilder()
    .setName('synergy-setup')
    .setDescription('Deploy the Synergy Automation Panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async run(ctx) {
    if (!perms.isManagement(ctx.member)) {
      return ctx.reply({ content: '❌ Unauthorized.', ephemeral: true });
    }

    try {
      const channel = await ctx.client.channels.fetch(panelHandler.MOD_CHANNEL_ID).catch(() => null);
      if (!channel) return ctx.reply({ content: `❌ Channel \`${panelHandler.MOD_CHANNEL_ID}\` not found.`, ephemeral: true });

      await panelHandler.ensurePanel(ctx.client);
      await ctx.reply({ content: `✅ Panel deployed to <#${panelHandler.MOD_CHANNEL_ID}>.`, ephemeral: true });

    } catch (err) {
      await ctx.reply({ content: `❌ Failed to deploy panel: ${err.message}`, ephemeral: true });
    }
  }
};
