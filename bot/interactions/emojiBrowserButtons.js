const { PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const EmojiBank = require("../database/models/EmojiBank");
const StickerBank = require("../database/models/StickerBank");
const { renameItem, deleteItem, moveItemToPack } = require("../utils/emojiManager");

/**
 * Handles all interactions emitted by the Browser UI (Add, Rename, Delete, Pack Move)
 */
module.exports = async function emojiBrowserButtons(interaction) {
  try {
    const isAdd = interaction.customId.startsWith("browser_add_");
    const isRename = interaction.customId.startsWith("browser_rename_");
    const isDelete = interaction.customId.startsWith("browser_delete_");
    const isPack = interaction.customId.startsWith("browser_pack_");

    if (!isAdd && !isRename && !isDelete && !isPack) return;

    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
    
    if (!isAdd && !isAdmin) {
       return interaction.reply({ content: "❌ You don't have permission to manage the vault.", flags: 64 });
    }

    if (isAdd && !interaction.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
       return interaction.reply({ content: "❌ You need `Manage Emojis and Stickers` permission to download vault items to this server.", flags: 64 });
    }

    // Extract targetType (emoji/sticker) and idValue
    // customId format: browser_action_type_id
    // e.g., browser_rename_emoji_123456
    const parts = interaction.customId.split("_");
    const action = parts[1]; // rename, delete, pack, add
    const targetType = parts[2]; // emoji, sticker
    const idValue = parts.slice(3).join("_");

    if (action === "rename") {
        const modal = new ModalBuilder()
           .setCustomId(`modal_rename_${targetType}_${idValue}`)
           .setTitle(`Rename ${targetType === 'emoji' ? 'Emoji' : 'Sticker'}`);
        const nameInput = new TextInputBuilder()
           .setCustomId("new_name")
           .setLabel("New Name (lowercase, no spaces)")
           .setStyle(TextInputStyle.Short)
           .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
        return await interaction.showModal(modal);
    }

    if (action === "pack") {
        const modal = new ModalBuilder()
           .setCustomId(`modal_pack_${targetType}_${idValue}`)
           .setTitle(`Move to Pack`);
        const packInput = new TextInputBuilder()
           .setCustomId("pack_name")
           .setLabel("Target Pack Name (or 'none' to remove)")
           .setStyle(TextInputStyle.Short)
           .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(packInput));
        return await interaction.showModal(modal);
    }

    if (action === "delete") {
        await interaction.deferReply({ flags: 64 });
        const result = await deleteItem(targetType, idValue);
        return await interaction.editReply({ content: result.message });
    }

    if (action === "add") {
        await interaction.deferReply({ flags: 64 });
        try {
          if (targetType === "emoji") {
             const doc = await EmojiBank.findOne({ emojiID: idValue });
             if (!doc) return interaction.editReply("❌ This emoji is missing from the global database vault.");
             const newEmoji = await interaction.guild.emojis.create({ attachment: doc.url, name: doc.name });
             return interaction.editReply(`✅ Successfully downloaded ${newEmoji} to this server!`);
          } else if (targetType === "sticker") {
             const doc = await StickerBank.findOne({ stickerID: idValue });
             if (!doc) return interaction.editReply("❌ This sticker is missing from the global database vault.");
             const newSticker = await interaction.guild.stickers.create({ file: doc.url, name: doc.name, tags: "vault" });
             return interaction.editReply(`✅ Successfully downloaded sticker **${newSticker.name}** to this server!`);
          }
        } catch (err) {
           console.error(`${targetType} browser add error:`, err);
           return interaction.editReply(`❌ Failed to import. Discord likely rejected it due to limits.`);
        }
    }

  } catch (err) {
    console.error("emojiBrowserButtons error:", err);
    if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({ content: "⚠️ Something went wrong while processing your browser request.", flags: 64 }).catch(()=>{});
    }
  }
};
