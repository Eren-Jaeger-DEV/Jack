const EmojiPack = require("../database/models/EmojiPack");
const EmojiBank = require("../database/models/EmojiBank");

/**
 * Creates an empty pack in the database.
 */
async function createPack(packName, userID) {
  const normalized = packName.toLowerCase();
  const exists = await EmojiPack.findOne({ packName: normalized });
  if (exists) return { success: false, message: "Pack already exists." };
  
  const pack = await EmojiPack.create({
    packName: normalized,
    createdBy: userID
  });
  
  return { success: true, message: `Created pack \`${normalized}\``, pack };
}

/**
 * Adds an emoji to a pack.
 */
async function addEmojiToPack(emojiName, packName) {
  const packStr = packName.toLowerCase();
  const emojiStr = emojiName.toLowerCase();
  
  const pack = await EmojiPack.findOne({ packName: packStr });
  if (!pack) return { success: false, message: `Pack \`${packStr}\` does not exist.` };
  
  const emoji = await EmojiBank.findOne({ name: emojiStr });
  if (!emoji) return { success: false, message: `Emoji \`${emojiStr}\` not found in the global bank.` };
  
  if (pack.emojiList.includes(emoji.emojiID)) {
    return { success: false, message: "Emoji is already in this pack." };
  }
  
  pack.emojiList.push(emoji.emojiID);
  await pack.save();
  
  // Sync the emoji's pack marker
  emoji.pack = packStr;
  await emoji.save();
  
  return { success: true, message: `Added \`${emojiStr}\` to pack \`${packStr}\`.` };
}

/**
 * Uploads all emojis in a pack directly to a Discord server.
 */
async function importPackToServer(packName, guild) {
  const pack = await EmojiPack.findOne({ packName: packName.toLowerCase() });
  if (!pack) return { success: false, message: "Pack not found." };
  
  if (pack.emojiList.length === 0) return { success: false, message: "Pack is empty." };
  
  let successCount = 0;
  let failCount = 0;
  
  for (const emojiID of pack.emojiList) {
    const emojiData = await EmojiBank.findOne({ emojiID });
    if (!emojiData) continue;
    
    try {
      await guild.emojis.create({ attachment: emojiData.url, name: emojiData.name });
      successCount++;
    } catch (err) {
      failCount++;
      // Discord commonly throws rate limits or space full errors here
    }
  }
  
  return { success: true, message: `Imported ${successCount} emojis. Failed: ${failCount}` };
}

module.exports = { createPack, addEmojiToPack, importPackToServer };
