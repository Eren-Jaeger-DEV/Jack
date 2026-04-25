/**
 * plugins/admin/services/personalityService.js
 * 
 * Centralized UI builder for the Personality Engine.
 */

const { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require('discord.js');

function buildPersonalityPanel(config) {
  const p = config.settings.personality || { tone: "calm", humor: 10, strictness: 60, verbosity: 40, respect_bias: 60 };

  const mainContainer = new ContainerBuilder();

  // 1. Header Section
  mainContainer.addTextDisplayComponents(
    new TextDisplayBuilder()
      .setContent("🧠 **Jack AI: Personality Engine v2**")
  );

  mainContainer.addSeparatorComponents(new SeparatorBuilder());

  // 2. Traits Section
  const traitsText = 
    `🎭 **Tone:** \`${p.tone.toUpperCase()}\`\n` +
    `😂 **Humor:** \`${p.humor}%\` | ⚡ **Strictness:** \`${p.strictness}%\`\n` +
    `🗣️ **Verbosity:** \`${p.verbosity}%\` | 🤝 **Respect Bias:** \`${p.respect_bias}%\``;

  mainContainer.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(traitsText)
  );

  mainContainer.addSeparatorComponents(new SeparatorBuilder());

  // 3. Status Section
  mainContainer.addTextDisplayComponents(
    new TextDisplayBuilder()
      .setContent("⚙️ *Use the controls below to modify my core runtime traits.*")
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

  return { 
    components: [mainContainer, new ActionRowBuilder().addComponents(selectMenu), btnRow],
    flags: MessageFlags.IsComponentsV2
  };
}

module.exports = {
  buildPersonalityPanel
};
