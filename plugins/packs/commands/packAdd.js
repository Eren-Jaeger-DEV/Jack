const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { addEmojiToPack } = require("../../../bot/utils/packManager");

module.exports = {

  name: "packadd",
  category: "packs",
  description: "Add an existing global emoji to an Emoji Pack",

  data: new SlashCommandBuilder()
    .setName("packadd")
    .setDescription("Moves an emoji into a specific Emoji Pack")
    .addStringOption(opt => opt.setName("emojiname").setDescription("Name of the emoji").setRequired(true))
    .addStringOption(opt => opt.setName("packname").setDescription("Name of the destination pack").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers),

  async run(ctx) {
    
    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return ctx.reply({ content: "❌ You need `Manage Emojis and Stickers` permission.", flags: 64 });
    }

    let emojiName, packName;

    if (ctx.type === "slash") {
      emojiName = ctx.options.getString("emojiname").toLowerCase();
      packName = ctx.options.getString("packname").toLowerCase();
    } else {
      if (ctx.args.length < 2) return ctx.reply("❌ Usage: `jack pack add <emojiName> <packName>`");
      emojiName = ctx.args[0].toLowerCase();
      packName = ctx.args[1].toLowerCase();
    }

    const result = await addEmojiToPack(emojiName, packName);
    return ctx.reply(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
  }
};
