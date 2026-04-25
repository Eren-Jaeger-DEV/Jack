const personalityService = require('../services/personalityService');
const GuildConfig = require('../../../bot/database/models/GuildConfig');

module.exports = {
  name: 'personality',
  category: 'admin',
  description: 'Interactive dashboard to configure Jack\'s Personality Engine',
  aliases: ['persona', 'traits'],
  usage: 'j personality',

  async run(ctx) {
    if (!ctx.member.permissions.has('Administrator') && ctx.member.id !== process.env.OWNER_ID) {
      return ctx.reply('❌ You do not have permission to configure my personality.');
    }

    let config = await GuildConfig.findOne({ guildId: ctx.guild.id });
    if (!config) config = new GuildConfig({ guildId: ctx.guild.id });
    if (!config.settings.personality) {
      config.settings.personality = { tone: "calm", humor: 10, strictness: 60, verbosity: 40, respect_bias: 60 };
      await config.save();
    }

    await ctx.reply(personalityService.buildPersonalityPanel(config));
  }
};
