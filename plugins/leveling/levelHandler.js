const Level = require("../../bot/database/models/Level");
const { handleLevelUp } = require("./utils/handleLevelUp");
const getLevelFromXP = require("./utils/getLevelFromXP");
const configManager = require("../../bot/utils/configManager");

const cooldowns = new Map(); // "guildId-userId" -> Date.now()

/**
 * Handles incoming messages for XP calculation and real-time level-up detection.
 * @param {Message} message Discord Message
 * @param {Client} client Discord Client
 */
module.exports = async function levelHandler(message, client) {
  if (!message || !message.guild) return;
  if (message.author?.bot) return;

  // Server Restriction: Only operate on guild 1341978655437619250
  if (message.guild.id !== "1341978655437619250") return;

  // Fetch dynamic configuration
  const config = await configManager.getGuildConfig(message.guild.id);
  const xpIgnoreChannels = config?.settings?.xpIgnoreChannels || [];

  // Check if channel is ignored
  if (xpIgnoreChannels.includes(message.channel.id)) return;

  const key = `${message.guild.id}-${message.author.id}`;

  // Cooldown check: 5 seconds (Reduced from 10s as requested)
  if (cooldowns.has(key)) {
    const diff = (Date.now() - cooldowns.get(key)) / 1000;
    if (diff < 5) return;
  }

  // Set cooldown
  cooldowns.set(key, Date.now());

  // Real-time Leveling: Update DB and check for level-up immediately
  try {
    let profile = await Level.findOne({ guildId: message.guild.id, userId: message.author.id });

    if (!profile) {
      profile = new Level({
        guildId: message.guild.id,
        userId: message.author.id,
        xp: 0,
        weeklyXp: 0,
        level: 0,
        lastMessage: new Date()
      });
    }

    const oldLevel = profile.level;
    profile.xp += 1;
    profile.weeklyXp += 1;
    profile.lastMessage = new Date();

    const newLevel = getLevelFromXP(profile.xp);

    if (newLevel > oldLevel) {
      profile.level = newLevel;
      // Trigger level-up instantly
      await handleLevelUp(client, message.guild.id, message.author.id, newLevel);
    }

    await profile.save();
  } catch (err) {
    console.error("Error in real-time levelHandler:", err);
  }
};

