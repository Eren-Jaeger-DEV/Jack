const transcript = require("discord-html-transcripts");
const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

module.exports = async function buttonHandler(interaction) {

  const guild = interaction.guild;

  const categoryName = process.env.TICKET_CATEGORY_NAME;
  const staffRoleName = process.env.STAFF_ROLE_NAME;
  const logChannelName = process.env.TICKET_LOG_CHANNEL_NAME;

  /* ---------- OPEN TICKET ---------- */

  if (interaction.customId === "ticket_open") {

    let category = guild.channels.cache.find(
      c => c.name === categoryName && c.type === ChannelType.GuildCategory
    );

    if (!category) {

      category = await guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory
      });

    }

    const staffRole = guild.roles.cache.find(
      r => r.name === staffRoleName
    );

    const channel = await guild.channels.create({

      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: category.id,

      permissionOverwrites: [

        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },

        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages
          ]
        },

        ...(staffRole ? [{

          id: staffRole.id,
          allow: [PermissionFlagsBits.ViewChannel]

        }] : [])

      ]

    });

    const row = new ActionRowBuilder().addComponents(

      new ButtonBuilder()
        .setCustomId("ticket_claim")
        .setLabel("Claim")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("ticket_close")
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)

    );

    await channel.send({
      content: `🎫 Ticket opened by ${interaction.user}`,
      components: [row]
    });

    return interaction.reply({
      content: `✅ Ticket created: ${channel}`,
      ephemeral: true
    });

  }

  /* ---------- CLAIM TICKET ---------- */

  if (interaction.customId === "ticket_claim") {

    return interaction.reply({
      content: `👮 Ticket claimed by ${interaction.user}`
    });

  }

  /* ---------- CLOSE TICKET ---------- */

  if (interaction.customId === "ticket_close") {

    await interaction.reply({
      content: "Saving transcript...",
      ephemeral: true
    });

    const attachment = await transcript.createTranscript(interaction.channel);

    const logChannel = guild.channels.cache.find(
      c => c.name === logChannelName
    );

    if (logChannel) {

      await logChannel.send({

        content: `📁 Ticket closed by ${interaction.user}`,
        files: [attachment]

      });

    }

    setTimeout(() => {

      interaction.channel.delete().catch(() => {});

    }, 3000);

  }

  /* ---------- ANNOUNCEMENT BUTTON ---------- */
  if (interaction.customId.startsWith("announce_btn_")) {
    const channelId = interaction.customId.replace("announce_btn_", "");
    
    // Check permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
       return interaction.reply({ content: "❌ No permission.", ephemeral: true });
    }

    const { ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

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

};