const EmojiUsage = require("../database/models/EmojiUsage");

/**
 * Increments the usage count and updates the lastUsed timestamp for a specific emoji per user.
 */
async function trackUsage(emojiName, userID) {
  const normName = emojiName.toLowerCase().trim();
  
  try {
    const record = await EmojiUsage.findOneAndUpdate(
      { emojiName: normName, userID: userID },
      { 
        $inc: { usageCount: 1 },
        $set: { lastUsed: new Date() }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return record;
  } catch (err) {
    console.error("Failed to track emoji usage:", err);
    return null;
  }
}

module.exports = { trackUsage };
