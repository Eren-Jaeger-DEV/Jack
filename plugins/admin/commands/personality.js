/**
 * plugins/admin/commands/personality.js
 * 
 * Interactive Dashboard for Jack's Personality Engine.
 */

const { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require('discord.js');
const GuildConfig = require('../../../bot/database/models/GuildConfig');

module.exports = {
  name: 'personality',
  category: 'admin',
  description: 'Interactive dashboard to configure Jack\'s Personality Engine',
  aliases: ['persona', 'traits'],
  usage: 'j personality',

  async run(ctx) {
    if (!ctx.member.permissions.has('Administrator') && ctx.member.id !== process.env.OWNER_ID) {
      return ctx.reply('❌ You do not have permission to configure my personality.');
    }

    let config = await GuildConfig.findOne({ guildId: ctx.guild.id });
    if (!config) config = new GuildConfig({ guildId: ctx.guild.id });
    if (!config.settings.personality) {
      config.settings.personality = { tone: "calm", humor: 10, strictness: 60, verbosity: 40, respect_bias: 60 };
      await config.save();
    }

    const p = config.settings.personality;

    // -- BUILD V2 UI --
    const mainContainer = new ContainerBuilder();

    // 1. Header Section
    mainContainer.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent("🧠 **Jack AI: Personality Engine v2**")
        )
    );

    mainContainer.addSeparatorComponents(new SeparatorBuilder());

    // 2. Traits Section
    const traitsSection = new SectionBuilder();
    const traitsText = 
      `🎭 **Tone:** \`${p.tone.toUpperCase()}\`\n` +
      `😂 **Humor:** \`${p.humor}%\` | ⚡ **Strictness:** \`${p.strictness}%\`\n` +
      `🗣️ **Verbosity:** \`${p.verbosity}%\` | 🤝 **Respect Bias:** \`${p.respect_bias}%\``;

    traitsSection.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(traitsText)
    );
    mainContainer.addSectionComponents(traitsSection);

    mainContainer.addSeparatorComponents(new SeparatorBuilder());

    // 3. Status Section
    mainContainer.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent("⚙️ *Use the controls below to modify my core runtime traits.*")
        )
    );

    // -- Action Rows --
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('persona_preset_select')
      .setPlaceholder('Select a Quick Preset')
      .addOptions([
        { label: 'Default / Tactical', description: 'Calm tone, balanced traits.', value: 'tactical' },
        { label: 'Enforcement Mode', description: 'Cold tone, highly strict, low humor.', value: 'enforcement' },
        { label: 'Assistive Mode', description: 'Calm tone, highly verbose, high respect.', value: 'assistive' }
      ]);

    const btnRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('persona_edit_traits')
        .setLabel('⚙️ Edit Traits')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('persona_edit_tone')
        .setLabel('🎭 Edit Tone')
        .setStyle(ButtonStyle.Secondary)
    );

    await ctx.reply({ 
      content: "", 
      embeds: [], 
      components: [mainContainer, new ActionRowBuilder().addComponents(selectMenu), btnRow],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
