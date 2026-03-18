const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Level = require("../../../../bot/database/models/Level");

module.exports = {
  name: "resetxp",
  category: "admin",
  description: "Reset all XP for a user",
  aliases: ["clearxp","xpreset"],
  usage: '/resetxp @user  |  j resetxp @user',
  details: 'Admin: Fully resets all XP for a specific user.',
  data: new SlashCommandBuilder()
    .setName("resetxp")
    .setDescription("Reset all XP for a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild | PermissionFlagsBits.Administrator)
    .addUserOption(option => option.setName("user").setDescription("User to reset XP for").setRequired(true)),

  async run(ctx) {
    let target = null;

    if (ctx.isInteraction) {
      target = ctx.options.getUser("user");
    } else {
      if (ctx.message?.mentions?.users?.size > 0) {
        target = ctx.message.mentions.users.first();
      } else if (ctx.args?.length > 0) {
        target = await ctx.client.users.fetch(ctx.args[0]).catch(() => null);
      }
    }

    if (!target) return ctx.reply({ content: "Please provide a valid user.", ephemeral: true });

    await Level.findOneAndUpdate(
      { userId: target.id, guildId: ctx.guild.id },
      { xp: 0, weeklyXp: 0, level: 0 },
      { upsert: true }
    );

    return ctx.reply({ content: `✅ Reset XP and level to 0 for ${target.tag}.`, ephemeral: true });
  }
};
