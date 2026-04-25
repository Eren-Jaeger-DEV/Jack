const { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder
} = require('discord.js');
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

    await ctx.defer();

    try {
      const data = await hudService.getMemberHUDData(ctx.guild, target.id);
      const container = this.buildHUDContainer(target, data);
      const row = this.buildHUDButtons(target.id);

      await ctx.editReply({
        components: [container, row],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (err) {
      logger.error("HUD", `Failed to generate HUD for ${target.tag}: ${err.message}`);
      await ctx.editReply({ content: "❌ **System Error:** Failed to synchronize HUD telemetry." });
    }
  },

  /**
   * Build the premium HUD container.
   */
  buildHUDContainer(user, data) {
    const progressBar = this.generateProgressBar(data.leveling.progress);
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`🖥️ **Tactical Status: ${user.username.toUpperCase()}**`)
    );

    container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(user.displayAvatarURL({ size: 256 }))
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder());

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `🧬 **NEURAL STANDING**\n` +
        `**Level:** ${data.leveling.level}\n` +
        `**XP Progress:** ${data.leveling.progress}%\n` +
        `${progressBar}\n` +
        `\`${data.leveling.xpToNext} XP until next tier\``
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder());

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `⚡ **SYNERGY ARCHIVE**\n` +
        `**Weekly:** ${data.synergy.weekly.toLocaleString()}\n` +
        `**Season:** ${data.synergy.season.toLocaleString()}`
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder());

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `🤝 **FOSTER PROTOCOL**\n` +
        (data.foster ? `**Role:** ${data.foster.role}\n**Partner:** <@${data.foster.partnerId}>\n**Shared Pts:** ${data.foster.points}` : "*No active deployment*")
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder());

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`*Neural Identity Active | Strategic Asset ID: ${user.id}*`)
    );

    return container;
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
        .setDisabled(true)
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
