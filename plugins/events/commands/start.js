/**
 * start.js — /eventstart | j event start <eventId>
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Event = require('../models/Event');

module.exports = {
  name: 'eventstart',
  aliases: ['ev-start', 'evstart'],
  category: 'events',
  description: 'Start a pending event and set it as active',
  usage: "/eventstart <eventId>  |  j event start <eventId>",
  details: "Transitions event from upcoming to active and posts announcement.",

  data: new SlashCommandBuilder()
    .setName('eventstart')
    .setDescription('Start a pending event')
    .addStringOption(o =>
      o.setName('eventid')
        .setDescription('Event ID (e.g. cb-001)')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async run(ctx) {
    const hasPerm = ctx.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
                    ctx.member.permissions.has(PermissionFlagsBits.Administrator);
    if (!hasPerm) return ctx.reply({ content: '❌ Only server managers can start events.', ephemeral: true });

    const eventId = (ctx.options?.getString ? ctx.options.getString('eventid') : ctx.args[0])?.toLowerCase();
    if (!eventId) return ctx.reply('❌ Provide an event ID.\nUsage: `j event start cb-001`');

    const event = await Event.findOne({ eventId, guildId: ctx.guildId || ctx.guild.id });
    if (!event) return ctx.reply(`❌ No event found with ID \`${eventId}\`.`);
    if (event.status === 'active') return ctx.reply(`⚠️ Event \`${eventId}\` is already active.`);
    if (event.status === 'ended') return ctx.reply(`❌ Event \`${eventId}\` has already ended.`);

    event.status = 'active';
    event.startAt = new Date();
    await event.save();

    try {
      const channel = await ctx.client.channels.fetch(event.channelId);
      if (channel) {
        await channel.send({
          embeds: [{
            color: 0x57F287,
            title: `🚀 Event Started — ${event.name}`,
            description: `This event is now **LIVE**!\nEvent ID: \`${eventId}\``,
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
        description: `\`${eventId}\` is now **active**.\nAdd points: \`j event addpoints ${eventId} @user <pts>\``,
        timestamp: new Date()
      }]
    });
  }
};
