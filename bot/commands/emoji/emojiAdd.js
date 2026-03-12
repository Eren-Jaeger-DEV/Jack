const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const EmojiBank = require("../../database/models/EmojiBank");
const { searchEmojiCDN } = require("../../utils/emojiCDN");

module.exports = {

  name: "emojiadd",
  category: "emoji",
  description: "Summon a specific emoji from the Global Vault to your server.",

  data: new SlashCommandBuilder()
    .setName("emojiadd")
    .setDescription("Upload a global vault emoji to your server roster")
    .addStringOption(opt => opt.setName("emojiname").setDescription("Name of the emoji to download").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers),

  async run(ctx) {
    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return ctx.reply({ content: "❌ You need `Manage Emojis and Stickers` permission.", flags: 64 });
    }

    const emojiName = ctx.type === "slash" ? ctx.options.getString("emojiname").toLowerCase() : ctx.args.join(" ").toLowerCase();
    if (!emojiName) return ctx.reply("❌ Usage: `/emojiadd <emoji_name>`");

    const matches = await searchEmojiCDN(emojiName);
    if (!matches || matches.length === 0) {
      return ctx.reply("❌ That emoji is not in the Global Vault. Steal it first!");
    }

    // Usually grab the exact first match safely
    const target = matches[0];

    try {
      await ctx.deferReply();
      const newEmoji = await ctx.guild.emojis.create({ attachment: target.url, name: target.name });
      return ctx.editReply(`✅ Successfully added ${newEmoji} to this server's roster!`);
    } catch (err) {
      console.error("Emoji Create API limits:", err);
      return ctx.editReply("❌ Failed to add emoji to this server. (Server Emoji Slots might be full, or connection error).");
    }
  }
};
