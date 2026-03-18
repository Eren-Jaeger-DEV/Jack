const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const StickerBank = require("../../../bot/database/models/StickerBank");

module.exports = {

  name: "stickerremove",
  category: "sticker",
  description: "Remove a sticker from the global vault.",
  aliases: ["stickerdel","delsticker"],
  usage: "/stickerremove <name>  |  j sticker remove <name>",
  details: "Removes a sticker from the Global Vault permanently.",

  data: new SlashCommandBuilder()
    .setName("stickerremove")
    .setDescription("Remove a sticker from the global vault")
    .addStringOption(opt => opt.setName("stickername").setDescription("Name of the sticker to delete").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {
    
    if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return ctx.reply({ content: "❌ Only server administrators can permanently delete stickers from the global vault.", flags: 64 });
    }

    const stickerName = ctx.type === "slash" ? ctx.options.getString("stickername").toLowerCase() : ctx.args.join(" ").toLowerCase();

    if (!stickerName) return ctx.reply("❌ Please provide the name of the sticker to remove.");

    const stickerData = await StickerBank.findOne({ name: stickerName });
    if (!stickerData) {
      return ctx.reply(`❌ No sticker found natively matching \`${stickerName}\`.`);
    }

    await StickerBank.deleteOne({ stickerID: stickerData.stickerID });
    return ctx.reply(`✅ Permanently deleted \`${stickerName}\` from the Global Database Vault.`);

  }
};
