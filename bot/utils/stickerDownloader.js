const StickerBank = require("../database/models/StickerBank");
const crypto = require("crypto");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

/**
 * Downloads and registers a new sticker into the Global Bank
 * @param {string} name - Clean name for the sticker
 * @param {string} url - Discord CDN URL
 * @param {string} stickerID - Raw discord sticker ID
 * @param {import('discord.js').User} user - User stealing the sticker
 * @param {import('discord.js').Guild} guild - Source guild
 * @returns {Promise<{success: boolean, message: string, sticker?: any}>}
 */
async function storeStickerInBank(name, url, stickerID, user, guild) {
  try {
    const existingID = await StickerBank.findOne({ stickerID });
    if (existingID) {
      return { success: false, message: "This sticker is already registered in the Global Bank by exactly this ID." };
    }

    const response = await fetch(url);
    if (!response.ok) return { success: false, message: "Failed to download the sticker from Discord CDN." };

    let finalName = name.toLowerCase();
    const existingName = await StickerBank.findOne({ name: finalName });
    if (existingName) {
       finalName = `${finalName}_${Math.random().toString(36).substring(2, 6)}`;
    }

    // Determine format
    let format = "png";
    if (url.includes(".json") || url.includes("lottie")) format = "lottie";
    else if (url.includes(".apng")) format = "apng";
    else if (url.includes(".gif")) format = "gif"; // sometimes stickers are gifs

    const newSticker = await StickerBank.create({
      name: finalName,
      stickerID,
      url,
      format,
      addedBy: user.id,
      sourceGuild: guild.id
    });

    return { success: true, message: `Stored as \`${finalName}\``, sticker: newSticker };

  } catch (err) {
    console.error("Sticker Downloader Error:", err);
    return { success: false, message: "Database error occurred." };
  }
}

module.exports = { storeStickerInBank };
