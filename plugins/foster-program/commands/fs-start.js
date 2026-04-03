const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fosterService = require('../services/fosterService');

module.exports = {
  name: 'fs-start',
  category: 'foster-program',
  description: 'Start the Foster Program v2 (Admin Only)',
  aliases: ['fosterstart', 'fsstart', '/fs-start'],
  usage: 'j fs-start',

  data: new SlashCommandBuilder()
    .setName('fs-start')
    .setDescription('Start the Foster Program v2')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {
    try {
      // Permission check for prefix command (slash already handled by data)
      if (!ctx.isInteraction && !ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return ctx.reply('❌ **Jack:** You lack the authority to start a clan-wide program, noob. (Admin only)');
      }

      // Instead of starting immediately, send the confirmation UI
      await fosterService.sendStartConfirmation(ctx);

    } catch (err) {
      console.error('[FosterProgram] fs-start error:', err);
      await ctx.reply('❌ Something went wrong while attempting to start the program.');
    }
  }
};
