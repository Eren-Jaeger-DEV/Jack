const teamService = require("../services/teamService");
const configManager = require("../../../bot/utils/configManager");

module.exports = {
  name: "leaveteam",
  aliases: ["teamleave"],
  async run(ctx) {
    const config = await configManager.getGuildConfig(ctx.guild.id);
    const teamupChannelId = config?.settings?.teamupChannelId;

    if (teamupChannelId && ctx.channel.id !== teamupChannelId) {
      return ctx.reply(`⚠️ This command can only be used in <#${teamupChannelId}>.`);
    }

    const result = await teamService.leaveTeam(ctx.client, ctx.guild, ctx.user.id);
    if (result.success) {
      return ctx.reply(`✅ ${result.message || "You have left the team."}`);
    } else {
      return ctx.reply(`❌ ${result.message}`);
    }
  }
};
