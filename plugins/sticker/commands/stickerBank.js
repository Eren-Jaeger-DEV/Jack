const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const StickerBank = require("../../../bot/database/models/StickerBank");

module.exports = {

  name: "stickerbank",
  category: "sticker",
  description: "View the Global Sticker Bank list.",
  aliases: ["stickerlist","stickers"],
  usage: '/stickerbank  |  j sticker bank',
  details: 'Shows a text list of all stickers in the Global Vault.',

  data: new SlashCommandBuilder()
    .setName("stickerbank")
    .setDescription("View all stickers saved in the Global Vault."),

  async run(ctx) {
    const stickers = await StickerBank.find().sort({ createdAt: -1 });

    if (stickers.length === 0) {
      return ctx.reply("❌ The Sticker Vault is empty.");
    }

    const embed = new EmbedBuilder()
      .setTitle("🏦 Global Sticker Bank")
      .setColor("Fuchsia")
      .setDescription(`Found **${stickers.length}** stickers currently secured in the global MongoDB vault.\nUse \`/stickerbrowse\` to visually explore them.`)
      .setFooter({ text: "Listing the 10 most recently stolen stickers." });

    const recent = stickers.slice(0, 10);
    for (const e of recent) {
      embed.addFields({ name: e.name, value: `[Link](${e.url}) | ID: \`${e.stickerID}\`` });
    }

    return ctx.reply({ embeds: [embed] });
  }
};
