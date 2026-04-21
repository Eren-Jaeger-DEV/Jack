const Player = require("../../../bot/database/models/Player");
const profileService = require("../services/profileService");
const synergyService = require("../../seasonal-synergy/services/synergyService");
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
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

    /* GET TARGET USER */

    let user =
      ctx.options?.getUser?.("user") ||
      ctx.message?.mentions?.users?.first() ||
      ctx.user;

    const player = await Player.findOne({ discordId: user.id });

    if (!player)
      return ctx.reply("❌ Player not registered. Use `/register` first.");

    /* RESOLVE DISPLAY NAME */

    const displayName = await resolveDisplayName(ctx.guild, player.discordId, player.ign);

    /* GET SYNERGY DATA VIA SERVICE */

    const synergyData = await synergyService.getPlayerSynergy(user.id);

    /* MEDAL SYSTEM */

    const rankDisplay = (rank) => {
      if (!rank || rank <= 0) return "Unranked";
      if (rank === 1) return "🥇 #1";
      if (rank === 2) return "🥈 #2";
      if (rank === 3) return "🥉 #3";
      return `#${rank}`;
    };

    /* ── BUILD PROFILE EMBED ── */

    const buildProfileEmbed = async () => {
      const embed = new EmbedBuilder()
        .setTitle(`🎮 ${displayName}'s BGMI Profile`)
        .setColor("Blue")
        .addFields(
          { name: "Serial ID", value: `**${player.serialNumber || "N/A"}**`, inline: true },
          { name: "IGN", value: player.ign || "N/A", inline: true },
          { name: "UID", value: player.uid || "N/A", inline: true },
          { name: "Account Level", value: `${player.accountLevel || "N/A"}`, inline: true },

          { name: "Preferred Modes", value: player.preferredModes?.join(", ") || "N/A" },

          { name: "Season Synergy", value: `${synergyData?.seasonSynergy || 0}`, inline: true },
          { name: "Season Rank", value: rankDisplay(synergyData?.seasonRank), inline: true },

          { name: "Weekly Synergy", value: `${synergyData?.weeklySynergy || 0}`, inline: true },
          { name: "Weekly Rank", value: rankDisplay(synergyData?.weeklyRank), inline: true }
        )
        .setFooter({ text: "Jack Clan System" });

      if (player.screenshot) embed.setImage(player.screenshot);
      return embed;
    };

    /* ── BUILD ACHIEVEMENTS EMBED ── */

    const buildAchievementsEmbed = () => {
      const a = player.achievements || {};

      const intraWins = a.intraWins ?? 0;
      const clanBattleWins = a.clanBattleWins ?? 0;
      const bestRank = a.bestClanBattleRank ?? 'N/A';
      const fosterWins = a.fosterWins ?? 0;
      const participation = a.fosterParticipation ?? 0;
      const mvp = a.weeklyMVPCount ?? 0;
      const highestRank = a.highestSeasonRank ?? 'N/A';

      const embed = new EmbedBuilder()
        .setTitle(`🏆 ${displayName}'s Achievements`)
        .setColor("Gold")
        .addFields(
          { name: "⚔️ Intra Clan", value: `Wins: **${intraWins}**`, inline: true },
          { name: "🏰 Clan Battle", value: `Wins: **${clanBattleWins}**\nBest Rank: **${bestRank !== 'N/A' ? '#' + bestRank : 'N/A'}**`, inline: true },
          { name: '\u200b', value: '\u200b', inline: true },

          { name: "🤝 Foster Program", value: `Participations: **${participation}**\nWins: **${fosterWins}**`, inline: true },
          { name: "⚡ Synergy", value: `Weekly MVP: **${mvp}**\nBest Season Rank: **${highestRank !== 'N/A' ? '#' + highestRank : 'N/A'}**`, inline: true },
          { name: '\u200b', value: '\u200b', inline: true }
        )
        .setFooter({ text: "Jack Achievement Tracker" });

      return embed;
    };

    /* ── BUTTONS ── */

    const profileRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`profile_achievements_${user.id}`)
        .setLabel('View Achievements')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🏆')
    );

    const achievementsRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`profile_back_${user.id}`)
        .setLabel('Back to Profile')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⬅️')
    );

    /* ── SEND & COLLECT ── */

    const message = await ctx.reply({
      embeds: [await buildProfileEmbed()],
      components: [profileRow],
      fetchReply: true
    });

    if (!message) return;


    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000
    });

    collector.on('collect', async (i) => {
      // PATCH 4: Only the command invoker can use these buttons
      if (i.user.id !== ctx.user.id) {
        return i.reply({ content: '❌ This interaction is not for you.', ephemeral: true });
      }
      try {
        if (i.customId === `profile_achievements_${user.id}`) {
          await i.update({ embeds: [buildAchievementsEmbed()], components: [achievementsRow] });
        } else if (i.customId === `profile_back_${user.id}`) {
          await i.update({ embeds: [await buildProfileEmbed()], components: [profileRow] });
        }
      } catch (err) {
        if (err?.code !== 10062) console.error('[Profile] Button error:', err.message);
      }
    });

    collector.on('end', async () => {
      try {
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('profile_expired')
            .setLabel('Session Expired')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );
        await message.edit({ components: [disabledRow] }).catch(() => {});
      } catch {}
    });
  }

};