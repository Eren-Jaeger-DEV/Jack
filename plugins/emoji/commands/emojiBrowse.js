const { SlashCommandBuilder } = require("discord.js");
const EmojiBank = require("../../../bot/database/models/EmojiBank");
const { spawnBrowserUI } = require("../../../bot/utils/browserUI");

module.exports = {

  name: "emojibrowse",
  category: "emoji",
  description: "Browse the visual interface of the Global Emoji Vault.",

  data: new SlashCommandBuilder()
    .setName("emojibrowse")
    .setDescription("Open the visual interactive emoji browser."),

  async run(ctx) {
    const emojis = await EmojiBank.find().sort({ createdAt: -1 });
    await spawnBrowserUI(ctx, emojis, "Emoji");
  }
};
