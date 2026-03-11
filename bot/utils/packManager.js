const EmojiPack = require("../database/models/EmojiPack");
const EmojiBank = require("../database/models/EmojiBank");
const { getEmojiSlots } = require("./slotManager");

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
 * Evaluates slot constraints and optionally forcefully replaces oldest custom emojis.
 */
async function importPackToServer(packName, guild, forceReplace = false) {
  const pack = await EmojiPack.findOne({ packName: packName.toLowerCase() });
  if (!pack) return { success: false, message: "Pack not found." };
  
  if (pack.emojiList.length === 0) return { success: false, message: "Pack is empty." };
  
  // Pre-calculate demands
  const dbEmojis = await EmojiBank.find({ emojiID: { $in: pack.emojiList } });
  
  const animatedCount = dbEmojis.filter(e => e.format === "gif").length;
  const staticCount = dbEmojis.filter(e => e.format !== "gif").length;
  
  const slots = getEmojiSlots(guild);
  
  if (!forceReplace) {
     if (slots.animatedAvailable < animatedCount || slots.staticAvailable < staticCount) {
         return { 
           success: false, 
           needsReplacement: true, 
           message: `Not enough slots! This pack needs ${staticCount} static and ${animatedCount} animated slots.\nYou have ${slots.staticAvailable} static and ${slots.animatedAvailable} animated available.`
         };
     }
  } else {
     // If force replace is necessary to fit, purge older emojis
     if (slots.animatedAvailable < animatedCount) {
         const toDelete = animatedCount - slots.animatedAvailable;
         const animatedTargs = Array.from(guild.emojis.cache.filter(e => e.animated).values()).slice(0, toDelete);
         for (const targ of animatedTargs) await targ.delete("Replacing pack overflow");
     }
     if (slots.staticAvailable < staticCount) {
         const toDelete = staticCount - slots.staticAvailable;
         const staticTargs = Array.from(guild.emojis.cache.filter(e => !e.animated).values()).slice(0, toDelete);
         for (const targ of staticTargs) await targ.delete("Replacing pack overflow");
     }
  }

  let successCount = 0;
  let failCount = 0;
  
  for (const emojiData of dbEmojis) {
    try {
      await guild.emojis.create({ attachment: emojiData.url, name: emojiData.name });
      successCount++;
    } catch (err) {
      failCount++;
    }
  }
  
  return { success: true, message: `Imported ${successCount} emojis. Failed: ${failCount}` };
}

module.exports = { createPack, addEmojiToPack, importPackToServer };
