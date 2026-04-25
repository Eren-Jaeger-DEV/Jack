const personalityService = require('../services/personalityService');
const GuildConfig = require('../../../bot/database/models/GuildConfig');

module.exports = {
  name: 'personality',
  category: 'admin',
  description: 'Interactive dashboard to configure Jack\'s Personality Engine',
  aliases: ['persona', 'traits'],
  usage: 'j personality',

  async run(ctx) {
    const isOwner = ctx.member?.id === process.env.OWNER_ID || ctx.author?.id === process.env.OWNER_ID;
    const hasPerm = ctx.member?.permissions?.has('Administrator');
    
    if (!hasPerm && !isOwner) {
      return ctx.reply('❌ You do not have permission to configure my personality.');
    }

    const targetGuildId = ctx.guild ? ctx.guild.id : "1341978655437619250";

    let config = await GuildConfig.findOne({ guildId: targetGuildId });
    if (!config) config = new GuildConfig({ guildId: targetGuildId });
    if (!config.settings.personality) {
      config.settings.personality = { tone: "calm", humor: 10, strictness: 60, verbosity: 40, respect_bias: 60 };
      await config.save();
    }

    await ctx.reply(personalityService.buildPersonalityPanel(config));
  }
};
