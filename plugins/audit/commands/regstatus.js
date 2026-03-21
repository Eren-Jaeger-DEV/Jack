const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Player = require('../../../bot/database/models/Player');

module.exports = {
  name: "regstatus",
  category: "audit",
  description: "Audit clan member registration status",
  aliases: ["rs"],
  usage: "/regstatus  |  j regstatus",

  data: new SlashCommandBuilder()
    .setName("regstatus")
    .setDescription("Audit clan member registration status"),

  async run(ctx) {
    try {
      const TARGET_ROLE_ID = '1477856665817714699';
      
      // Fetch members safely
      await ctx.guild.members.fetch();
      const role = ctx.guild.roles.cache.get(TARGET_ROLE_ID);
      
      if (!role) {
        return ctx.reply("❌ Target role not found on this server.");
      }

      const roleMembers = role.members;
      
      if (!roleMembers || roleMembers.size === 0) {
        return ctx.reply("❌ No members found with the target role.");
      }

      // Fetch DB players once
      const allPlayers = await Player.find({}).select('discordId').lean();
      const registeredIds = new Set(allPlayers.map(p => p.discordId));

      const registered = [];
      const notRegistered = [];

      for (const [id, member] of roleMembers) {
        if (registeredIds.has(id)) {
          registered.push(member);
        } else {
          notRegistered.push(member);
        }
      }

      const totalMembers = roleMembers.size;
      const registeredCount = registered.length;
      const notRegisteredCount = notRegistered.length;
      const completionPercentage = totalMembers > 0 
        ? ((registeredCount / totalMembers) * 100).toFixed(1)
        : "0.0";

      const chunkArray = (arr, size) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
          chunks.push(arr.slice(i, i + size));
        }
        return chunks;
      };

      const MAX_PER_PAGE = 25;
      const regChunks = chunkArray(registered, MAX_PER_PAGE);
      const unregChunks = chunkArray(notRegistered, MAX_PER_PAGE);

      const pages = [];
      const statsBlock = `**Total:** ${totalMembers}\n**Registered:** ${registeredCount}\n**Unregistered:** ${notRegisteredCount}\n**Completion:** ${completionPercentage}%`;

      // ── BUILD REGISTERED PAGES ──
      if (regChunks.length === 0) {
        pages.push(
          new EmbedBuilder()
            .setTitle("📋 Audit: Registered Members")
            .setColor("Green")
            .setDescription("No members are currently registered.")
            .addFields({ name: "📊 Statistics", value: statsBlock })
        );
      } else {
        regChunks.forEach((chunk, idx) => {
          const list = chunk.map(m => `<@${m.id}>`).join('\n') || "None";
          pages.push(
             new EmbedBuilder()
              .setTitle(`📋 Audit: Registered Members ${regChunks.length > 1 ? `(Page ${idx + 1}/${regChunks.length})` : ''}`)
              .setColor("Green")
              .setDescription(list)
              .addFields({ name: "📊 Statistics", value: statsBlock })
          );
        });
      }

      // ── BUILD UNREGISTERED PAGES ──
      if (unregChunks.length === 0) {
        pages.push(
          new EmbedBuilder()
            .setTitle("📋 Audit: Unregistered Members")
            .setColor("Red")
            .setDescription("All members are registered! 🎉")
            .addFields({ name: "📊 Statistics", value: statsBlock })
        );
      } else {
        unregChunks.forEach((chunk, idx) => {
          const list = chunk.map(m => `<@${m.id}>`).join('\n') || "None";
          pages.push(
            new EmbedBuilder()
              .setTitle(`📋 Audit: Unregistered Members ${unregChunks.length > 1 ? `(Page ${idx + 1}/${unregChunks.length})` : ''}`)
              .setColor("Red")
              .setDescription(list)
              .addFields({ name: "📊 Statistics", value: statsBlock })
          );
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
        embeds: [pages[currentPage]],
        components: pages.length > 1 ? [getRow()] : [],
        fetchReply: true
      });

      if (!message || pages.length <= 1) return;

      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300_000 // 5 mins
      });

      collector.on('collect', async (i) => {
        if (i.user.id !== ctx.user.id) {
          return i.reply({ content: '❌ You cannot use these buttons.', ephemeral: true });
        }

        if (i.customId === 'audit_prev' && currentPage > 0) {
          currentPage--;
        } else if (i.customId === 'audit_next' && currentPage < pages.length - 1) {
          currentPage++;
        }

        await i.update({
          embeds: [pages[currentPage]],
          components: [getRow()]
        });
      });

      collector.on('end', async () => {
        try {
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('d1').setLabel('◀ Previous').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('d2').setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(true)
          );
          await message.edit({ components: [disabledRow] }).catch(() => {});
        } catch {}
      });

    } catch (error) {
      console.error("[Audit Command Error]", error);
      ctx.reply({ content: "❌ An error occurred while running the audit command." }).catch(() => {});
    }
  }
};
