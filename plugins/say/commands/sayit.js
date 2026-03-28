const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'sayit',
  category: 'admin',
  permissions: [PermissionFlagsBits.ManageMessages],
  cooldown: { user: 2000 },
  
  data: new SlashCommandBuilder()
    .setName('sayit')
    .setDescription('Resends a replied-to message through the bot and deletes the original.'),

  async run(ctx) {
    const { source, channel } = ctx;

    // 1. Validation: Must be a reply
    if (!source.reference || !source.reference.messageId) {
      return await ctx.reply("❌ Error: You must reply to a message to use this command.");
    }

    try {
      // 2. Fetch the replied message
      const repliedMessage = await channel.messages.fetch(source.reference.messageId);
      if (!repliedMessage) {
          return await ctx.reply("❌ Error: Could not find the replied message.");
      }

      // 3. Validation: Content presence
      const hasContent = repliedMessage.content || repliedMessage.attachments.size > 0 || repliedMessage.embeds.length > 0;
      if (!hasContent) {
          return await ctx.reply("❌ Error: Targeted message is empty.");
      }

      // 4. Extraction
      const content = repliedMessage.content;
      const embeds = repliedMessage.embeds;
      const files = Array.from(repliedMessage.attachments.values()).map(a => a.url);

      // 5. Deletion of original message
      if (repliedMessage.deletable) {
          await repliedMessage.delete().catch(() => null);
      } else {
          // If bot can't delete it, we still proceed but warn in logs if needed
          // For now, we still try to resend
      }

      // 6. Delete the command message (the 'j sayit' message)
      if (source.deletable) {
          await source.delete().catch(() => null);
      }

      // 7. Resend via bot
      // We use a new channel.send to avoid replying to the now-deleted command message
      await channel.send({
          content: content || null,
          embeds: embeds,
          files: files
      });

    } catch (err) {
      if (err.code === 10008) { // Unknown Message
          return await ctx.reply("❌ Error: The replied message no longer exists.");
      }
      throw err; // Let global errorHandler handle unexpected issues
    }
  }
};
