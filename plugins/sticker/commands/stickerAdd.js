const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const StickerBank = require("../../../bot/database/models/StickerBank");

module.exports = {

  name: "stickeradd",
  category: "sticker",
  description: "Summon a specific sticker from the Global Vault to your server.",

  data: new SlashCommandBuilder()
    .setName("stickeradd")
    .setDescription("Upload a global vault sticker to your server roster")
    .addStringOption(opt => opt.setName("stickername").setDescription("Exact name of the sticker to download").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers),

  async run(ctx) {
    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return ctx.reply({ content: "❌ You need `Manage Emojis and Stickers` permission.", flags: 64 });
    }

    const stickerName = ctx.type === "slash" ? ctx.options.getString("stickername").toLowerCase() : ctx.args.join(" ").toLowerCase();
    if (!stickerName) return ctx.reply("❌ Usage: `/stickeradd <sticker_name>`");

    const target = await StickerBank.findOne({ name: stickerName });
    if (!target) {
      return ctx.reply(`❌ That sticker "\`${stickerName}\`" is not in the Global Vault. Steal it first!`);
    }

    try {
      await ctx.deferReply();
      
      // Stickers optionally need tags.
      const newSticker = await ctx.guild.stickers.create({ file: target.url, name: target.name, tags: "vault" });
      
      return ctx.editReply(`✅ Successfully added the sticker **${newSticker.name}** to this server's roster!`);
    } catch (err) {
      console.error("Sticker Create API error:", err);
      return ctx.editReply("❌ Failed to add sticker to this server. Most likely the server Sticker Slots are full, or Discord rejected the file type.");
    }
  }
};
