/**
 * start.js — /eventstart
 * Transitions an event from 'upcoming' -> 'active' and optionally assigns participant roles.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Event = require('../models/Event');
const { assignParticipantRoles } = require('../services/roleManager');

module.exports = {
  name: 'eventstart',
  description: 'Start a created event and set it as active',

  data: new SlashCommandBuilder()
    .setName('eventstart')
    .setDescription('Start a pending event')
    .addStringOption(o =>
      o.setName('eventid')
        .setDescription('The Event ID (e.g. cb-001)')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async run(ctx) {
    const hasPerm = ctx.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
                    ctx.member.permissions.has(PermissionFlagsBits.Administrator);
    if (!hasPerm) return ctx.reply({ content: '❌ Only server managers can start events.', ephemeral: true });

    const eventId = ctx.options.getString('eventid').toLowerCase();
    const event = await Event.findOne({ eventId, guildId: ctx.guildId });

    if (!event) return ctx.reply({ content: `❌ No event found with ID \`${eventId}\`.`, ephemeral: true });
    if (event.status === 'active') return ctx.reply({ content: `⚠️ Event \`${eventId}\` is already active.`, ephemeral: true });
    if (event.status === 'ended') return ctx.reply({ content: `❌ Event \`${eventId}\` has already ended.`, ephemeral: true });

    event.status = 'active';
    event.startAt = new Date();
    await event.save();

    // Post announcement to the event's designated channel
    try {
      const channel = await ctx.client.channels.fetch(event.channelId);
      if (channel) {
        await channel.send({
          embeds: [{
            color: 0x57F287,
            title: `🚀 Event Started — ${event.name}`,
            description: `This event is now **LIVE**!\nEvent ID: \`${eventId}\`\nPoints will be tracked and updated in real-time.`,
            timestamp: new Date()
          }]
        });
      }
    } catch (err) {
      console.error('[EventSystem] Could not post start announcement:', err.message);
    }

    await ctx.reply({
      embeds: [{
        color: 0x57F287,
        title: `✅ Event Started — ${event.name}`,
        description: `\`${eventId}\` is now **active**.\nStart adding points with \`/eventaddpoints ${eventId} @user <points>\`.`,
        timestamp: new Date()
      }]
    });
  }
};
