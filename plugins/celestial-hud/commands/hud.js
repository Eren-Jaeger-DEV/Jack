const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const hudService = require('../services/hudDataService');
const logger = require('../../../utils/logger');

module.exports = {
  name: "hud",
  category: "utility",
  description: "Access your Celestial HUD (Live Status)",
  usage: "/hud  |  j hud",
  details: "Opens a real-time tactical dashboard showing your energy, level progress, and foster status.",

  data: new SlashCommandBuilder()
    .setName('hud')
    .setDescription('Access your Celestial HUD (Live Status)')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('View another asset\'s HUD')
        .setRequired(false)
    ),

  async run(ctx) {
    const target = ctx.options.getUser('target') || ctx.user;

    // Defer because multi-service aggregation might take a moment
    await ctx.defer();

    try {
      const data = await hudService.getMemberHUDData(ctx.guild, target.id);
      const embed = this.buildHUDEmbed(target, data);
      const row = this.buildHUDButtons(target.id);

      await ctx.editReply({
        embeds: [embed],
        components: [row]
      });
    } catch (err) {
      logger.error("HUD", `Failed to generate HUD for ${target.tag}: ${err.message}`);
      await ctx.editReply({ content: "❌ **System Error:** Failed to synchronize HUD telemetry." });
    }
  },

  /**
   * Build the premium HUD embed.
   */
  buildHUDEmbed(user, data) {
    const progressBar = this.generateProgressBar(data.leveling.progress);

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `CELESTIAL HUD v1.0`,
        iconURL: 'https://cdn-icons-png.flaticon.com/512/1067/1067562.png'
      })
      .setTitle(`🖥️ Tactical Status: ${user.username.toUpperCase()}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setColor('#00D2FF') // Celestial Blue
      .addFields(
        {
          name: '🧬 NEURAL STANDING',
          value: `**Level:** ${data.leveling.level}\n**XP Progress:** ${data.leveling.progress}%\n${progressBar}\n\`${data.leveling.xpToNext} XP until next tier\``,
          inline: false
        },
        {
          name: '⚡ SYNERGY ARCHIVE',
          value: `**Weekly:** ${data.synergy.weekly.toLocaleString()}\n**Season:** ${data.synergy.season.toLocaleString()}`,
          inline: true
        },
        {
          name: '🤝 FOSTER PROTOCOL',
          value: data.foster ? `**Role:** ${data.foster.role}\n**Partner:** <@${data.foster.partnerId}>\n**Shared Pts:** ${data.foster.points}` : "*No active deployment*",
          inline: true
        }
      )
      .setFooter({ text: `Neural Identity Active | Strategic Asset ID: ${user.id}` })
      .setTimestamp();

    return embed;
  },

  /**
   * Build HUD utility buttons.
   */
  buildHUDButtons(userId) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`hud_refresh_${userId}`)
        .setLabel('Synchronize Telemetry')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔄'),
      new ButtonBuilder()
        .setCustomId(`hud_profile_link`)
        .setLabel('Deep Audit')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true) // Placeholder for future full profile integration
    );
  },

  /**
   * Utility to generate a text-based progress bar.
   */
  generateProgressBar(percent) {
    const size = 15;
    const progress = Math.round((size * percent) / 100);
    const emptyProgress = size - progress;

    const progressText = '■'.repeat(progress);
    const emptyProgressText = '□'.repeat(emptyProgress);

    return `\`[${progressText}${emptyProgressText}]\``;
  }
};
