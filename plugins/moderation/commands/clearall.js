const logger = require("../../../bot/utils/logger");
const { checkUser, checkBot } = require("../../../bot/utils/checkPermission");

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {

  name: "clearall",
  category: "moderation",
  description: "Delete all messages in the channel",
  aliases: ["nuke","clearall"],
  usage: "/clearall  |  j clearall",
  details: "Deletes ALL messages in the channel by cloning and deleting it.",

  data: new SlashCommandBuilder()
    .setName('clearall')
    .setDescription('Delete ALL messages in the channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async run(ctx) {

    /* USER PERMISSION CHECK */

    if (!checkUser(ctx.member, PermissionFlagsBits.ManageMessages)) {
      return ctx.reply("❌ You don't have permission to manage messages.");
    }

    /* BOT PERMISSION CHECK */

    if (!checkBot(ctx.guild, PermissionFlagsBits.ManageMessages)) {
      return ctx.reply("❌ I don't have permission to manage messages.");
    }

    await ctx.reply("🧹 Clearing channel...");

    try {

      const fetched = await ctx.channel.messages.fetch();

      await ctx.channel.bulkDelete(fetched, true).catch(() => {});

      const embed = new EmbedBuilder()
        .setTitle("🧹 Channel Cleared")
        .addFields(
          { name: "Moderator", value: ctx.user.tag },
          { name: "Channel", value: ctx.channel.toString() }
        )
        .setColor("Blue")
        .setTimestamp();

      await logger(ctx.guild, embed);

    } catch (err) {
      console.error("clearall error:", err);
    }

  }

};