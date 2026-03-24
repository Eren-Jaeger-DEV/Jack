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
  description: "Delete all messages in the channel (Nuke)",
  aliases: ["nuke", "wipe"],
  usage: "/clearall  |  j clearall",
  details: "Deletes ALL messages in the channel by cloning the channel and deleting the original. Bypasses the 14-day limit.",

  data: new SlashCommandBuilder()
    .setName('clearall')
    .setDescription('Delete ALL messages in the channel (Nuke)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async run(ctx) {

    /* USER PERMISSION CHECK */

    if (!checkUser(ctx.member, PermissionFlagsBits.ManageMessages)) {
      return ctx.reply("❌ You don't have permission to manage messages.");
    }

    /* BOT PERMISSION CHECK */

    if (!checkBot(ctx.guild, PermissionFlagsBits.ManageMessages)) {
      return ctx.reply("❌ I don't have permission to manage messages or channels.");
    }

    // Additional check for channel management since we are cloning/deleting
    if (!ctx.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return ctx.reply("❌ I lack the `Manage Channels` permission required to nuke this channel.");
    }

    try {
      // Notify starting (some bots use a "Nuking..." message)
      const confirmationContent = "☢️ **Nuking channel...**";
      if (ctx.type === "slash") {
        await ctx.reply({ content: confirmationContent, ephemeral: true });
      } else {
        await ctx.reply(confirmationContent);
      }

      const oldChannel = ctx.channel;
      const position = oldChannel.position;

      // Clone the channel
      const newChannel = await oldChannel.clone({
        name: oldChannel.name,
        reason: `Channel Nuked by ${ctx.user.tag}`
      });

      // Set position to match old channel
      await newChannel.setPosition(position);

      // Delete the old channel
      await oldChannel.delete(`Nuked by ${ctx.user.tag}`);

      // Send success message in new channel
      const successEmbed = new EmbedBuilder()
        .setTitle("🧹 Channel Nuked")
        .setDescription("This channel has been completely cleared.")
        .addFields(
          { name: "Moderator", value: ctx.user.tag, inline: true },
          { name: "Original ID", value: oldChannel.id, inline: true }
        )
        .setColor("Blue")
        .setTimestamp()
        .setImage("https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2I1YjYyYjJiM2I1YjYyYjJiM2I1YjYyYjJiM2I1YjYyYjJiM2I1JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/HhTXt43pk1I1W/giphy.gif"); // Optional: Cool nuke gif

      const finalMsg = await newChannel.send({ embeds: [successEmbed] });
      
      // Auto-delete success message after 10 seconds to keep it clean
      setTimeout(() => finalMsg.delete().catch(() => {}), 10000);

      // Log the action
      const logEmbed = new EmbedBuilder()
        .setTitle("☢️ Channel Nuked (clearall)")
        .addFields(
          { name: "Moderator", value: ctx.user.tag },
          { name: "Channel", value: newChannel.name },
          { name: "Channel ID", value: newChannel.id }
        )
        .setColor("Red")
        .setTimestamp();

      await logger(ctx.guild, logEmbed);

    } catch (err) {
      console.error("clearall error:", err);
      ctx.reply({ content: "❌ Failed to nuke the channel. Check my permissions.", ephemeral: true });
    }

  }

};