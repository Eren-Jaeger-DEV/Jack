/**
 * addpoints.js — /eventaddpoints
 * Manually adds a specified number of points to a user within an active event.
 * Recalculates the leaderboard automatically after every change.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addPoints } = require('../services/leaderboardEngine');

module.exports = {
  name: 'eventaddpoints',
  description: 'Add points to a participant in an active event',

  data: new SlashCommandBuilder()
    .setName('eventaddpoints')
    .setDescription('Add points to a user in an active event')
    .addStringOption(o =>
      o.setName('eventid')
        .setDescription('The Event ID (e.g. cb-001)')
        .setRequired(true))
    .addUserOption(o =>
      o.setName('user')
        .setDescription('The participant to add points to')
        .setRequired(true))
    .addIntegerOption(o =>
      o.setName('points')
        .setDescription('Points to add (use negative to subtract)')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async run(ctx) {
    const hasPerm = ctx.member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
                    ctx.member.permissions.has(PermissionFlagsBits.Administrator);
    if (!hasPerm) return ctx.reply({ content: '❌ Only moderators can add event points.', ephemeral: true });

    const eventId = ctx.options.getString('eventid').toLowerCase();
    const targetUser = ctx.options.getUser('user');
    const points = ctx.options.getInteger('points');

    await ctx.deferReply();

    try {
      const event = await addPoints(eventId, targetUser.id, points);

      const newTotal = event.points.get(targetUser.id) || 0;
      const rank = event.leaderboard.findIndex(e => e.discordId === targetUser.id) + 1;

      const sign = points >= 0 ? '+' : '';
      await ctx.editReply({
        embeds: [{
          color: points >= 0 ? 0x57F287 : 0xED4245,
          title: `${points >= 0 ? '📈' : '📉'} Points Updated — ${event.name}`,
          fields: [
            { name: 'Player', value: `<@${targetUser.id}>`, inline: true },
            { name: 'Change', value: `**${sign}${points}**`, inline: true },
            { name: 'New Total', value: `**${newTotal}** pts`, inline: true },
            { name: 'Current Rank', value: `#${rank}`, inline: true }
          ],
          footer: { text: `Updated by ${ctx.user.tag}` },
          timestamp: new Date()
        }]
      });
    } catch (err) {
      await ctx.editReply({ content: `❌ ${err.message}` });
    }
  }
};
