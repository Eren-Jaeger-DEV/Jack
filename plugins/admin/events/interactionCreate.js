const { 
  EmbedBuilder, 
  PermissionFlagsBits, 
  ActionRowBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
} = require("discord.js");
const GuildConfig = require("../../../bot/database/models/GuildConfig");

module.exports = {
  name: 'interactionCreate',

  async execute(interaction, client) {
    if (!interaction.guild) return;

    /* ---------- PERSONALITY DASHBOARD ---------- */
    
    // Select Menu for Presets
    if (interaction.isStringSelectMenu() && interaction.customId === 'persona_preset_select') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && interaction.member.id !== process.env.OWNER_ID) {
         return interaction.reply({ content: "❌ No permission.", ephemeral: true });
      }
      
      const presetName = interaction.values[0];
      let config = await GuildConfig.findOne({ guildId: interaction.guildId });
      
      const presets = {
        tactical: { tone: "calm", humor: 10, strictness: 60, verbosity: 40, respect_bias: 60 },
        enforcement: { tone: "cold", humor: 0, strictness: 90, verbosity: 30, respect_bias: 30 },
        assistive: { tone: "calm", humor: 20, strictness: 40, verbosity: 70, respect_bias: 80 }
      };

      if (presets[presetName]) {
        config.settings.personality = presets[presetName];
        await config.save();
      }
      
      const p = config.settings.personality;
      const embed = EmbedBuilder.from(interaction.message.embeds[0])
        .setFields(
          { name: '🎭 Tone', value: `\`${p.tone}\``, inline: true },
          { name: '😂 Humor', value: `\`${p.humor}%\``, inline: true },
          { name: '⚡ Strictness', value: `\`${p.strictness}%\``, inline: true },
          { name: '🗣️ Verbosity', value: `\`${p.verbosity}%\``, inline: true },
          { name: '🤝 Respect Bias', value: `\`${p.respect_bias}%\``, inline: true }
        );
      
      return interaction.update({ content: `✅ Preset applied.`, embeds: [embed] });
    }

    // Button to open Traits Modal
    if (interaction.isButton() && interaction.customId === 'persona_edit_traits') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && interaction.member.id !== process.env.OWNER_ID) return interaction.reply({ content: "❌ No permission.", ephemeral: true });
      
      let config = await GuildConfig.findOne({ guildId: interaction.guildId });
      const p = config.settings.personality || { humor: 10, strictness: 60, verbosity: 40, respect_bias: 60 };

      const modal = new ModalBuilder()
        .setCustomId(`modal_persona_traits`)
        .setTitle(`Edit Personality Traits (0-100)`);

      const hInput = new TextInputBuilder().setCustomId("humor").setLabel("Humor").setStyle(TextInputStyle.Short).setValue(String(p.humor)).setRequired(true);
      const sInput = new TextInputBuilder().setCustomId("strictness").setLabel("Strictness").setStyle(TextInputStyle.Short).setValue(String(p.strictness)).setRequired(true);
      const vInput = new TextInputBuilder().setCustomId("verbosity").setLabel("Verbosity").setStyle(TextInputStyle.Short).setValue(String(p.verbosity)).setRequired(true);
      const rInput = new TextInputBuilder().setCustomId("respect").setLabel("Respect Bias").setStyle(TextInputStyle.Short).setValue(String(p.respect_bias)).setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(hInput),
        new ActionRowBuilder().addComponents(sInput),
        new ActionRowBuilder().addComponents(vInput),
        new ActionRowBuilder().addComponents(rInput)
      );

      return interaction.showModal(modal);
    }

    // Button to open Tone Modal
    if (interaction.isButton() && interaction.customId === 'persona_edit_tone') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && interaction.member.id !== process.env.OWNER_ID) return interaction.reply({ content: "❌ No permission.", ephemeral: true });
      
      let config = await GuildConfig.findOne({ guildId: interaction.guildId });
      const p = config.settings.personality || { tone: "calm" };

      const modal = new ModalBuilder()
        .setCustomId(`modal_persona_tone`)
        .setTitle(`Edit Personality Tone`);

      const toneInput = new TextInputBuilder().setCustomId("tone").setLabel("Tone Description").setStyle(TextInputStyle.Short).setValue(p.tone).setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(toneInput));

      return interaction.showModal(modal);
    }

    // Modal Submission - Traits
    if (interaction.isModalSubmit() && interaction.customId === 'modal_persona_traits') {
      let config = await GuildConfig.findOne({ guildId: interaction.guildId });
      
      const h = parseInt(interaction.fields.getTextInputValue("humor")) || 0;
      const s = parseInt(interaction.fields.getTextInputValue("strictness")) || 0;
      const v = parseInt(interaction.fields.getTextInputValue("verbosity")) || 0;
      const r = parseInt(interaction.fields.getTextInputValue("respect")) || 0;

      if (!config.settings.personality) config.settings.personality = {};
      config.settings.personality.humor = Math.min(100, Math.max(0, h));
      config.settings.personality.strictness = Math.min(100, Math.max(0, s));
      config.settings.personality.verbosity = Math.min(100, Math.max(0, v));
      config.settings.personality.respect_bias = Math.min(100, Math.max(0, r));
      await config.save();

      const p = config.settings.personality;
      const embed = EmbedBuilder.from(interaction.message.embeds[0])
        .setFields(
          { name: '🎭 Tone', value: `\`${p.tone}\``, inline: true },
          { name: '😂 Humor', value: `\`${p.humor}%\``, inline: true },
          { name: '⚡ Strictness', value: `\`${p.strictness}%\``, inline: true },
          { name: '🗣️ Verbosity', value: `\`${p.verbosity}%\``, inline: true },
          { name: '🤝 Respect Bias', value: `\`${p.respect_bias}%\``, inline: true }
        );
      
      return interaction.update({ content: `✅ Traits updated successfully.`, embeds: [embed] });
    }

    // Modal Submission - Tone
    if (interaction.isModalSubmit() && interaction.customId === 'modal_persona_tone') {
      let config = await GuildConfig.findOne({ guildId: interaction.guildId });
      
      if (!config.settings.personality) config.settings.personality = {};
      config.settings.personality.tone = interaction.fields.getTextInputValue("tone").toLowerCase();
      await config.save();

      const p = config.settings.personality;
      const embed = EmbedBuilder.from(interaction.message.embeds[0])
        .setFields(
          { name: '🎭 Tone', value: `\`${p.tone}\``, inline: true },
          { name: '😂 Humor', value: `\`${p.humor}%\``, inline: true },
          { name: '⚡ Strictness', value: `\`${p.strictness}%\``, inline: true },
          { name: '🗣️ Verbosity', value: `\`${p.verbosity}%\``, inline: true },
          { name: '🤝 Respect Bias', value: `\`${p.respect_bias}%\``, inline: true }
        );
      
      return interaction.update({ content: `✅ Tone updated successfully.`, embeds: [embed] });
    }

    /* ---------- ANNOUNCEMENT BUTTON (OPEN MODAL) ---------- */
    if (interaction.isButton() && interaction.customId.startsWith("announce_btn_")) {
      const channelId = interaction.customId.replace("announce_btn_", "");
      
      // Check permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
         return interaction.reply({ content: "❌ No permission.", ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId(`announce_modal_${channelId}`)
        .setTitle(`Announce to Channel`);

      const titleInput = new TextInputBuilder()
        .setCustomId("title")
        .setLabel("Announcement Title")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(256);

      const descInput = new TextInputBuilder()
        .setCustomId("description")
        .setLabel("Message")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const colorInput = new TextInputBuilder()
        .setCustomId("color")
        .setLabel("Hex Color Code (Optional)")
        .setPlaceholder("#ff0000 or Random")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const imageInput = new TextInputBuilder()
        .setCustomId("image")
        .setLabel("Image URL (Optional)")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(descInput),
        new ActionRowBuilder().addComponents(colorInput),
        new ActionRowBuilder().addComponents(imageInput)
      );

      return interaction.showModal(modal);
    }

    /* ---------- ANNOUNCEMENT MODAL SUBMISSION ---------- */
    if (interaction.isModalSubmit() && interaction.customId.startsWith("announce_modal_")) {

      const channelId = interaction.customId.replace("announce_modal_", "");
      const targetChannel = interaction.guild.channels.cache.get(channelId);

      if (!targetChannel) {
        return interaction.reply({ content: "❌ Target channel not found.", ephemeral: true });
      }

      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "❌ No permission.", ephemeral: true });
      }

      const title = interaction.fields.getTextInputValue("title");
      const description = interaction.fields.getTextInputValue("description");
      const color = interaction.fields.getTextInputValue("color") || "Random";
      const image = interaction.fields.getTextInputValue("image") || null;

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

      if (image) {
        if (image.startsWith('http')) {
          embed.setImage(image);
        }
      }

      try {
        await targetChannel.send({ embeds: [embed] });
        return interaction.reply({ content: `✅ Announcement sent to ${targetChannel}!`, ephemeral: true });
      } catch (err) {
        console.error(err);
        return interaction.reply({ content: "❌ Failed to send announcement. Ensure I have permissions in that channel.", ephemeral: true });
      }
    }
  }
};
