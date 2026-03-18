const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const EmojiBank = require("../../../bot/database/models/EmojiBank");
const EmojiPack = require("../../../bot/database/models/EmojiPack");

module.exports = {

  name: "packremove",
  category: "packs",
  description: "Remove an emoji from its Emoji Pack",
  aliases: ["removepack","packdelete"],
  usage: '/packremove <packName> <emojiName>  |  j pack remove <packName> <emojiName>',
  details: 'Removes an emoji from an emoji pack.',

  data: new SlashCommandBuilder()
    .setName("packremove")
    .setDescription("Unlinks an emoji from its pack")
    .addStringOption(opt => opt.setName("emojiname").setDescription("Name of the emoji").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers),

  async run(ctx) {
    
    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return ctx.reply({ content: "❌ You need `Manage Emojis and Stickers` permission.", flags: 64 });
    }

    const emojiName = ctx.type === "slash" ? ctx.options.getString("emojiname").toLowerCase() : ctx.args[0]?.toLowerCase();

    if (!emojiName) return ctx.reply("❌ Usage: `/packremove <emojiName>`");

    const emoji = await EmojiBank.findOne({ name: emojiName });
    if (!emoji) return ctx.reply(`❌ Emoji \`${emojiName}\` not found in global bank.`);

    if (emoji.pack === "none") return ctx.reply(`❌ Emoji \`${emojiName}\` is not in any pack.`);

    const pack = await EmojiPack.findOne({ packName: emoji.pack });
    if (pack) {
      pack.emojiList = pack.emojiList.filter(id => id !== emoji.emojiID);
      await pack.save();
    }

    const oldPackName = emoji.pack;
    emoji.pack = "none";
    await emoji.save();

    return ctx.reply(`✅ Removed \`${emojiName}\` from the \`${oldPackName}\` pack.`);
  }
};
