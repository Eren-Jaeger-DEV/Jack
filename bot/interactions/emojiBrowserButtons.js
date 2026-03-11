const { PermissionFlagsBits } = require("discord.js");
const EmojiBank = require("../database/models/EmojiBank");
const StickerBank = require("../database/models/StickerBank");

/**
 * Handles the "Add to Server" payload triggered by the Browser UI utility
 */
module.exports = async function emojiBrowserButtons(interaction) {

  // browser_add_emoji_[ID] OR browser_add_sticker_[ID]
  if (!interaction.customId.startsWith("browser_add_")) return;

  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
     return interaction.reply({ content: "❌ You need `Manage Emojis and Stickers` permission to download vault items to this server.", ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const isEmoji = interaction.customId.startsWith("browser_add_emoji_");
  const prefixLength = isEmoji ? "browser_add_emoji_".length : "browser_add_sticker_".length;
  const type = isEmoji ? "emoji" : "sticker";
  const idValue = interaction.customId.substring(prefixLength);

  try {
    if (type === "emoji") {
       const doc = await EmojiBank.findOne({ emojiID: idValue });
       if (!doc) return interaction.editReply("❌ This emoji is missing from the global database vault.");
       
       const newEmoji = await interaction.guild.emojis.create({ attachment: doc.url, name: doc.name });
       return interaction.editReply(`✅ Successfully downloaded ${newEmoji} to this server!`);
       
    } else if (type === "sticker") {
       const doc = await StickerBank.findOne({ stickerID: idValue });
       if (!doc) return interaction.editReply("❌ This sticker is missing from the global database vault.");
       
       const newSticker = await interaction.guild.stickers.create({ file: doc.url, name: doc.name, tags: "vault" });
       return interaction.editReply(`✅ Successfully downloaded sticker **${newSticker.name}** to this server!`);
    }

  } catch (err) {
     console.error(`${type} browser add error:`, err);
     return interaction.editReply(`❌ Failed to import. Discord likely rejected it due to file size, formatting, or the server's slot limits are maxed out.`);
  }

};
