const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType
} = require('discord.js');

const MEMBERS_PER_PAGE = 8;
const COLLECTOR_TIMEOUT = 120_000; // 2 minutes

module.exports = {

  name: 'memberlist',
  category: 'utility',
  description: 'List all server members with their roles',
  aliases: ['members', 'ml', 'memberroles'],
  usage: '/memberlist  |  j memberlist',
  details: 'Shows all server members with username, display name, nickname, user ID, and assigned roles — paginated.',

  data: new SlashCommandBuilder()
    .setName('memberlist')
    .setDescription('List all members with their roles')
    .addStringOption(option =>
      option.setName('role')
        .setDescription('Filter members by a specific role (mention or name)')
        .setRequired(false)
    ),

  async run(ctx) {

    // ── 1. Fetch all members ──────────────────────────────────────────────────
    await ctx.guild.members.fetch();

    let members = [...ctx.guild.members.cache.values()].filter(m => !m.user.bot);

    // ── 2. Optional role filter ───────────────────────────────────────────────
    let filterLabel = null;

    if (ctx.type === 'slash') {
      const roleInput = ctx.interaction.options.getString('role');
      if (roleInput) {
        const roleId   = roleInput.replace(/[<@&>]/g, '');
        const roleObj  = ctx.guild.roles.cache.get(roleId)
                      || ctx.guild.roles.cache.find(r => r.name.toLowerCase() === roleInput.toLowerCase());
        if (roleObj) {
          members    = members.filter(m => m.roles.cache.has(roleObj.id));
          filterLabel = roleObj.name;
        }
      }
    }

    if (members.length === 0) {
      return ctx.reply({
        content: filterLabel
          ? `❌ No members found with the role **${filterLabel}**.`
          : '❌ No non-bot members found in this server.',
        ephemeral: true
      });
    }

    // ── 3. Sort alphabetically by display name ────────────────────────────────
    members.sort((a, b) =>
      a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
    );

    // ── 4. Build pages ────────────────────────────────────────────────────────
    const pages = [];
    for (let i = 0; i < members.length; i += MEMBERS_PER_PAGE) {
      pages.push(members.slice(i, i + MEMBERS_PER_PAGE));
    }

    const totalPages = pages.length;
    let currentPage  = 0;

    // ── 5. Embed builder helper ───────────────────────────────────────────────
    const buildEmbed = (pageIndex) => {
      const pageMembers = pages[pageIndex];

      const embed = new EmbedBuilder()
        .setTitle(`👥 Member List${filterLabel ? ` — ${filterLabel}` : ''}`)
        .setColor(0x5865F2)
        .setFooter({
          text: `Page ${pageIndex + 1} of ${totalPages}  •  ${members.length} member${members.length !== 1 ? 's' : ''}`
        })
        .setTimestamp();

      for (const member of pageMembers) {
        const roles = member.roles.cache
          .filter(r => r.id !== ctx.guild.id)           // exclude @everyone
          .sort((a, b) => b.position - a.position)      // highest first
          .map(r => r.name);

        const roleDisplay = roles.length > 0
          ? roles.map(r => `\`${r}\``).join(', ')
          : '*No roles*';

        embed.addFields({
          name: `${member.displayName}`,
          value: [
            `> 👤 **Username:** \`${member.user.username}\``,
            `> 🏷️ **Display Name:** \`${member.displayName}\``,
            `> 💬 **Nickname:** \`${member.nickname || '—'}\``,
            `> 🆔 **User ID:** \`${member.user.id}\``,
            `> 🎭 **Roles:** ${roleDisplay}`
          ].join('\n'),
          inline: false
        });
      }

      return embed;
    };

    // ── 6. Button row builder helper ──────────────────────────────────────────
    const buildButtons = (pageIndex) => {
      const prev = new ButtonBuilder()
        .setCustomId('ml_prev')
        .setLabel('◀ Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex === 0);

      const next = new ButtonBuilder()
        .setCustomId('ml_next')
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex === totalPages - 1);

      const counter = new ButtonBuilder()
        .setCustomId('ml_count')
        .setLabel(`${pageIndex + 1} / ${totalPages}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true);

      return new ActionRowBuilder().addComponents(prev, counter, next);
    };

    // ── 7. Send first page ────────────────────────────────────────────────────
    const replyPayload = {
      embeds:     [buildEmbed(0)],
      components: totalPages > 1 ? [buildButtons(0)] : []
    };

    let sentMessage;
    if (ctx.type === 'slash') {
      await ctx.interaction.reply(replyPayload);
      sentMessage = await ctx.interaction.fetchReply();
    } else {
      sentMessage = await ctx.message.channel.send(replyPayload);
    }

    // ── 8. No need for collector if only one page ─────────────────────────────
    if (totalPages <= 1) return;

    // ── 9. Button collector ───────────────────────────────────────────────────
    const filter = (i) =>
      ['ml_prev', 'ml_next'].includes(i.customId) &&
      (i.user.id === ctx.user.id);

    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter,
      time: COLLECTOR_TIMEOUT
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'ml_prev') {
        currentPage = Math.max(0, currentPage - 1);
      } else {
        currentPage = Math.min(totalPages - 1, currentPage + 1);
      }

      await interaction.update({
        embeds:     [buildEmbed(currentPage)],
        components: [buildButtons(currentPage)]
      });
    });

    collector.on('end', async () => {
      try {
        const disabledPrev = new ButtonBuilder()
          .setCustomId('ml_prev')
          .setLabel('◀ Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);

        const disabledNext = new ButtonBuilder()
          .setCustomId('ml_next')
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);

        const pageLabel = new ButtonBuilder()
          .setCustomId('ml_count')
          .setLabel(`${currentPage + 1} / ${totalPages}`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true);

        await sentMessage.edit({
          components: [new ActionRowBuilder().addComponents(disabledPrev, pageLabel, disabledNext)]
        });
      } catch {
        // Message may have been deleted — ignore silently
      }
    });

  }

};
