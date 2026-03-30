const { 
  EmbedBuilder, 
  PermissionFlagsBits, 
  ActionRowBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
} = require("discord.js");

module.exports = {
  name: 'interactionCreate',

  async execute(interaction, client) {
    if (!interaction.guild) return;

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
