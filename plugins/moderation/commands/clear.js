const logger = require('../../../utils/logger');
const guildLogger = require("../../../bot/utils/guildLogger");
const perms = require("../../../bot/utils/permissionUtils");
const { checkBot } = require("../../../bot/utils/checkPermission");

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {

  name: "clear",
  category: "moderation",
  description: "Delete multiple messages from a channel",
  aliases: ["purge", "delete", "clean"],
  usage: "/clear <amount> [user]  |  j clear <amount> [@user]",
  details: "Bulk-deletes up to 1000 messages in the current channel. Can also filter by user.",

  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete multiple messages from a channel')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages (1-1000)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1000))
    .addUserOption(option =>
      option.setName('target')
        .setDescription('User to clear messages from')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async run(ctx) {

    if (!perms.isManagement(ctx.member)) {
      return ctx.reply('❌ **Jack:** Only tactical management personnel can perform bulk tactical purging.');
    }

    let amount;
    let targetUser;

    /* PREFIX ARGUMENT PARSING */

    if (ctx.type === "prefix") {

      if (!checkBot(ctx.guild, PermissionFlagsBits.ManageMessages))
        return ctx.reply('❌ I lack permission.');

      amount = parseInt(ctx.args[0]);

      if (!amount || amount < 1 || amount > 1000)
        return ctx.reply('Usage: `jack clear 10 [@user]` (Limit: 1000)');

      // Check for user mention or ID in second arg
      if (ctx.args[1]) {
        const id = ctx.args[1].replace(/[<@!>]/g, '');
        targetUser = await ctx.guild.members.fetch(id).catch(() => null);
        if (!targetUser) return ctx.reply("❌ Invalid user provided.");
        targetUser = targetUser.user;
      }

      // Fix: Delete the command message so it doesn't get counted in the clear amount
      await ctx.message.delete().catch(() => {});

    }

    /* SLASH ARGUMENT PARSING */

    if (ctx.type === "slash") {
      await ctx.defer({ ephemeral: true });
      amount = ctx.interaction.options.getInteger('amount');
      targetUser = ctx.interaction.options.getUser('target');

      if (!checkBot(ctx.guild, PermissionFlagsBits.ManageMessages))
        return ctx.reply({ content: '❌ I lack Manage Messages permission.', ephemeral: true });
    }

    // Logic for deleting messages
    try {
      let deletedCount = 0;

      if (targetUser) {
        // Filtered deletion: Fetch messages and delete those from the target user
        let remaining = amount;
        
        // Loop to handle more than 100 messages fetch limit
        while (remaining > 0) {
          const fetchAmount = remaining > 100 ? 100 : remaining;
          const messages = await ctx.channel.messages.fetch({ limit: 100 }); // We always fetch 100 to find the target's messages
          if (messages.size === 0) break;

          const userMessages = messages.filter(m => m.author.id === targetUser.id).first(fetchAmount);
          if (userMessages.length === 0) break;

          const deleted = await ctx.channel.bulkDelete(userMessages, true);
          deletedCount += deleted.size;
          remaining -= deleted.size;
          
          if (deleted.size < userMessages.length) break; // Reached 14-day limit or other issue
        }
      } else {
        // Unfiltered deletion: Straight bulkDelete in chunks of 100
        let remaining = amount;
        while (remaining > 0) {
          const deleteNow = remaining > 100 ? 100 : remaining;
          const deleted = await ctx.channel.bulkDelete(deleteNow, true);
          deletedCount += deleted.size;
          remaining -= deleteNow;
          
          if (deleted.size < deleteNow) break; // Cannot delete more (older than 14 days)
        }
      }

      const response = targetUser 
        ? `🧹 Deleted ${deletedCount} messages from ${targetUser.tag}.`
        : `🧹 Deleted ${deletedCount} messages.`;

      if (ctx.type === "slash") {
        await ctx.reply({ content: response, ephemeral: true });
      } else {
        const msg = await ctx.reply(response);
        setTimeout(() => msg.delete().catch(() => {}), 3000);
      }

      // Log the action
      if (deletedCount > 0) {
        const embed = new EmbedBuilder()
          .setTitle('🧹 Messages Cleared')
          .addFields(
            { name: 'Moderator', value: ctx.user.tag },
            { name: 'Channel', value: ctx.channel.toString() },
            { name: 'Amount Requested', value: `${amount}`, inline: true },
            { name: 'Actually Deleted', value: `${deletedCount}`, inline: true },
            { name: 'Target User', value: targetUser ? targetUser.tag : 'Everyone' }
          )
          .setColor('Blue')
          .setTimestamp();

        await guildLogger.send(ctx.guild, embed, 'mod');
      }

    } catch (error) {
      if (ctx.replied || ctx.deferred) {
        // If we already replied (successfully deleted), don't show an error unless the deletion itself failed.
        // But the try block covers deletion, so if it finishes, we're good.
        logger.error("Clear", `Suppressed post-deletion error: ${error.message}`);
      } else {
        console.error("Clear error:", error);
        ctx.reply({ content: "❌ An error occurred while clearing messages.", ephemeral: true });
      }
    }

  }

};