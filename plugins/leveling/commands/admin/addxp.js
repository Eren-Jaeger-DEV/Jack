const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Level = require("../../../../bot/database/models/Level");
const getLevelFromXP = require("../../utils/getLevelFromXP");

module.exports = {
  name: "addxp",
  category: "admin",
  description: "Add XP to a user",
  aliases: ["xp+","givexp"],
  usage: "/addxp @user <amount>  |  j addxp @user <amount>",
  details: "Admin: Adds XP directly to a user's level progress.",
  data: new SlashCommandBuilder()
    .setName("addxp")
    .setDescription("Add XP to a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild | PermissionFlagsBits.Administrator)
    .addUserOption(option => option.setName("user").setDescription("User to add XP to").setRequired(true))
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
      { $inc: { xp: amount, weeklyXp: amount } },
      { upsert: true, new: true }
    );

    profile.level = getLevelFromXP(profile.xp);
    await profile.save();

    return ctx.reply({ content: `✅ Added ${amount} XP to ${target.tag}. They are now Level ${profile.level} with ${profile.xp} XP.`, ephemeral: true });
  }
};
