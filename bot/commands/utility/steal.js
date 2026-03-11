const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { storeEmojiInBank } = require("../../utils/emojiDownloader");
const { storeStickerInBank } = require("../../utils/stickerDownloader");

module.exports = {

  name: "steal",
  category: "utility",
  description: "Steal an emoji or sticker by replying to a message and store it globally.",

  data: new SlashCommandBuilder()
    .setName("steal")
    .setDescription("Steal an emoji or sticker to the Global Vault (Must be used as a prefix command for replies)"),
    // A slash command variant could accept an ID or raw string, but replying is overwhelmingly simpler via Prefix.

  async run(ctx) {

    // Only Admins/Mods can steal
    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild) && !ctx.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return ctx.reply({ content: "❌ You need `Manage Emojis and Stickers` permission to steal.", ephemeral: true });
    }

    // Since stealing replies to messages, it fundamentally works best as a message command ("j steal")
    // If it's a slash command without a target message id, we error
    let targetMessage = null;

    if (ctx.type === "slash") {
       return ctx.reply({ content: "❌ Steal works best as a Prefix Command. Simply reply to a message with `jack steal`.", ephemeral: true });
    } else {
       // Is it a reply?
       if (!ctx.message.reference || !ctx.message.reference.messageId) {
         return ctx.reply("❌ Please reply to a message containing the emoji or sticker you want to steal. E.g: `j steal [name]`");
       }
       try {
         targetMessage = await ctx.channel.messages.fetch(ctx.message.reference.messageId);
       } catch {
         return ctx.reply("❌ Could not fetch the replied message.");
       }
    }

    // Check for Custom Emoji
    const customEmojiRegex = /<(a?):([a-zA-Z0-9_]+):(\d+)>/;
    const emojiMatch = targetMessage.content.match(customEmojiRegex);

    // Check for Stickers
    const stickers = targetMessage.stickers;

    // Default name if provided via args (e.g., `j steal coolpepe`)
    let customName = ctx.args[0] ? ctx.args[0].toLowerCase() : null;

    // --- Process Sticker ---
    if (stickers && stickers.size > 0) {
      const sticker = stickers.first();
      customName = customName || sticker.name;
      const result = await storeStickerInBank(customName, sticker.url, sticker.id, ctx.user || ctx.author, ctx.guild);
      return ctx.reply(result.success ? `🚀 Sticker Stolen! ${result.message}` : `❌ Failed: ${result.message}`);
    }

    // --- Process Emoji ---
    if (emojiMatch) {
      const isAnimated = emojiMatch[1] === "a";
      const name = emojiMatch[2];
      const id = emojiMatch[3];
      const extension = isAnimated ? "gif" : "png";
      const url = `https://cdn.discordapp.com/emojis/${id}.${extension}`;

      customName = customName || name;
      const result = await storeEmojiInBank(customName, url, id, ctx.user || ctx.author, ctx.guild);
      return ctx.reply(result.success ? `🚀 Emoji Stolen! ${result.message}` : `❌ Failed: ${result.message}`);
    }

    return ctx.reply("❌ I could not find a custom emoji or sticker in the message you replied to.");
  }
};
