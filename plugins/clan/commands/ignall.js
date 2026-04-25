const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require("discord.js");
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
    const PAGE_SIZE = 50; 
    const pages = [];
    
    for (let i = 0; i < igns.length; i += PAGE_SIZE) {
      pages.push(igns.slice(i, i + PAGE_SIZE));
    }

    let currentPage = 0;

    const generateContainer = (pageIndex) => {
      const currentList = pages[pageIndex];
      const startNum = (pageIndex * PAGE_SIZE) + 1;
      
      const formattedList = currentList.map((ign, idx) => `**${startNum + idx}.** ${ign}`).join('\n');

      const container = new ContainerBuilder();
      
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`📋 **All Database IGNs (${igns.length} Total)**`)
      );

      container.addSeparatorComponents(new SeparatorBuilder());

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(formattedList)
      );

      container.addSeparatorComponents(new SeparatorBuilder());

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`*Page ${pageIndex + 1} of ${pages.length}*`)
      );

      return container;
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
      components: [generateContainer(currentPage), ...(pages.length > 1 ? [getRow(currentPage)] : [])],
      flags: MessageFlags.IsComponentsV2,
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
        components: [generateContainer(currentPage), getRow(currentPage)],
        flags: MessageFlags.IsComponentsV2
      });
    });

    collector.on('end', () => {
      if (pages.length > 1) {
        const disabledRow = getRow(currentPage);
        disabledRow.components.forEach(c => c.setDisabled(true));
        message.edit({ 
          components: [generateContainer(currentPage), disabledRow],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => {});
      }
    });
  }
};
