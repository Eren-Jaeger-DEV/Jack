const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

module.exports = {

  name: "ticketpanel",
  category: "admin",
  description: "Create the ticket panel",
  aliases: ["ticket","tickets"],
  usage: '/ticketpanel  |  j ticketpanel',
  details: 'Creates the ticket creation panel in the designated channel.',

  data: new SlashCommandBuilder()
    .setName("ticketpanel")
    .setDescription("Create advanced ticket panel")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {

    const embed = new EmbedBuilder()
      .setTitle("🎫 Support Tickets")
      .setDescription("Click the button below to create a private support ticket.")
      .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_open")
        .setLabel("Open Ticket")
        .setEmoji("🎫")
        .setStyle(ButtonStyle.Primary)
    );

    await ctx.reply({
      embeds: [embed],
      components: [row]
    });

  }

};