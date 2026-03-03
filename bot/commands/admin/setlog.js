const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const GuildConfig = require('../../database/models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlog')
    .setDescription('Set the moderation log channel')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Select log channel')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');

    await GuildConfig.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { logChannelId: channel.id },
      { upsert: true }
    );

    interaction.reply(`✅ Log channel set to ${channel}`);
  }
};