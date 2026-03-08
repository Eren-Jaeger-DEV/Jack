const Afk = require("../database/models/Afk");

module.exports = async function afkHandler(message) {

  const member = message.member;

  /* ---------------- AFK RETURN ---------------- */

  const userAfk = await Afk.findOne({ userId: message.author.id });

  if (userAfk) {

    const diff = Date.now() - userAfk.since;
    const minutes = Math.floor(diff / 60000);

    await Afk.deleteOne({ userId: message.author.id });

    /* remove AFK nickname */

    if (member.nickname && member.nickname.startsWith("[AFK]")) {

      const newNick = member.nickname.replace("[AFK] ", "");

      await member.setNickname(newNick).catch(() => {});

    }

    message.reply(`Welcome back! You were AFK for **${minutes} minutes**.`);

  }

  /* ---------------- AFK MENTION CHECK ---------------- */

  const mentioned = message.mentions.users.first();

  if (mentioned) {

    const afkUser = await Afk.findOne({ userId: mentioned.id });

    if (afkUser) {

      const diff = Date.now() - afkUser.since;
      const minutes = Math.floor(diff / 60000);

      message.reply(
        `💤 ${mentioned.tag} is AFK: **${afkUser.reason}**\n⏱ AFK for **${minutes} minutes**`
      );

    }

  }

};