const xpCache = new Map();

module.exports = {

  addXP(guildId, userId, amount) {

    const key = `${guildId}-${userId}`;

    if (!xpCache.has(key)) {

      xpCache.set(key, {
        guildId,
        userId,
        xp: 0
      });

    }

    xpCache.get(key).xp += amount;

  },

  getAll() {

    return xpCache;

  },

  clear() {

    xpCache.clear();

  }

};