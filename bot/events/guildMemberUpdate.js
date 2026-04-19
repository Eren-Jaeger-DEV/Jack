const configManager = require("../utils/configManager");
const Player = require("../database/models/Player");

module.exports = {
  name: "guildMemberUpdate",

  async execute(oldMember, newMember, client) {
    if (newMember.user.bot) return;

    try {
      const config = await configManager.getGuildConfig(newMember.guild.id);
      const clanRoleId = config?.settings?.clanMemberRoleId;

      if (!clanRoleId) return;

      const hadRole = oldMember.roles.cache.has(clanRoleId);
      const hasRole = newMember.roles.cache.has(clanRoleId);


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
