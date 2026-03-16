const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const EmojiBank = require("../../../bot/database/models/EmojiBank");

module.exports = {

  name: "emojibank",
  category: "emoji",
  description: "View the Global Emoji Bank list.",

  data: new SlashCommandBuilder()
    .setName("emojibank")
    .setDescription("View all emojis saved in the Global Vault."),

  async run(ctx) {
    const emojis = await EmojiBank.find().sort({ createdAt: -1 });

    if (emojis.length === 0) {
      return ctx.reply("❌ The Emoji Vault is completely empty. Try stealing some with `j steal`!");
    }

    const embed = new EmbedBuilder()
      .setTitle("🏦 Global Emoji Bank")
      .setColor("Green")
      .setDescription(`Found **${emojis.length}** emojis currently secured in the global MongoDB vault.\nUse \`/emojibrowse\` to visually explore them, or \`/packimport\` to download packs.`)
      .setFooter({ text: "Listing the 10 most recently stolen emojis." });

    const recent = emojis.slice(0, 10);
    for (const e of recent) {
      embed.addFields({ name: e.name, value: `Pack: \`${e.pack}\` | [Link](${e.url}) | ID: \`${e.emojiID}\`` });
    }

    return ctx.reply({ embeds: [embed] });
  }
};
