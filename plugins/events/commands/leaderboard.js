/**
 * leaderboard.js — /eventleaderboard
 * Displays the real-time enriched leaderboard for any active or ended event.
 * Pulls IGN and synergy data from the Player model via leaderboardEngine.
 */

const { SlashCommandBuilder } = require('discord.js');
const { getRichLeaderboard } = require('../services/leaderboardEngine');
const Event = require('../models/Event');

// Medal emojis for top 3 positions
const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  name: 'eventleaderboard',
  description: 'Show the live leaderboard for an event',

  data: new SlashCommandBuilder()
    .setName('eventleaderboard')
    .setDescription('Show live leaderboard for an event')
    .addStringOption(o =>
      o.setName('eventid')
        .setDescription('The Event ID (e.g. cb-001)')
        .setRequired(true)),

  async run(ctx) {
    const eventId = ctx.options.getString('eventid').toLowerCase();

    await ctx.deferReply();

    try {
      const event = await Event.findOne({ eventId, guildId: ctx.guildId });
      if (!event) return ctx.editReply({ content: `❌ No event found with ID \`${eventId}\`.` });

      const board = await getRichLeaderboard(eventId);

      if (board.length === 0) {
        return ctx.editReply({ content: `📋 **${event.name}** has no participants yet.` });
      }

      // Build the leaderboard text (max 20 shown)
      const rows = board.slice(0, 20).map(entry => {
        const medal = MEDALS[entry.rank - 1] || `**#${entry.rank}**`;
        const ign = entry.ign ? `\`${entry.ign}\`` : `<@${entry.discordId}>`;
        return `${medal} ${ign} — **${entry.points} pts** *(Synergy: ${entry.seasonSynergy})*`;
      });

      const embed = {
        color: 0xF1C40F,
        title: `🏆 Leaderboard — ${event.name}`,
        description: rows.join('\n'),
        fields: [
          { name: 'Event ID', value: `\`${eventId}\``, inline: true },
          { name: 'Status', value: event.status === 'active' ? '🟢 Active' : event.status === 'ended' ? '🔴 Ended' : '🕐 Upcoming', inline: true },
          { name: 'Participants', value: `${board.length}`, inline: true }
        ],
        footer: { text: `Leaderboard as of` },
        timestamp: new Date()
      };

      await ctx.editReply({ embeds: [embed] });
    } catch (err) {
      await ctx.editReply({ content: `❌ ${err.message}` });
    }
  }
};
