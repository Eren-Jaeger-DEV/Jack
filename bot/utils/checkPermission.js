const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  checkUser(member, permission) {
    return member.permissions.has(permission);
  },

  checkBot(guild, permission) {
    return guild.members.me.permissions.has(permission);
  }
};