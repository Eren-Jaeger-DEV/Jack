const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require('discord.js');

module.exports = {

  name: "ticketpanel",
  category: "admin",
  description: "Create the advanced ticket panel with category selection",
  aliases: ["ticket", "tickets"],
  usage: "/ticketpanel",

  data: new SlashCommandBuilder()
    .setName("ticketpanel")
    .setDescription("Create advanced ticket panel with dropdown options")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {

    const embed = new EmbedBuilder()
      .setTitle("🎫 Support Ticketing System")
      .setDescription(
        "Welcome to our support center. Please select the most relevant category from the dropdown menu below to open a private ticket."
      )
      .addFields(
        { name: "🎁 Reward Collection", value: "Claim your event rewards or prizes.", inline: true },
        { name: "⚠️ Complaints & Issues", value: "Report bugs, players, or any other issues.", inline: true },
        { name: "📩 Management / Owner", value: "Directly contact the server leadership team.", inline: true }
      )
      .setColor("#2b2d31")
      .setFooter({ text: "Please use tickets responsibly." });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("ticket_category_select")
      .setPlaceholder("Select a ticket category...")
      .addOptions([
        {
          label: "Reward Collection",
          value: "reward_collection",
          description: "Claim your prizes or rewards.",
          emoji: "🎁"
        },
        {
          label: "Complaints or Issues",
          value: "complaints_issues",
          description: "Report a problem or a player.",
          emoji: "⚠️"
        },
        {
          label: "Contact Management",
          value: "owner_management",
          description: "Talk directly to the higher-ups.",
          emoji: "📩"
        }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await ctx.reply({
      embeds: [embed],
      components: [row]
    });

  }

};
