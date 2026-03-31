const Afk = require("../database/models/Afk");

/**
 * Formats duration into a readable string (e.g., 2 hours and 5 minutes)
 * @param {number} ms 
 * @returns {string}
 */
function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);

    if (parts.length === 0) return 'less than a minute';
    if (parts.length === 1) return parts[0];
    const lastPart = parts.pop();
    return `${parts.join(', ')} and ${lastPart}`;
}

module.exports = async function afkHandler(message) {
  if (!message.guild || message.author.bot) return;

  const member = message.member;

  /* ---------------- AFK RETURN ---------------- */
  const userAfk = await Afk.findOne({ userId: message.author.id });

  if (userAfk) {
    const duration = formatDuration(Date.now() - userAfk.since);
    const pings = userAfk.pings || 0;

    await Afk.deleteOne({ userId: message.author.id });

    /* remove AFK nickname */
    if (member && member.nickname && member.nickname.startsWith("[AFK]")) {
      const newNick = member.nickname.replace("[AFK] ", "");
      await member.setNickname(newNick).catch(() => {});
    }

    let response = `Welcome back! You were AFK for **${duration}**`;
    if (pings > 0) {
      response += ` and were pinged **${pings}** time${pings === 1 ? '' : 's'} while you were away!`;
    } else {
      response += '.';
    }
    
    await message.reply(response);
  }

  /* ---------------- AFK MENTION CHECK ---------------- */
  if (message.mentions.users.size > 0) {
    for (const [userId, user] of message.mentions.users) {
      if (userId === message.author.id) continue;

      const afkUser = await Afk.findOne({ userId: userId });

      if (afkUser) {
        // Increment ping count in database
        afkUser.pings = (afkUser.pings || 0) + 1;
        await afkUser.save();

        const duration = formatDuration(Date.now() - afkUser.since);
        await message.reply(
          `💤 **${user.username}** is AFK: **${afkUser.reason}**\n⏱ AFK for **${duration}**`
        );
      }
    }
  }
};