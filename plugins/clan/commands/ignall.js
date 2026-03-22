const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const Player = require("../../../bot/database/models/Player");

module.exports = {
  name: "ignall",
  category: "clan",
  description: "View a list of all player IGNs in the database (Admin Only)",
  aliases: ["alligns", "listigns"],
  usage: "/ignall  |  j ignall",
  details: "Displays a paginated list of all player IGNs from the database.",

  data: new SlashCommandBuilder()
    .setName("ignall")
    .setDescription("View all player IGNs (Admin Only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {
    if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return ctx.reply({ content: "❌ You must be an administrator to use this command.", ephemeral: true });
    }

    // Fetch all players to list their IGNs
    const players = await Player.find({ ign: { $exists: true, $ne: null } }).sort({ ign: 1 });

    if (players.length === 0) {
      return ctx.reply("✅ The database is currently empty.");
    }

    const igns = players.map(p => p.ign).filter(Boolean);

    // Pagination setup
    const PAGE_SIZE = 50; // 50 IGNs per page to fit within Discord's embed limits
    const pages = [];
    
    for (let i = 0; i < igns.length; i += PAGE_SIZE) {
      pages.push(igns.slice(i, i + PAGE_SIZE));
    }

    let currentPage = 0;

    const generateEmbed = (pageIndex) => {
      const currentList = pages[pageIndex];
      const startNum = (pageIndex * PAGE_SIZE) + 1;
      
      const formattedList = currentList.map((ign, idx) => `**${startNum + idx}.** ${ign}`).join('\n');

      return new EmbedBuilder()
        .setTitle(`📋 All Database IGNs (${igns.length} Total)`)
        .setColor("Blue")
        .setDescription(formattedList)
        .setFooter({ text: `Page ${pageIndex + 1} of ${pages.length}` });
    };

    const getRow = (pageIndex) => {
      const row = new ActionRowBuilder();
      
      row.addComponents(
        new ButtonBuilder()
          .setCustomId("ignall_prev")
          .setLabel("Previous")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageIndex === 0)
      );

      row.addComponents(
        new ButtonBuilder()
          .setCustomId("ignall_next")
          .setLabel("Next")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageIndex === pages.length - 1)
      );

      return row;
    };

    const message = await ctx.reply({
      embeds: [generateEmbed(currentPage)],
      components: pages.length > 1 ? [getRow(currentPage)] : [],
      fetchReply: true
    });

    if (pages.length <= 1) return;

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120_000
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== ctx.user.id) {
        return i.reply({ content: "❌ You cannot use these buttons.", ephemeral: true });
      }

      if (i.customId === "ignall_prev" && currentPage > 0) {
        currentPage--;
      } else if (i.customId === "ignall_next" && currentPage < pages.length - 1) {
        currentPage++;
      }

      await i.update({
        embeds: [generateEmbed(currentPage)],
        components: [getRow(currentPage)]
      });
    });

    collector.on('end', () => {
      message.edit({ components: [] }).catch(() => {});
    });
  }
};
