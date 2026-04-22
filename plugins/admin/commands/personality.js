/**
 * plugins/admin/commands/personality.js
 * 
 * Interactive Dashboard for Jack's Personality Engine.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const GuildConfig = require('../../../bot/database/models/GuildConfig');

module.exports = {
  name: 'personality',
  category: 'admin',
  description: 'Interactive dashboard to configure Jack\'s Personality Engine',
  aliases: ['persona', 'traits'],
  usage: 'j personality',

  async run(ctx) {
    if (!ctx.member.permissions.has('Administrator') && !ctx.member.id === process.env.OWNER_ID) {
      return ctx.reply('❌ You do not have permission to configure my personality.');
    }

    let config = await GuildConfig.findOne({ guildId: ctx.guild.id });
    if (!config) config = new GuildConfig({ guildId: ctx.guild.id });
    if (!config.settings.personality) {
      config.settings.personality = { tone: "calm", humor: 10, strictness: 60, verbosity: 40, respect_bias: 60 };
      await config.save();
    }

    const p = config.settings.personality;

    const embed = new EmbedBuilder()
      .setTitle('🧠 Personality Engine v2 Dashboard')
      .setColor('#2b2d31')
      .setDescription('Use the buttons below to modify my core runtime traits. Values range from 0-100.')
      .addFields(
        { name: '🎭 Tone', value: `\`${p.tone}\``, inline: true },
        { name: '😂 Humor', value: `\`${p.humor}%\``, inline: true },
        { name: '⚡ Strictness', value: `\`${p.strictness}%\``, inline: true },
        { name: '🗣️ Verbosity', value: `\`${p.verbosity}%\``, inline: true },
        { name: '🤝 Respect Bias', value: `\`${p.respect_bias}%\``, inline: true }
      )
      .setFooter({ text: 'Changes are saved to the persistent database instantly.' });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('persona_preset_select')
      .setPlaceholder('Select a Quick Preset')
      .addOptions([
        { label: 'Default / Tactical', description: 'Calm tone, balanced traits.', value: 'tactical' },
        { label: 'Enforcement Mode', description: 'Cold tone, highly strict, low humor.', value: 'enforcement' },
        { label: 'Assistive Mode', description: 'Calm tone, highly verbose, high respect.', value: 'assistive' }
      ]);

    const btnTraits = new ButtonBuilder()
      .setCustomId('persona_edit_traits')
      .setLabel('⚙️ Edit Traits')
      .setStyle(ButtonStyle.Primary);

    const btnTone = new ButtonBuilder()
      .setCustomId('persona_edit_tone')
      .setLabel('🎭 Edit Tone')
      .setStyle(ButtonStyle.Secondary);

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(btnTraits, btnTone);

    await ctx.reply({ embeds: [embed], components: [row1, row2] });
  }
};
