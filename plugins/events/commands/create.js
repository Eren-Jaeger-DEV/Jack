/**
 * create.js — /eventcreate | j event create <type> <name>
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Event = require('../models/Event');
const { getEventConfig, getEventTypes, generateEventId } = require('../services/eventManager');

const VALID_TYPES = ['clanBattle', 'intraMatch', 'foster', 'seasonal', 'fun'];

module.exports = {
  name: 'eventcreate',
  aliases: ['ev-create', 'evcreate'],
  category: 'events',
  description: 'Create a new clan event',
  usage: "/eventcreate <type> <name>  |  j event create <type> <name>",
  details: "Types: clanBattle, intraMatch, foster, seasonal, fun",

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

    // Resolve args from slash or prefix
    let type, name;
    if (ctx.options?.getString) {
      type = ctx.options.getString('type');
      name = ctx.options.getString('name');
    } else {
      type = ctx.args[0];
      name = ctx.args.slice(1).join(' ');
    }

    if (!type || !VALID_TYPES.includes(type)) {
      return ctx.reply(`❌ Invalid type. Valid options: \`${VALID_TYPES.join(', ')}\`\nUsage: \`j event create clanBattle Week 3 Battle\``);
    }
    if (!name) return ctx.reply('❌ Please provide a name.\nUsage: `j event create clanBattle Week 3 Battle`');

    const config = getEventConfig(type);
    const existingCount = await Event.countDocuments({ type, guildId: ctx.guildId || ctx.guild.id });
    const eventId = generateEventId(type, existingCount);

    await Event.create({
      eventId,
      type,
      name,
      channelId: config.channelId,
      guildId: ctx.guildId || ctx.guild.id,
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
          { name: 'Next Step', value: `Run \`/eventstart ${eventId}\` or \`j event start ${eventId}\` to begin.` }
        ],
        footer: { text: `Created by ${ctx.user.tag}` },
        timestamp: new Date()
      }]
    });
  }
};
