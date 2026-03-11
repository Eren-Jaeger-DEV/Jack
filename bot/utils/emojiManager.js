const EmojiBank = require("../database/models/EmojiBank");
const StickerBank = require("../database/models/StickerBank");
const EmojiPack = require("../database/models/EmojiPack");

/**
 * Validates alphanumeric naming conventions securely.
 */
function isValidName(name) {
  return /^[a-z0-9_]+$/.test(name);
}

/**
 * Renames a target item securely.
 */
async function renameItem(type, id, newName) {
  const normalized = newName.toLowerCase().trim();
  if (!isValidName(normalized) || normalized.includes(" ")) {
     return { success: false, message: "Name must be lowercase alphanumeric with no spaces." };
  }

  const Model = type === "emoji" ? EmojiBank : StickerBank;
  const idField = type === "emoji" ? "emojiID" : "stickerID";

  // Check if taken
  const taken = await Model.findOne({ name: normalized });
  if (taken) {
     return { success: false, message: `The name \`${normalized}\` is already taken globally.` };
  }

  const doc = await Model.findOne({ [idField]: id });
  if (!doc) return { success: false, message: "Target document missing from database." };

  const oldName = doc.name;
  doc.name = normalized;
  await doc.save();

  return { success: true, message: `Successfully renamed \`${oldName}\` to \`${normalized}\`.` };
}

/**
 * Deletes an item cleanly.
 */
async function deleteItem(type, id) {
  const Model = type === "emoji" ? EmojiBank : StickerBank;
  const idField = type === "emoji" ? "emojiID" : "stickerID";

  const doc = await Model.findOne({ [idField]: id });
  if (!doc) return { success: false, message: "Target document missing from database." };

  // Scrap pack traces for emojis
  if (type === "emoji" && doc.pack !== "none") {
      const pack = await EmojiPack.findOne({ packName: doc.pack });
      if (pack) {
         pack.emojiList = pack.emojiList.filter(pid => pid !== doc.emojiID);
         await pack.save();
      }
  }

  await Model.deleteOne({ [idField]: id });
  return { success: true, message: `Deleted \`${doc.name}\` permanently.` };
}

/**
 * Edits the pack assignment for an emoji cleanly.
 */
async function moveItemToPack(id, targetPack) {
  const normPack = targetPack.toLowerCase().trim();
  
  const doc = await EmojiBank.findOne({ emojiID: id });
  if (!doc) return { success: false, message: "Target emoji missing from database." };

  if (normPack === "none") {
      // Purge link
      if (doc.pack !== "none") {
         const oldPack = await EmojiPack.findOne({ packName: doc.pack });
         if (oldPack) {
            oldPack.emojiList = oldPack.emojiList.filter(pid => pid !== doc.emojiID);
            await oldPack.save();
         }
      }
      doc.pack = "none";
      await doc.save();
      return { success: true, message: `Removed \`${doc.name}\` from packs.` };
  }

  // Assign to valid pack
  const pack = await EmojiPack.findOne({ packName: normPack });
  if (!pack) return { success: false, message: `The pack \`${normPack}\` does not exist.` };

  // Remove from old pack
  if (doc.pack !== "none" && doc.pack !== normPack) {
      const oldPack = await EmojiPack.findOne({ packName: doc.pack });
      if (oldPack) {
         oldPack.emojiList = oldPack.emojiList.filter(pid => pid !== doc.emojiID);
         await oldPack.save();
      }
  }

  doc.pack = normPack;
  await doc.save();

  if (!pack.emojiList.includes(doc.emojiID)) {
      pack.emojiList.push(doc.emojiID);
      await pack.save();
  }

  return { success: true, message: `Moved \`${doc.name}\` to the \`${normPack}\` pack.` };
}

module.exports = { renameItem, deleteItem, moveItemToPack };
