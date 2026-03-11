const { PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const EmojiBank = require("../database/models/EmojiBank");
const StickerBank = require("../database/models/StickerBank");
const { renameItem, deleteItem, moveItemToPack } = require("../utils/emojiManager");

/**
 * Handles all interactions emitted by the Browser UI (Add, Rename, Delete, Pack Move)
 */
module.exports = async function emojiBrowserButtons(interaction) {
  try {
    // --- 1. Admin Action Selection (Dropdown) ---
    if (interaction.customId === "admin_select_action") {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ content: "❌ You don't have permission to manage the vault.", ephemeral: true });
        }

        // Value format: state_id e.g. select_rename_12345
        const selection = interaction.values[0];
        
        // Since sticker/emoji IDs can have underscores, we safely extract based on the prefix state
        let actionType = "";
        let idValue = "";
        
        if (selection.startsWith("select_rename_")) {
            actionType = "rename";
            idValue = selection.substring("select_rename_".length);
        } else if (selection.startsWith("select_delete_")) {
            actionType = "delete";
            idValue = selection.substring("select_delete_".length);
        } else if (selection.startsWith("select_pack_")) {
            actionType = "pack";
            idValue = selection.substring("select_pack_".length);
        }

        // Determine if it's an emoji or sticker for the target context
        // COMPONENT LOOKUP: Optimize with Promise.all to avoid cascading round trips
        const [isEmoji, isSticker] = await Promise.all([
           EmojiBank.findOne({ emojiID: idValue }),
           StickerBank.findOne({ stickerID: idValue })
        ]);
        
        let targetType;
        if (isEmoji) targetType = "emoji";
        else if (isSticker) targetType = "sticker";
        else {
           // Fallback: If it's a rename or pack, we might have passed the ID but it's not in DB?
           // This shouldn't happen unless DB was wiped while browser was open.
           return interaction.reply({ content: "❌ Failed to locate this item in the database. It may have been deleted.", ephemeral: true });
        }

        if (actionType === "rename") {
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

        if (actionType === "pack") {
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

        if (actionType === "delete") {
            await interaction.deferReply({ ephemeral: true });
            const result = await deleteItem(targetType, idValue);
            return await interaction.editReply({ content: result.message });
        }
    }

  // --- 2. Add to Server (Button) ---
  if (interaction.customId.startsWith("browser_add_")) {
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
       return interaction.editReply(`❌ Failed to import. Discord likely rejected it due to limits.`);
    }
  }

    } catch (err) {
    console.error("emojiBrowserButtons error:", err);
    if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({ content: "⚠️ Something went wrong while processing your browser request.", ephemeral: true }).catch(()=>{});
    }
  }
};
