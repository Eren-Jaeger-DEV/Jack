const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const GuildConfig = require('../../database/models/GuildConfig');

module.exports = {

  name: "setlog",
  category: "admin",
  description: "Set the moderation log channel",

  data: new SlashCommandBuilder()
    .setName('setlog')
    .setDescription('Set the moderation log channel')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Select log channel')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {

    const channel = interaction.options.getChannel('channel');

    await GuildConfig.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { logChannelId: channel.id },
      { upsert: true }
    );

    await interaction.reply({
      content: `✅ Log channel set to ${channel}`,
      ephemeral: true
    });

  }

};