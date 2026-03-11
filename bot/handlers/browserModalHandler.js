const { renameItem, moveItemToPack } = require("../utils/emojiManager");

/**
 * Handles Modals dispatched from the interactive Vault Browser Admin UI
 */
module.exports = async function browserModalHandler(interaction) {
  
  if (!interaction.isModalSubmit()) return;

  // modal_rename_emoji_[ID] or modal_pack_sticker_[ID]
  const idStr = interaction.customId;

  if (idStr.startsWith("modal_rename_")) {
     await interaction.deferReply({ ephemeral: true });

     const newName = interaction.fields.getTextInputValue("new_name");
     
     const type = idStr.includes("_emoji_") ? "emoji" : "sticker";
     const prefixLength = `modal_rename_${type}_`.length;
     const dbID = idStr.substring(prefixLength);

     const result = await renameItem(type, dbID, newName);
     return interaction.editReply({ content: result.message });
  }

  if (idStr.startsWith("modal_pack_")) {
     await interaction.deferReply({ ephemeral: true });

     const packName = interaction.fields.getTextInputValue("pack_name");
     
     const type = idStr.includes("_emoji_") ? "emoji" : "sticker";
     const prefixLength = `modal_pack_${type}_`.length;
     const dbID = idStr.substring(prefixLength);

     if (type !== "emoji") {
        return interaction.editReply({ content: "❌ Packs are currently only supported for Emojis." });
     }

     const result = await moveItemToPack(dbID, packName);
     return interaction.editReply({ content: result.message });
  }

};
