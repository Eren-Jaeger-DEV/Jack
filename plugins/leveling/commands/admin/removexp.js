const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Level = require("../../../../bot/database/models/Level");
const getLevelFromXP = require("../../utils/getLevelFromXP");

module.exports = {
  name: "removexp",
  category: "admin",
  description: "Remove XP from a user",
  aliases: ["xp-","takexp"],
  usage: '/removexp @user <amount>  |  j removexp @user <amount>',
  details: 'Admin: Removes XP from a user's level progress.',
  data: new SlashCommandBuilder()
    .setName("removexp")
    .setDescription("Remove XP from a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild | PermissionFlagsBits.Administrator)
    .addUserOption(option => option.setName("user").setDescription("User to remove XP from").setRequired(true))
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

    const profile = await Level.findOne({ userId: target.id, guildId: ctx.guild.id });
    if (!profile) return ctx.reply({ content: "User has no XP.", ephemeral: true });

    profile.xp = Math.max(0, profile.xp - amount);
    profile.weeklyXp = Math.max(0, profile.weeklyXp - amount);
    profile.level = getLevelFromXP(profile.xp);
    await profile.save();

    return ctx.reply({ content: `✅ Removed ${amount} XP from ${target.tag}. They are now Level ${profile.level} with ${profile.xp} XP.`, ephemeral: true });
  }
};
