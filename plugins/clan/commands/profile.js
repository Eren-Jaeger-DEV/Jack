const Player = require("../../../bot/database/models/Player");
const profileService = require("../services/profileService");
const synergyService = require("../../seasonal-synergy/services/synergyService");
const { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags
} = require("discord.js");
const { resolveDisplayName } = require("../../../bot/utils/nameResolver");

module.exports = {

  name: "profile",
  category: "clan",
  description: "Show BGMI player profile",
  aliases: ["p","playerprofile"],
  usage: "/profile [@user]  |  j profile [@user]",
  details: "Shows a player's full BGMI profile card including IGN, UID, synergy, and level. Click 'View Achievements' for stats.",

  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Show BGMI player profile")
    .addUserOption(o =>
      o.setName("user")
          .setDescription("Profile")
          .setRequired(false)
    ),

  async run(ctx) {
    let user = ctx.options?.getUser?.("user") || ctx.message?.mentions?.users?.first() || ctx.user;
    const player = await Player.findOne({ discordId: user.id });

    if (!player) return ctx.reply("❌ Player not registered. Use `/register` first.");

    const displayName = await resolveDisplayName(ctx.guild, player.discordId, player.ign);
    const synergyData = await synergyService.getPlayerSynergy(user.id);

    const rankDisplay = (rank) => {
      if (!rank || rank <= 0) return "Unranked";
      if (rank === 1) return "🥇 #1";
      if (rank === 2) return "🥈 #2";
      if (rank === 3) return "🥉 #3";
      return `#${rank}`;
    };

    /* ── BUILD PROFILE V2 CONTAINER ── */
    const buildProfileContainer = async () => {
      const container = new ContainerBuilder();
      const isClan = player.serialNumber?.startsWith('JCM');
      
      // 1. Header
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`🎮 **${displayName}'s BGMI Profile**`)
      );

      container.addSeparatorComponents(new SeparatorBuilder());

      // 2. Core Stats
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `🆔 **Serial:** \`${player.serialNumber || "N/A"}\`\n` +
          `👤 **IGN:** \`${player.ign || "N/A"}\` | **UID:** \`${player.uid || "N/A"}\`\n` +
          `⭐ **Level:** \`${player.accountLevel || "N/A"}\` | **Modes:** \`${player.preferredModes?.join(", ") || "N/A"}\``
        )
      );

      container.addSeparatorComponents(new SeparatorBuilder());

      // 3. Synergy Stats
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `🔥 **Season Synergy:** \`${synergyData?.seasonSynergy || 0}\` (${rankDisplay(synergyData?.seasonRank)})\n` +
          `⚡ **Weekly Synergy:** \`${synergyData?.weeklySynergy || 0}\` (${rankDisplay(synergyData?.weeklyRank)})`
        )
      );

      // 4. Media Gallery (Screenshot)
      if (player.screenshot && player.screenshot.startsWith("http")) {
        container.addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(player.screenshot)
          )
        );
      }

      return container;
    };

    /* ── BUILD ACHIEVEMENTS V2 CONTAINER ── */
    const buildAchievementsContainer = () => {
      const container = new ContainerBuilder();
      const a = player.achievements || {};

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`🏆 **${displayName}'s Achievements**`)
      );

      container.addSeparatorComponents(new SeparatorBuilder());

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `⚔️ **Intra Clan:** Wins: \`${a.intraWins ?? 0}\`\n` +
          `🏰 **Clan Battle:** Wins: \`${a.clanBattleWins ?? 0}\` (Best Rank: \`${a.bestClanBattleRank !== 'N/A' ? '#' + a.bestClanBattleRank : 'N/A'}\`)\n` +
          `🤝 **Foster Program:** Part: \`${a.fosterParticipation ?? 0}\` | Wins: \`${a.fosterWins ?? 0}\`\n` +
          `⚡ **Synergy:** MVP: \`${a.weeklyMVPCount ?? 0}\` | Best Rank: \`${a.highestSeasonRank !== 'N/A' ? '#' + a.highestSeasonRank : 'N/A'}\``
        )
      );

      return container;
    };

    const profileRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`profile_achievements_${user.id}`).setLabel('View Achievements').setStyle(ButtonStyle.Primary).setEmoji('🏆')
    );

    const achievementsRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`profile_back_${user.id}`).setLabel('Back to Profile').setStyle(ButtonStyle.Secondary).setEmoji('⬅️')
    );

    const message = await ctx.reply({
      content: "",
      embeds: [],
      components: [await buildProfileContainer(), profileRow],
      flags: MessageFlags.IsComponentsV2,
      fetchReply: true
    });

    if (!message) return;

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== ctx.user.id) {
        return i.reply({ content: '❌ This interaction is not for you.', ephemeral: true });
      }
      try {
        if (i.customId === `profile_achievements_${user.id}`) {
          await i.update({ components: [buildAchievementsContainer(), achievementsRow], flags: MessageFlags.IsComponentsV2 });
        } else if (i.customId === `profile_back_${user.id}`) {
          await i.update({ components: [await buildProfileContainer(), profileRow], flags: MessageFlags.IsComponentsV2 });
        }
      } catch (err) {
        if (err?.code !== 10062) console.error('[Profile] Button error:', err.message);
      }
    });

    collector.on('end', async () => {
      try {
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('profile_expired').setLabel('Session Expired').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
        await message.edit({ components: [disabledRow] }).catch(() => {});
      } catch {}
    });
  }

};