const EmojiBank = require("../database/models/EmojiBank");
const { getEmojiSlots } = require("./slotManager");
const { trackUsage } = require("./usageTracker");

/**
 * Uploads an emoji from the Global Bank to the Guild temporarily.
 * Auto-deletes it after `durationMs` (default 10 mins).
 */
async function spawnTempEmoji(guild, emojiName, durationMs = 600000, requestingUserId) {
  const normName = emojiName.toLowerCase().trim();
  
  const doc = await EmojiBank.findOne({ name: normName });
  if (!doc) return { success: false, message: `Emoji \`${normName}\` not found in the global vault.` };

  const isAnimated = doc.format === "gif";
  const slots = getEmojiSlots(guild);

  if (isAnimated && slots.animatedAvailable <= 0) {
      return { success: false, message: "Server has no animated emoji slots available for a temporary spawn." };
  } else if (!isAnimated && slots.staticAvailable <= 0) {
      return { success: false, message: "Server has no static emoji slots available for a temporary spawn." };
  }

  try {
     const newEmoji = await guild.emojis.create({
         attachment: doc.url,
         name: `temp_${doc.name.substring(0, 20)}`
     });

     // Track usage
     if (requestingUserId) {
         await trackUsage(doc.name, requestingUserId);
     }

     // Setup auto-destruct
     setTimeout(async () => {
         try {
            // Re-fetch to ensure it wasn't already deleted manually
            const check = await guild.emojis.fetch(newEmoji.id);
            if (check) await check.delete("Temporary emoji lifespan expired.");
         } catch (err) {
            // Typically means it was already deleted
         }
     }, durationMs);

     return { success: true, emoji: newEmoji, message: `Successfully spawned **${newEmoji}**! It will self-destruct in ${durationMs / 60000} minutes.` };

  } catch (err) {
      console.error("Temp Emoji Error:", err);
      return { success: false, message: "Failed to upload the custom emoji. Discord rejected the request." };
  }
}

module.exports = { spawnTempEmoji };
