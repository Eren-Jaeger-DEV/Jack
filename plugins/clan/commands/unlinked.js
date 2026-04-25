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
  name: "unlinked",
  category: "clan",
  description: "View all unlinked player profiles (Admin Only)",
  aliases: ["unlinkedprofiles", "listunlinked"],
  usage: "/unlinked  |  j unlinked",
  details: "Displays a paginated list of all manually created profiles that have not yet been linked to a Discord user.",

  data: new SlashCommandBuilder()
    .setName("unlinked")
    .setDescription("View all unlinked player profiles (Admin Only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {
    if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return ctx.reply({ content: "❌ You must be an administrator to use this command.", ephemeral: true });
    }

    const unlinkedProfiles = await Player.find({ status: "unlinked" }).sort({ createdAt: -1 });

    if (unlinkedProfiles.length === 0) {
      return ctx.reply("✅ There are no unlinked profiles currently.");
    }

    // Pagination setup
    const PAGE_SIZE = 10;
    const pages = [];
    
    for (let i = 0; i < unlinkedProfiles.length; i += PAGE_SIZE) {
      pages.push(unlinkedProfiles.slice(i, i + PAGE_SIZE));
    }

    let currentPage = 0;

    const generateContainer = (pageIndex) => {
      const currentList = pages[pageIndex];
      const container = new ContainerBuilder();
      
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`📋 **Unlinked Profiles (${unlinkedProfiles.length} Total)**`)
      );

      container.addSeparatorComponents(new SeparatorBuilder());

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent("These profiles were manually created and have no linked Discord user. Use `/profiletransfer` to link them.")
      );

      container.addSeparatorComponents(new SeparatorBuilder());

      const listItems = currentList.map((p, idx) => {
        const index = (pageIndex * PAGE_SIZE) + idx + 1;
        const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Unknown';
        return `**${index}. ${p.ign || 'Unknown IGN'}**\n**UID:** ${p.uid || 'N/A'}\n**Level:** ${p.accountLevel || 'N/A'} | **Created:** ${dateStr}`;
      });

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(listItems.join('\n\n'))
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
          .setCustomId("unlinked_prev")
          .setLabel("Previous")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageIndex === 0)
      );

      row.addComponents(
        new ButtonBuilder()
          .setCustomId("unlinked_next")
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

      // Acknowledge immediately to prevent timeout
      await i.deferUpdate().catch(() => {});

      if (i.customId === "unlinked_prev" && currentPage > 0) {
        currentPage--;
      } else if (i.customId === "unlinked_next" && currentPage < pages.length - 1) {
        currentPage++;
      }

      await i.editReply({
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
