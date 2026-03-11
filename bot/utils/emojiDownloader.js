const EmojiBank = require("../database/models/EmojiBank");
const crypto = require("crypto");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

/**
 * Downloads and registers a new emoji into the Global Bank
 * @param {string} name - Clean name for the emoji
 * @param {string} url - Discord CDN URL
 * @param {string} emojiID - Raw discord emoji ID
 * @param {import('discord.js').User} user - User stealing the emoji
 * @param {import('discord.js').Guild} guild - Source guild
 * @param {Object} options - Extra metadata
 * @returns {Promise<{success: boolean, message: string, emoji?: any}>}
 */
async function storeEmojiInBank(name, url, emojiID, user, guild, options = {}) {
  try {
    // 1. Check ID uniqueness (Discord standardizes these IDs)
    const existingID = await EmojiBank.findOne({ emojiID });
    if (existingID) {
      return { success: false, message: "This emoji is already registered in the Global Bank by exactly this ID." };
    }

    // 2. Fetch the image to grab its hash
    const response = await fetch(url);
    if (!response.ok) return { success: false, message: "Failed to download the emoji from Discord CDN." };
    
    const buffer = await response.buffer();
    const hash = crypto.createHash("md5").update(buffer).digest("hex");
    
    // We could potentially check hashes here to stop identical uploads with different IDs, but sticking to unique name/IDs for now.
    // Let's enforce unique names per format to prevent search collision issues unless they are part of different packs later.
    // For now, if someone steals an emoji named `pepe` it works. If they steal another one named `pepe`, we could suffix it or reject.
    const existingName = await EmojiBank.findOne({ name: name.toLowerCase() });
    let finalName = name.toLowerCase();
    
    if (existingName) {
       // Suffix random characters to ensure unique global resolution via names
       finalName = `${finalName}_${Math.random().toString(36).substring(2, 6)}`;
    }

    const format = url.includes(".gif") ? "gif" : "png";

    const newEmoji = await EmojiBank.create({
      name: finalName,
      emojiID,
      url,
      format,
      addedBy: user.id,
      sourceGuild: guild.id,
      originalSource: options.originalSource || "discord_message",
      fileType: options.fileType || "unknown",
      convertedFormat: options.convertedFormat || "none"
    });

    return { success: true, message: `Stored as \`${finalName}\``, emoji: newEmoji };

  } catch (err) {
    console.error("Emoji Downloader Error:", err);
    return { success: false, message: "Database error occurred." };
  }
}

module.exports = { storeEmojiInBank };
