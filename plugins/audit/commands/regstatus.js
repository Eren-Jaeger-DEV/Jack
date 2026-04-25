const { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType, 
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder
} = require('discord.js');
const Player = require('../../../bot/database/models/Player');

module.exports = {
  name: "regstatus",
  category: "audit",
  description: "Audit clan member registration status",
  aliases: ["rs"],
  usage: "/regstatus  |  j regstatus",
  details: "Audit clan member registration status",

  data: new SlashCommandBuilder()
    .setName("regstatus")
    .setDescription("Audit clan member registration status"),

  async run(ctx) {
    const configManager = require('../../../bot/utils/configManager');

    try {
      const config = await configManager.getGuildConfig(ctx.guild.id);
      const targetRoleId = config?.settings?.clanMemberRoleId;
      
      if (!targetRoleId) {
        return ctx.reply("❌ Target role (Clan Member) not configured.");
      }

      await ctx.guild.members.fetch();
      const role = ctx.guild.roles.cache.get(targetRoleId);
      
      if (!role) {
        return ctx.reply("❌ Target role not found on this server.");
      }

      const roleMembers = role.members;
      if (!roleMembers || roleMembers.size === 0) {
        return ctx.reply("❌ No members found with the target role.");
      }

      const allPlayers = await Player.find({}).select('discordId').lean();
      const registeredIds = new Set(allPlayers.map(p => p.discordId));

      const registered = [];
      const notRegistered = [];

      for (const [id, member] of roleMembers) {
        if (registeredIds.has(id)) registered.push(member);
        else notRegistered.push(member);
      }

      const totalMembers = roleMembers.size;
      const registeredCount = registered.length;
      const notRegisteredCount = notRegistered.length;
      const completionPercentage = totalMembers > 0 ? ((registeredCount / totalMembers) * 100).toFixed(1) : "0.0";

      const chunkArray = (arr, size) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
        return chunks;
      };

      const MAX_PER_PAGE = 25;
      const regChunks = chunkArray(registered, MAX_PER_PAGE);
      const unregChunks = chunkArray(notRegistered, MAX_PER_PAGE);

      const statsBlock = `**Total Members:** ${totalMembers}\n**Registered:** ${registeredCount} | **Unregistered:** ${notRegisteredCount}\n**Completion:** ${completionPercentage}%`;

      const pages = [];

      // ── BUILD UNREGISTERED PAGES ──
      if (unregChunks.length === 0) {
        const c = new ContainerBuilder();
        c.addTextDisplayComponents(new TextDisplayBuilder().setContent("📋 **Audit: Unregistered Members**"));
        c.addSeparatorComponents(new SeparatorBuilder());
        c.addTextDisplayComponents(new TextDisplayBuilder().setContent("All members are registered! 🎉\n\n" + statsBlock));
        pages.push(c);
      } else {
        unregChunks.forEach((chunk, idx) => {
          const c = new ContainerBuilder();
          const list = chunk.map(m => `<@${m.id}>`).join('\n') || "None";
          c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`📋 **Audit: Unregistered Members** ${unregChunks.length > 1 ? `(Page ${idx + 1}/${unregChunks.length})` : ''}`));
          c.addSeparatorComponents(new SeparatorBuilder());
          c.addTextDisplayComponents(new TextDisplayBuilder().setContent(list));
          c.addSeparatorComponents(new SeparatorBuilder());
          c.addTextDisplayComponents(new TextDisplayBuilder().setContent(statsBlock));
          pages.push(c);
        });
      }

      // ── BUILD REGISTERED PAGES ──
      if (regChunks.length === 0) {
        const c = new ContainerBuilder();
        c.addTextDisplayComponents(new TextDisplayBuilder().setContent("📋 **Audit: Registered Members**"));
        c.addSeparatorComponents(new SeparatorBuilder());
        c.addTextDisplayComponents(new TextDisplayBuilder().setContent("No members are currently registered.\n\n" + statsBlock));
        pages.push(c);
      } else {
        regChunks.forEach((chunk, idx) => {
          const c = new ContainerBuilder();
          const list = chunk.map(m => `<@${m.id}>`).join('\n') || "None";
          c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`📋 **Audit: Registered Members** ${regChunks.length > 1 ? `(Page ${idx + 1}/${regChunks.length})` : ''}`));
          c.addSeparatorComponents(new SeparatorBuilder());
          c.addTextDisplayComponents(new TextDisplayBuilder().setContent(list));
          c.addSeparatorComponents(new SeparatorBuilder());
          c.addTextDisplayComponents(new TextDisplayBuilder().setContent(statsBlock));
          pages.push(c);
        });
      }

      let currentPage = 0;

      const getRow = () => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('audit_prev')
            .setLabel('◀ Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId('audit_next')
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === pages.length - 1)
        );
      };

      const message = await ctx.reply({
        components: [pages[currentPage], ...(pages.length > 1 ? [getRow()] : [])],
        flags: MessageFlags.IsComponentsV2
      });

      if (!message || pages.length <= 1) return;

      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300_000
      });

      collector.on('collect', async (i) => {
        if (i.user.id !== ctx.user.id) {
          return i.reply({ content: '❌ You cannot use these buttons.', flags: [MessageFlags.Ephemeral] });
        }

        if (i.customId === 'audit_prev' && currentPage > 0) currentPage--;
        else if (i.customId === 'audit_next' && currentPage < pages.length - 1) currentPage++;

        await i.update({
          components: [pages[currentPage], getRow()]
        });
      });

      collector.on('end', async () => {
        try {
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('d1').setLabel('◀ Previous').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('d2').setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(true)
          );
          await message.edit({ 
            components: [pages[currentPage], disabledRow],
            flags: MessageFlags.IsComponentsV2 
          }).catch(() => {});
        } catch {}
      });

    } catch (error) {
      console.error("[Audit Command Error]", error);
      ctx.reply({ content: "❌ An error occurred while running the audit command." }).catch(() => {});
    }
  }
};
