const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Level = require("../../../../bot/database/models/Level");
const getLevelFromXP = require("../../utils/getLevelFromXP");

module.exports = {
  name: "setxp",
  category: "admin",
  description: "Set XP for a user",
  aliases: ["xpset","forcexp"],
  usage: "/setxp @user <amount>  |  j setxp @user <amount>",
  details: "Admin: Sets a user's total XP to an exact amount.",
  data: new SlashCommandBuilder()
    .setName("setxp")
    .setDescription("Set XP for a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild | PermissionFlagsBits.Administrator)
    .addUserOption(option => option.setName("user").setDescription("User to set XP for").setRequired(true))
    .addIntegerOption(option => option.setName("amount").setDescription("Amount of XP").setRequired(true)),

  async run(ctx) {
    let target = null;
    let amount = 0;

    if (ctx.isInteraction) {
      target = ctx.options.getUser("user");
      amount = ctx.options.getInteger("amount");
    } else {
      if (ctx.message?.mentions?.users?.size > 0) {
        target = ctx.message.mentions.users.first();
      } else if (ctx.args?.length > 0) {
        target = await ctx.client.users.fetch(ctx.args[0]).catch(() => null);
      }
      amount = parseInt(ctx.args[1], 10);
    }

    if (!target) return ctx.reply({ content: "Please provide a valid user.", ephemeral: true });
    if (isNaN(amount)) return ctx.reply({ content: "Please provide a valid amount.", ephemeral: true });

    const profile = await Level.findOneAndUpdate(
      { userId: target.id, guildId: ctx.guild.id },
      { xp: amount, weeklyXp: amount, level: getLevelFromXP(amount) },
      { upsert: true, returnDocument: 'after' }
    );

    return ctx.reply({ content: `✅ Set ${target.tag}'s XP to ${profile.xp} (Level ${profile.level}).`, ephemeral: true });
  }
};
