const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../database/models/GuildConfig');

module.exports = {
  name: "personality",
  description: "Configure Jack's Personality Engine (Admin Only)",
  
  data: new SlashCommandBuilder()
    .setName("personality")
    .setDescription("Configure Jack's Personality Engine")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set a specific personality parameter')
        .addStringOption(option => 
          option.setName('key')
            .setDescription('The parameter to change')
            .setRequired(true)
            .addChoices(
              { name: 'Tone (String)', value: 'tone' },
              { name: 'Humor (0-100)', value: 'humor' },
              { name: 'Strictness (0-100)', value: 'strictness' },
              { name: 'Verbosity (0-100)', value: 'verbosity' },
              { name: 'Respect Bias (0-100)', value: 'respect_bias' }
            )
        )
        .addStringOption(option =>
          option.setName('value')
            .setDescription('The new value (number for traits, string for tone)')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('preset')
        .setDescription('Apply a personality preset')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('The preset to apply')
            .setRequired(true)
            .addChoices(
              { name: 'Tactical (Calm, High respect)', value: 'tactical' },
              { name: 'Enforcement (Cold, High strictness)', value: 'enforcement' },
              { name: 'Assistive (Calm, High verbosity)', value: 'assistive' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current personality configuration')
    ),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
      config = new GuildConfig({ guildId });
    }

    if (!config.settings.personality) {
      config.settings.personality = {
        tone: "calm",
        humor: 10,
        strictness: 60,
        verbosity: 40,
        respect_bias: 60
      };
    }

    if (subcommand === 'set') {
      const key = interaction.options.getString('key');
      const valueStr = interaction.options.getString('value');
      
      let newValue;
      if (key === 'tone') {
        newValue = valueStr.toLowerCase();
      } else {
        newValue = parseInt(valueStr, 10);
        if (isNaN(newValue) || newValue < 0 || newValue > 100) {
          return interaction.reply({ content: `❌ Value for ${key} must be a number between 0 and 100.`, ephemeral: true });
        }
      }

      config.settings.personality[key] = newValue;
      await config.save();

      return interaction.reply({ content: `✅ Personality parameter **${key}** has been set to **${newValue}**.`, ephemeral: true });
    }

    if (subcommand === 'preset') {
      const presetName = interaction.options.getString('name');
      
      const presets = {
        tactical: { tone: "calm", humor: 10, strictness: 60, verbosity: 40, respect_bias: 60 },
        enforcement: { tone: "cold", humor: 0, strictness: 90, verbosity: 30, respect_bias: 30 },
        assistive: { tone: "calm", humor: 20, strictness: 40, verbosity: 70, respect_bias: 80 }
      };

      const selected = presets[presetName];
      config.settings.personality = selected;
      await config.save();

      return interaction.reply({ content: `✅ Personality preset **${presetName.toUpperCase()}** has been applied.`, ephemeral: true });
    }

    if (subcommand === 'view') {
      const p = config.settings.personality;
      
      const embed = new EmbedBuilder()
        .setTitle('Jack Personality Engine v2')
        .setColor('#2b2d31')
        .setDescription('Current runtime configuration for this server.')
        .addFields(
          { name: 'Tone', value: `${p.tone}`, inline: true },
          { name: 'Humor', value: `${p.humor}%`, inline: true },
          { name: 'Strictness', value: `${p.strictness}%`, inline: true },
          { name: 'Verbosity', value: `${p.verbosity}%`, inline: true },
          { name: 'Respect Bias', value: `${p.respect_bias}%`, inline: true }
        )
        .setFooter({ text: 'These values are combined with real-time context modifiers.' });

      return interaction.reply({ embeds: [embed] });
    }
  }
};
