const teamService = require("../services/teamService");
const { TEAMUP_CHANNEL_ID } = require("../config");

module.exports = {
  name: "deleteteam",
  aliases: ["disbandteam", "teamdelete"],
  async run(ctx) {
    if (ctx.channel.id !== TEAMUP_CHANNEL_ID) {
      return ctx.reply(`⚠️ This command can only be used in <#${TEAMUP_CHANNEL_ID}>.`);
    }

    const team = await teamService.isInTeam(ctx.user.id);
    if (!team) {
      return ctx.reply("❌ You are not in a team!");
    }

    if (team.leaderId !== ctx.user.id) {
      return ctx.reply("❌ Only the team leader can delete the team!");
    }

    const result = await teamService.deleteTeam(ctx.client, ctx.guild, team);
    if (result.success) {
      return ctx.reply("✅ Team has been disbanded and deleted.");
    } else {
      return ctx.reply(`❌ Failed to delete team: ${result.message}`);
    }
  }
};
