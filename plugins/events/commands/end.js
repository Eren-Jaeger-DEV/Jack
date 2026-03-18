/**
 * end.js — /eventend | j event end <eventId>
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Event = require('../models/Event');
const { getWinners } = require('../services/leaderboardEngine');
const { rotateWinnerRole } = require('../services/roleManager');
const { getEventConfig } = require('../services/eventManager');

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣'];

module.exports = {
  name: 'eventend',
  aliases: ['ev-end', 'evend'],
  category: 'events',
  description: 'End an event, post final results, and assign winner roles',
  usage: '/eventend <eventId>  |  j event end <eventId>',
  details: 'Sorts leaderboard, picks winners, posts to event channel, rotates winner role.',

  data: new SlashCommandBuilder()
    .setName('eventend')
    .setDescription('End an event and post the final results')
    .addStringOption(o =>
      o.setName('eventid').setDescription('Event ID (e.g. cb-001)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async run(ctx) {
    const hasPerm = ctx.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
                    ctx.member.permissions.has(PermissionFlagsBits.Administrator);
    if (!hasPerm) return ctx.reply({ content: '❌ Only server managers can end events.', ephemeral: true });

    const eventId = (ctx.options?.getString ? ctx.options.getString('eventid') : ctx.args[0])?.toLowerCase();
    if (!eventId) return ctx.reply('❌ Provide an event ID.\nUsage: `j event end cb-001`');

    if (ctx.options?.getString) await ctx.defer();

    try {
      const event = await Event.findOne({ eventId, guildId: ctx.guildId || ctx.guild.id });
      if (!event) {
        const msg = { content: `❌ No event found with ID \`${eventId}\`.` };
        return ctx.options?.getString ? ctx.editReply(msg) : ctx.reply(msg);
      }
      if (event.status !== 'active') {
        const msg = { content: `❌ Event \`${eventId}\` is not active (current: **${event.status}**).` };
        return ctx.options?.getString ? ctx.editReply(msg) : ctx.reply(msg);
      }

      const config = getEventConfig(event.type);
      event.status = 'ended';
      event.endAt = new Date();
      await event.save();

      const winners = await getWinners(eventId, config.maxWinners || 3);
      if (winners.length === 0) {
        const msg = { content: `⚠️ Event **${event.name}** ended with no participants.` };
        return ctx.options?.getString ? ctx.editReply(msg) : ctx.reply(msg);
      }

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
        fields: config.claimMessage ? [{ name: '💰 Prize Claim', value: config.claimMessage }] : [],
        footer: { text: 'Event ended' },
        timestamp: new Date()
      };

      try {
        const resultChannel = await ctx.client.channels.fetch(event.channelId);
        if (resultChannel) {
          await resultChannel.send({ embeds: [resultEmbed] });
          if (event.type === 'clanBattle') {
            const pingLine = winners.map(w => `<@${w.discordId}>`).join(' ');
            await resultChannel.send(`Congratulations to our winners! 🎉\n${pingLine}`);
          }
        }
      } catch (err) {
        console.error('[EventSystem] Failed to post results:', err.message);
      }

      const winnerRoleId = event.roles?.winnerRoleId;
      if (winnerRoleId) {
        await rotateWinnerRole(ctx.guild, winnerRoleId, winners.map(w => w.discordId));
      }

      const ackEmbed = {
        embeds: [{
          color: 0x57F287,
          title: `✅ Event Ended — ${event.name}`,
          description: `Results posted in <#${event.channelId}>.\n${winnerRoleId ? 'Winner roles assigned. ✅' : ''}`,
          fields: [{ name: 'Winners', value: winners.map((w, i) => `${MEDALS[i] || `#${i+1}`} ${w.ign || `<@${w.discordId}>`}`).join('\n') }],
          timestamp: new Date()
        }]
      };

      ctx.options?.getString ? ctx.editReply(ackEmbed) : ctx.reply(ackEmbed);
    } catch (err) {
      console.error('[EventSystem] Event end error:', err);
      const msg = { content: `❌ Error: ${err.message}` };
      ctx.options?.getString ? ctx.editReply(msg) : ctx.reply(msg);
    }
  }
};
