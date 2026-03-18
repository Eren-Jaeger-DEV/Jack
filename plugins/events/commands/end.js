/**
 * end.js — /eventend
 *
 * The most critical command in the Event System.
 * - Ends the event (status: ended)
 * - Gets top winners via leaderboard engine
 * - Posts formatted result message to designated channel
 * - Rotates winner roles (strips old, assigns new)
 * - Sends prize claim instruction (clan battle only)
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Event = require('../models/Event');
const { getWinners } = require('../services/leaderboardEngine');
const { rotateWinnerRole } = require('../services/roleManager');
const { getEventConfig } = require('../services/eventManager');

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣'];

module.exports = {
  name: 'eventend',
  description: 'End an active event, post results, and assign winner roles',

  data: new SlashCommandBuilder()
    .setName('eventend')
    .setDescription('End an event and post the final results')
    .addStringOption(o =>
      o.setName('eventid')
        .setDescription('The Event ID (e.g. cb-001)')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async run(ctx) {
    const hasPerm = ctx.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
                    ctx.member.permissions.has(PermissionFlagsBits.Administrator);
    if (!hasPerm) return ctx.reply({ content: '❌ Only server managers can end events.', ephemeral: true });

    const eventId = ctx.options.getString('eventid').toLowerCase();

    await ctx.deferReply();

    try {
      const event = await Event.findOne({ eventId, guildId: ctx.guildId });
      if (!event) return ctx.editReply({ content: `❌ No event found with ID \`${eventId}\`.` });
      if (event.status !== 'active') return ctx.editReply({ content: `❌ Event \`${eventId}\` is not active (current: **${event.status}**).` });

      const config = getEventConfig(event.type);
      const maxWinners = config.maxWinners || 3;

      // Finalize event in DB
      event.status = 'ended';
      event.endAt = new Date();
      await event.save();

      // Fetch winners with enriched data
      const winners = await getWinners(eventId, maxWinners);

      if (winners.length === 0) {
        await ctx.editReply({ content: `⚠️ Event **${event.name}** ended with no participants.` });
        return;
      }

      // --- Build the result announcement ---
      const resultLines = winners.map((w, idx) => {
        const medal = MEDALS[idx] || `#${idx + 1}`;
        const ign = w.ign ? `**${w.ign}**` : `<@${w.discordId}>`;
        const reward = config.rewards[idx] ? ` — ${config.rewards[idx].label}` : '';
        return `${medal} ${ign} — **${w.points} pts**${reward}`;
      });

      const resultEmbed = {
        color: 0xF1C40F,
        title: `🏆 Results — ${event.name}`,
        description: resultLines.join('\n'),
        fields: [],
        footer: { text: `Event ended` },
        timestamp: new Date()
      };

      if (config.claimMessage) {
        resultEmbed.fields.push({
          name: '💰 Prize Claim',
          value: config.claimMessage
        });
      }

      // Post to designated event channel
      try {
        const resultChannel = await ctx.client.channels.fetch(event.channelId);
        if (resultChannel) {
          await resultChannel.send({ embeds: [resultEmbed] });
          // If clan battle, also ping winners
          if (event.type === 'clanBattle') {
            const pingLine = winners.map(w => `<@${w.discordId}>`).join(' ');
            await resultChannel.send(`Congratulations to our winners! 🎉\n${pingLine}`);
          }
        }
      } catch (err) {
        console.error('[EventSystem] Failed to post results to channel:', err.message);
      }

      // --- Role rotation ---
      const winnerRoleId = event.roles?.winnerRoleId;
      if (winnerRoleId) {
        const winnerIds = winners.map(w => w.discordId);
        await rotateWinnerRole(ctx.guild, winnerRoleId, winnerIds);
      }

      // Acknowledge back to the command issuer
      await ctx.editReply({
        embeds: [{
          color: 0x57F287,
          title: `✅ Event Ended — ${event.name}`,
          description: `Results have been posted in <#${event.channelId}>.\n${winnerRoleId ? `Winner roles assigned. ✅` : ''}`,
          fields: [
            { name: 'Winners', value: winners.map((w, i) => `${MEDALS[i] || `#${i+1}`} ${w.ign || `<@${w.discordId}>`}`).join('\n') }
          ],
          timestamp: new Date()
        }]
      });
    } catch (err) {
      console.error('[EventSystem] Event end error:', err);
      await ctx.editReply({ content: `❌ Error: ${err.message}` });
    }
  }
};
