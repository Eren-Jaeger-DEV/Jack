const xpCache = require("./xpCache");
const xpIgnoreChannels = require("./xpIgnoreChannels");

const cooldowns = new Map(); // "guildId-userId" -> Date.now()

module.exports = async function levelHandler(message) {
  if (!message || !message.guild) return;
  if (message.author?.bot) return;

  // Check if channel is ignored
  if (xpIgnoreChannels.includes(message.channel.id)) return;

  const key = `${message.guild.id}-${message.author.id}`;

  // Cooldown check: 10 seconds
  if (cooldowns.has(key)) {
    const diff = (Date.now() - cooldowns.get(key)) / 1000;
    if (diff < 10) return;
  }

  // Set cooldown
  cooldowns.set(key, Date.now());

  // Add 1 XP per message
  xpCache.addXP(message.guild.id, message.author.id, 1);
};
