/**
 * leaderboard.js — /eventleaderboard | j event lb <eventId>
 */

const { SlashCommandBuilder } = require('discord.js');
const { getRichLeaderboard } = require('../services/leaderboardEngine');
const Event = require('../models/Event');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  name: 'eventleaderboard',
  aliases: ['ev-lb', 'evlb', 'eventlb'],
  category: 'events',
  description: 'Show live leaderboard for an event with IGN and synergy',
  usage: '/eventleaderboard <eventId>  |  j event lb <eventId>',
  details: 'Shows rank, IGN (from Player model), points, and season synergy.',

  data: new SlashCommandBuilder()
    .setName('eventleaderboard')
    .setDescription('Show live leaderboard for an event')
    .addStringOption(o =>
      o.setName('eventid').setDescription('Event ID (e.g. cb-001)').setRequired(true)),

  async run(ctx) {
    const eventId = (ctx.options?.getString ? ctx.options.getString('eventid') : ctx.args[0])?.toLowerCase();
    if (!eventId) return ctx.reply('❌ Provide an event ID.\nUsage: `j event lb cb-001`');

    if (ctx.options?.getString) await ctx.defer();

    try {
      const event = await Event.findOne({ eventId, guildId: ctx.guildId || ctx.guild.id });
      if (!event) {
        const msg = { content: `❌ No event found with ID \`${eventId}\`.` };
        return ctx.options?.getString ? ctx.editReply(msg) : ctx.reply(msg);
      }

      const board = await getRichLeaderboard(eventId);

      if (board.length === 0) {
        const msg = { content: `📋 **${event.name}** has no participants yet.` };
        return ctx.options?.getString ? ctx.editReply(msg) : ctx.reply(msg);
      }

      const rows = board.slice(0, 20).map(entry => {
        const medal = MEDALS[entry.rank - 1] || `**#${entry.rank}**`;
        const ign = entry.ign ? `\`${entry.ign}\`` : `<@${entry.discordId}>`;
        return `${medal} ${ign} — **${entry.points} pts** *(Syn: ${entry.seasonSynergy})*`;
      });

      const embed = {
        embeds: [{
          color: 0xF1C40F,
          title: `🏆 Leaderboard — ${event.name}`,
          description: rows.join('\n'),
          fields: [
            { name: 'Event ID', value: `\`${eventId}\``, inline: true },
            { name: 'Status', value: event.status === 'active' ? '🟢 Active' : event.status === 'ended' ? '🔴 Ended' : '🕐 Upcoming', inline: true },
            { name: 'Participants', value: `${board.length}`, inline: true }
          ],
          footer: { text: 'Leaderboard as of' },
          timestamp: new Date()
        }]
      };

      ctx.options?.getString ? ctx.editReply(embed) : ctx.reply(embed);
    } catch (err) {
      const msg = { content: `❌ ${err.message}` };
      ctx.options?.getString ? ctx.editReply(msg) : ctx.reply(msg);
    }
  }
};
