const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { buildSetupEmbed, buildSetupRows } = require('../services/setupService');

module.exports = {
  name: 'setup',
  aliases: ['infra'],
  category: 'admin',
  description: 'Open the Neural Bridge dashboard to configure channels and roles.',
  permissions: [PermissionFlagsBits.Administrator],

  async run(ctx) {
    const embed = await buildSetupEmbed(ctx.guild);
    const rows = buildSetupRows();

    await ctx.reply({ 
      embeds: [embed], 
      components: rows,
      ephemeral: false 
    });
  }
};
