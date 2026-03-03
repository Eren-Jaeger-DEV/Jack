const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Create advanced ticket panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_open')
        .setLabel('🎫 Open Ticket')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      content:
        '🎫 **Support Tickets**\nClick below to create a private support ticket.',
      components: [row]
    });
  }
};