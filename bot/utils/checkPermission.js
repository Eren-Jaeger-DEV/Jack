const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  checkUser(member, permission) {
    return member.permissions.has(permission);
  },

  checkBot(guild, permission) {
    return guild.members.me.permissions.has(permission);
  },

  checkHierarchy(moderator, target) {
    if (!moderator || !target) return false;
    return moderator.roles.highest.position > target.roles.highest.position;
  },

  checkBotHierarchy(guild, target) {
    if (!guild || !target) return false;
    return guild.members.me.roles.highest.position > target.roles.highest.position;
  }
};