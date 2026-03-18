const { SlashCommandBuilder } = require("discord.js");
const StickerBank = require("../../../bot/database/models/StickerBank");
const { spawnBrowserUI } = require("../../../bot/utils/browserUI");

module.exports = {

  name: "stickerbrowse",
  category: "sticker",
  description: "Browse the visual interface of the Global Sticker Vault.",
  aliases: ["stickervault","browsesticker"],
  usage: "/stickerbrowse  |  j sticker browse",
  details: "Opens a visual paginated browser for the Global Sticker Vault.",

  data: new SlashCommandBuilder()
    .setName("stickerbrowse")
    .setDescription("Open the visual interactive sticker browser."),

  async run(ctx) {
    const stickers = await StickerBank.find().sort({ createdAt: -1 });
    await spawnBrowserUI(ctx, stickers, "Sticker");
  }
};
