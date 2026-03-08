const Level = require("../database/models/Level");
const xpCache = require("./xpCache");

module.exports = function xpWorker(client) {

  setInterval(async () => {

    const cache = xpCache.getAll();

    for (const data of cache.values()) {

      const { guildId, userId, xp } = data;

      const profile = await Level.findOneAndUpdate(
        { guildId, userId },
        { $inc: { xp: xp, weeklyXp: xp } },
        { upsert: true, new: true }
      );

      const nextLevelXp = 5 * (profile.level ** 2) + 50 * profile.level + 100;

      if (profile.xp >= nextLevelXp) {

        profile.level += 1;
        await profile.save();

        const guild = client.guilds.cache.get(guildId);
        if (!guild) continue;

        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) continue;

        const channel = guild.systemChannel;

        if (channel) {

          channel.send(
            `🎉 ${member} leveled up to **Level ${profile.level}!**`
          );

        }

      }

    }

    xpCache.clear();

  }, 300000);

};