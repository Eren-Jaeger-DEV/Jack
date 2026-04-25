const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildSetupContainer, buildSetupRows } = require('../services/setupService');

module.exports = {
  name: 'setup',
  aliases: ['infra'],
  category: 'admin',
  description: 'Open the Neural Bridge dashboard to configure channels and roles.',
  permissions: [PermissionFlagsBits.Administrator],

  async run(ctx) {
    const container = await buildSetupContainer(ctx.guild);
    const rows = buildSetupRows();

    await ctx.reply({ 
      components: [container, ...rows],
      flags: MessageFlags.IsComponentsV2,
      ephemeral: false 
    });
  }
};
