const xpCache = new Map();

module.exports = {
  addXP(guildId, userId, amount) {
    const key = `${guildId}-${userId}`;
    if (!xpCache.has(key)) {
      xpCache.set(key, { guildId, userId, xp: 0, weeklyXp: 0, lastMessage: new Date() });
    }
    const data = xpCache.get(key);
    data.xp += amount;
    data.weeklyXp += amount;
    data.lastMessage = new Date();
  },
  get(key) {
    return xpCache.get(key);
  },
  getAll() {
    return xpCache;
  },
  clear() {
    xpCache.clear();
  }
};
