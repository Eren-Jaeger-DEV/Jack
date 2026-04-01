const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const GuildConfig = require('../../../bot/database/models/GuildConfig');

module.exports = {
  name: 'setfoster',
  category: 'admin',
  description: 'Set the Foster Program channel',
  aliases: ['fosterchannel', 'foster-channel'],
  usage: 'j setfoster #channel',

  data: new SlashCommandBuilder()
    .setName('setfoster')
    .setDescription('Set the Foster Program channel')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Select the foster channel')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {
    if (!ctx.isInteraction && !ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return ctx.reply('❌ **Jack:** You lack the authority to configure my systems, noob.');
    }

    let channel;
    if (ctx.isInteraction) {
      channel = ctx.options.getChannel('channel');
    } else {
      channel = ctx.message.mentions.channels.first();
      if (!channel) return ctx.reply('❌ **Jack:** Mention a channel! Usage: `j setfoster #channel`');
    }

    await GuildConfig.findOneAndUpdate(
      { guildId: ctx.guild.id },
      { $set: { 'settings.fosterChannelId': channel.id } },
      { upsert: true }
    );

    await ctx.reply(`✅ **Jack:** Foster channel has been set to ${channel}. You can now run \`j fs-start\`.`);
  }
};
