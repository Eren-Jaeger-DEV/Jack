/**
 * create.js — /event create
 * Creates a new Event document in MongoDB using the type's default config.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Event = require('../models/Event');
const { getEventConfig, getEventTypes, generateEventId } = require('../services/eventManager');

module.exports = {
  name: 'eventcreate',
  description: 'Create a new clan event',

  data: new SlashCommandBuilder()
    .setName('eventcreate')
    .setDescription('Create a new clan event')
    .addStringOption(o =>
      o.setName('type')
        .setDescription('Type of event')
        .setRequired(true)
        .addChoices(...getEventTypes()))
    .addStringOption(o =>
      o.setName('name')
        .setDescription('Display name for this event (e.g. "Week 3 Clan Battle")')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async run(ctx) {
    const hasPerm = ctx.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
                    ctx.member.permissions.has(PermissionFlagsBits.Administrator);
    if (!hasPerm) return ctx.reply({ content: '❌ Only server managers can create events.', ephemeral: true });

    const type = ctx.options.getString('type');
    const name = ctx.options.getString('name');
    const config = getEventConfig(type);

    if (!config) return ctx.reply({ content: '❌ Invalid event type.', ephemeral: true });

    // Count existing events of this type to generate sequential ID
    const existingCount = await Event.countDocuments({ type, guildId: ctx.guildId });
    const eventId = generateEventId(type, existingCount);

    const event = await Event.create({
      eventId,
      type,
      name,
      channelId: config.channelId,
      guildId: ctx.guildId,
      roles: config.roles,
      rewards: config.rewards,
      status: 'upcoming',
      createdBy: ctx.user.id
    });

    await ctx.reply({
      embeds: [{
        color: 0x5865F2,
        title: `📋 Event Created — ${name}`,
        fields: [
          { name: 'Event ID', value: `\`${eventId}\``, inline: true },
          { name: 'Type', value: config.name, inline: true },
          { name: 'Status', value: '🕐 Upcoming', inline: true },
          { name: 'Result Channel', value: `<#${config.channelId}>`, inline: false },
          { name: 'How to Start', value: `Run \`/eventstart ${eventId}\` to begin.` }
        ],
        footer: { text: `Created by ${ctx.user.tag}` },
        timestamp: new Date()
      }]
    });
  }
};
