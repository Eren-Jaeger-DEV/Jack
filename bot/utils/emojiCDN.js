const EmojiBank = require("../database/models/EmojiBank");
const StickerBank = require("../database/models/StickerBank");
const { EmbedBuilder } = require("discord.js");

/**
 * Helper to fetch a single emoji by name or similar match.
 * Intended for the `j emoji pepe` global CDN feature.
 * @param {string} query 
 * @returns {Promise<any[]>} array of matches
 */
async function searchEmojiCDN(query) {
  const qStr = query.toLowerCase();
  
  // Try exact match first
  let matches = await EmojiBank.find({ name: qStr }).limit(25);
  
  if (matches.length === 0) {
    // Try partial match
    matches = await EmojiBank.find({ name: { $regex: qStr, $options: 'i' } }).limit(25);
  }
  
  return matches;
}

/**
 * Formats a Discord embed containing an emoji image url.
 * @param {any} emojiDoc 
 * @returns {import('discord.js').EmbedBuilder}
 */
function buildEmojiEmbed(emojiDoc) {
  return new EmbedBuilder()
    .setTitle(`Emoji: ${emojiDoc.name}`)
    .setImage(emojiDoc.url)
    .setColor("Random")
    .setFooter({ text: `Pack: ${emojiDoc.pack} | ID: ${emojiDoc.emojiID}` });
}

module.exports = { searchEmojiCDN, buildEmojiEmbed };
