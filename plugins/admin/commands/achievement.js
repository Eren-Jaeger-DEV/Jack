const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const profileService = require('../../clan/services/profileService');

module.exports = {
  name: "achievement",
  category: "admin",
  description: "Manually edit a player's achievements (Owner Only)",
  usage: "/achievement edit <user> <field> <value>",

  data: new SlashCommandBuilder()
    .setName("achievement")
    .setDescription("Manage player achievements")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName("edit")
        .setDescription("Manually edit a player's achievement field")
        .addUserOption(o => o.setName("user").setDescription("The player to edit").setRequired(true))
        .addStringOption(o => 
          o.setName("field")
            .setDescription("The field to update")
            .setRequired(true)
            .addChoices(
              { name: "Intra Wins", value: "intraWins" },
              { name: "Clan Battle Wins", value: "clanBattleWins" },
              { name: "Best Clan Battle Rank", value: "bestClanBattleRank" },
              { name: "Foster Wins", value: "fosterWins" },
              { name: "Foster Participation", value: "fosterParticipation" },
              { name: "Weekly MVP Count", value: "weeklyMVPCount" },
              { name: "Highest Season Rank", value: "highestSeasonRank" }
            )
        )
        .addIntegerOption(o => o.setName("value").setDescription("The new value").setRequired(true))
    ),

  async run(ctx) {
    // Only the server owner can use this command
    if (ctx.user.id !== ctx.guild.ownerId) {
      return ctx.reply({ content: "❌ This command is restricted to the **Server Owner** only.", ephemeral: true });
    }

    const sub = ctx.options.getSubcommand();
    if (sub === "edit") {
      const targetUser = ctx.options.getUser("user");
      const field = ctx.options.getString("field");
      const value = ctx.options.getInteger("value");

      await profileService.setAchievement(targetUser.id, `achievements.${field}`, value);

      const embed = new EmbedBuilder()
        .setTitle("🏆 Achievement Updated")
        .setColor("Gold")
        .setDescription(`Successfully updated **${field}** for <@${targetUser.id}> to **${value}**.`)
        .setFooter({ text: "Manual Achievement Override" })
        .setTimestamp();

      await ctx.reply({ embeds: [embed] });
    }
  }
};
