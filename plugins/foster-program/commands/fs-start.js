const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fosterService = require('../services/fosterService');

module.exports = {
  name: 'fs-start',
  category: 'foster-program',
  description: 'Start the Foster Program Registration Phase (Admin Only)',
  aliases: ['fosterstart', 'foster-program-start'],
  usage: 'j fs-start',

  data: new SlashCommandBuilder()
    .setName('fs-start')
    .setDescription('Start the Foster Program Registration Phase')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {
    try {
      // Permission check for prefix command (slash already handled by data)
      if (!ctx.isInteraction && !ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return ctx.reply('❌ **Jack:** You lack the authority to start a clan-wide program, noob. (Admin only)');
      }

      await ctx.reply('⚡ **Jack is initiating the Foster Program Registration...**');

      const result = await fosterService.startProgram(ctx.guild, ctx.client);

      if (!result.success) {
        return ctx.reply(`❌ **Jack ERROR:** ${result.error}`);
      }

      await ctx.editReply(`✅ **Foster Program Registration is now OPEN!** Threads have been created in the foster channel.`);

    } catch (err) {
      console.error('[FosterProgram] fs-start error:', err);
      await ctx.reply('❌ Something went wrong while starting the program.');
    }
  }
};
