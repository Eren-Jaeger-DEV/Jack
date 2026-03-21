const Player = require("../database/models/Player");

const CLAN_ROLE_ID = "1477856665817714699"; // Explicitly derived clan role

module.exports = {
  name: "guildMemberUpdate",

  async execute(oldMember, newMember, client) {
    if (newMember.user.bot) return;

    try {
      const hadRole = oldMember.roles.cache.has(CLAN_ROLE_ID);
      const hasRole = newMember.roles.cache.has(CLAN_ROLE_ID);

      // Trigger tracking only if the role state shifted
      if (!hadRole && hasRole) {
        await Player.findOneAndUpdate(
          { discordId: newMember.id },
          { 
            isClanMember: true,
            username: newMember.user.username,
            avatar: newMember.user.avatar
          },
          { upsert: true, setDefaultsOnInsert: true }
        ).catch(() => null);

      } else if (hadRole && !hasRole) {
        // User lost the role
        await Player.findOneAndUpdate(
          { discordId: newMember.id },
          { 
            isClanMember: false,
            username: newMember.user.username,
            avatar: newMember.user.avatar
          }
        ).catch(() => null);
      }
    } catch (err) {
      console.error("[Clan Role Tracking Error]", err);
    }
  }
};
