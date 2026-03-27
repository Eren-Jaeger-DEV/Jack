/**
 * plugins/card-database/commands/sync.js
 *
 * Slash command: /card sync
 * Triggers the sync flow (same logic as the Sync Database button).
 */

'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { handleSync } = require('../handlers/syncHandler');

module.exports = {
  name: 'card',
  category: 'card-database',
  description: 'Card database management commands',

  data: new SlashCommandBuilder()
    .setName('card')
    .setDescription('Card database management')
    .addSubcommand(sub =>
      sub
        .setName('sync')
        .setDescription('Sync the card database from Discord threads')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {
    // Support only slash for this command
    if (ctx.type !== 'slash') return;

    const sub = ctx.options.getSubcommand();

    if (sub === 'sync') {
      return handleSync(ctx, ctx.client);
    }
  }
};
