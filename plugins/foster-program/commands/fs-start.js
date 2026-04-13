const perms = require('../../../bot/utils/permissionUtils');
const fosterService = require('../services/fosterService');

module.exports = {
  name: 'fs-start',
  category: 'foster-program',
  description: 'Start the Foster Program v2 (Staff Only)',
  aliases: ['fosterstart', 'fsstart', '/fs-start'],
  usage: 'j fs-start',

  data: new SlashCommandBuilder()
    .setName('fs-start')
    .setDescription('Start the Foster Program v2')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async run(ctx) {
    try {
      // Permission check for both prefix and slash (centralized RBAC)
      if (!perms.isManagement(ctx.member)) {
        return ctx.reply('❌ **Jack:** You lack the authority to start a clan-wide program. (Staff only)');
      }

      // Instead of starting immediately, send the confirmation UI
      await fosterService.sendStartConfirmation(ctx);

    } catch (err) {
      console.error('[FosterProgram] fs-start error:', err);
      await ctx.reply('❌ Something went wrong while attempting to start the program.');
    }
  }
};
