const xpCache = require("../utils/xpCache");

const cooldown = new Map();

module.exports = async function levelHandler(message) {

  const key = `${message.guild.id}-${message.author.id}`;

  if (cooldown.has(key)) {

    const diff = Date.now() - cooldown.get(key);

    if (diff < 60000) return;

  }

  cooldown.set(key, Date.now());

  const xp = Math.floor(Math.random() * 11) + 15;

  xpCache.addXP(message.guild.id, message.author.id, xp);

};