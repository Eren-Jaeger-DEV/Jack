/**
 * addpoints.js — /eventaddpoints | j event addpoints <eventId> @user <points>
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addPoints } = require('../services/leaderboardEngine');

module.exports = {
  name: 'eventaddpoints',
  aliases: ['ev-addpts', 'evaddpoints', 'evpts'],
  category: 'events',
  description: 'Add or subtract points for a participant in an active event',
  usage: '/eventaddpoints <eventId> @user <points>  |  j event addpoints <eventId> @user <points>',
  details: 'Points are cumulative. Use a negative number to subtract.',

  data: new SlashCommandBuilder()
    .setName('eventaddpoints')
    .setDescription('Add points to a user in an active event')
    .addStringOption(o =>
      o.setName('eventid').setDescription('Event ID (e.g. cb-001)').setRequired(true))
    .addUserOption(o =>
      o.setName('user').setDescription('The participant').setRequired(true))
    .addIntegerOption(o =>
      o.setName('points').setDescription('Points to add (negative to subtract)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async run(ctx) {
    const hasPerm = ctx.member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
                    ctx.member.permissions.has(PermissionFlagsBits.Administrator);
    if (!hasPerm) return ctx.reply({ content: '❌ Only moderators can add event points.', ephemeral: true });

    let eventId, targetUser, points;

    if (ctx.options?.getString) {
      eventId = ctx.options.getString('eventid').toLowerCase();
      targetUser = ctx.options.getUser('user');
      points = ctx.options.getInteger('points');
    } else {
      eventId = ctx.args[0]?.toLowerCase();
      targetUser = ctx.message?.mentions?.users?.first();
      points = parseInt(ctx.args[2]);
    }

    if (!eventId || !targetUser || isNaN(points)) {
      return ctx.reply('❌ Usage: `j event addpoints cb-001 @user 850`');
    }

    if (ctx.options?.getString) await ctx.defer();

    try {
      const event = await addPoints(eventId, targetUser.id, points);
      const newTotal = event.points.get(targetUser.id) || 0;
      const rank = event.leaderboard.findIndex(e => e.discordId === targetUser.id) + 1;
      const sign = points >= 0 ? '+' : '';

      const replyData = {
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
      };

      if (ctx.options?.getString) {
        await ctx.editReply(replyData);
      } else {
        await ctx.reply(replyData);
      }
    } catch (err) {
      const msg = { content: `❌ ${err.message}` };
      if (ctx.options?.getString) await ctx.editReply(msg);
      else await ctx.reply(msg);
    }
  }
};
