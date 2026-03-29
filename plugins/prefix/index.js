const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'Prefix Management',
  description: 'Manage server-specific prefixes with a master prefix override.',
  category: 'Utility',
  commands: ['./commands/prefix.js'],
  permissions: [PermissionFlagsBits.ManageGuild]
};
