const logger = require('../../../utils/logger');
const { checkUser, checkBot } = require("../../../bot/utils/checkPermission");

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
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

    if (!ctx.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return ctx.reply("❌ I lack the `Manage Channels` permission required to nuke this channel.");
    }

    /* CONFIRMATION STEP */

    const warnEmbed = new EmbedBuilder()
      .setTitle("⚠️ Dangerous Action")
      .setDescription("Are you sure you want to **NUKE** this channel? This will delete all messages and recreate the channel.")
      .setColor("Red")
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_nuke')
        .setLabel('Confirm Nuke')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('☢️'),
      new ButtonBuilder()
        .setCustomId('cancel_nuke')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    const response = await ctx.reply({
      embeds: [warnEmbed],
      components: [row]
    });

    const filter = (i) => i.user.id === ctx.user.id;

    try {
      const confirmation = await response.awaitMessageComponent({
        filter,
        componentType: ComponentType.Button,
        time: 30000
      });

      if (confirmation.customId === 'confirm_nuke') {
        
        await confirmation.update({ content: "☢️ **Nuking channel...**", embeds: [], components: [] });

        const oldChannel = ctx.channel;
        const position = oldChannel.position;

        // Clone the channel
        const newChannel = await oldChannel.clone({
          name: oldChannel.name,
          reason: `Channel Nuked by ${ctx.user.tag}`
        });

        // Set position
        await newChannel.setPosition(position);

        // Delete the old channel
        await oldChannel.delete(`Nuked by ${ctx.user.tag}`);

        // Success message in new channel
        const successEmbed = new EmbedBuilder()
          .setTitle("🧹 Channel Nuked")
          .setDescription("This channel has been completely cleared.")
          .addFields(
            { name: "Moderator", value: ctx.user.tag, inline: true },
            { name: "Original ID", value: oldChannel.id, inline: true }
          )
          .setColor("Blue")
          .setTimestamp()
          .setImage("https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2I1YjYyYjJiM2I1YjYyYjJiM2I1YjYyYjJiM2I1YjYyYjJiM2I1JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/HhTXt43pk1I1W/giphy.gif");

        const finalMsg = await newChannel.send({ embeds: [successEmbed] });
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

      } else {
        await confirmation.update({ content: "❌ Nuke cancelled.", embeds: [], components: [] });
        setTimeout(() => {
          if (ctx.type === "slash") ctx.interaction.deleteReply().catch(() => {});
          else response.delete().catch(() => {});
        }, 3000);
      }

    } catch (e) {
      // Timeout or error
      if (ctx.type === "slash") await ctx.interaction.deleteReply().catch(() => {});
      else await response.delete().catch(() => {});
    }

  }

};