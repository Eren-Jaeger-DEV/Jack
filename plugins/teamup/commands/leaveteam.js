const teamService = require("../services/teamService");
const { TEAMUP_CHANNEL_ID } = require("../config");

module.exports = {
  name: "leaveteam",
  aliases: ["teamleave"],
  async run(ctx) {
    if (ctx.channel.id !== TEAMUP_CHANNEL_ID) {
      return ctx.reply(`⚠️ This command can only be used in <#${TEAMUP_CHANNEL_ID}>.`);
    }

    const result = await teamService.leaveTeam(ctx.client, ctx.guild, ctx.user.id);
    if (result.success) {
      return ctx.reply(`✅ ${result.message || "You have left the team."}`);
    } else {
      return ctx.reply(`❌ ${result.message}`);
    }
  }
};
