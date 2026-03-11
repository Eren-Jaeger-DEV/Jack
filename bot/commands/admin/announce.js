const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType
} = require("discord.js");

module.exports = {

  name: "announce",
  category: "admin",
  description: "Create a beautiful announcement in any channel",

  data: new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Create a beautiful announcement")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("The channel to send the announcement to")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {

    /* PREFIX PERMISSION CHECK */
    if (ctx.type === "prefix") {
      if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return ctx.reply("❌ No permission.");
      }
    }

    let targetChannel;

    /* SLASH COMMAND FLOW */
    if (ctx.type === "slash") {
      targetChannel = ctx.options.getChannel("channel");

      const modal = new ModalBuilder()
        .setCustomId(`announce_modal_${targetChannel.id}`)
        .setTitle(`Announce to #${targetChannel.name}`);

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

      // Show modal instantly
      await ctx.interaction.showModal(modal);
    } 
    /* PREFIX COMMAND FLOW */
    else {
      targetChannel = ctx.message.mentions.channels.first();

      if (!targetChannel) {
        return ctx.reply("Usage: `jack announce <#channel>`");
      }

      // We cannot open a modal from a prefix command Directly
      // So we send a button to the user that they can click to open it
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`announce_btn_${targetChannel.id}`)
          .setLabel(`Create Announcement for #${targetChannel.name}`)
          .setStyle(ButtonStyle.Primary)
          .setEmoji("📢")
      );

      return ctx.reply({
        content: `Click the button below to craft your announcement for ${targetChannel}`,
        components: [row]
      });
    }

  }

};
