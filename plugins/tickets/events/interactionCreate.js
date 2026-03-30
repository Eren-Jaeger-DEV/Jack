const transcript = require("discord-html-transcripts");
const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

module.exports = {
  name: 'interactionCreate',

  async execute(interaction, client) {
    if (!interaction.guild) return;

    /* ---------- TICKET CATEGORY SELECT (CREATE) ---------- */

    if (interaction.isStringSelectMenu() && interaction.customId === "ticket_category_select") {
      await interaction.deferReply({ ephemeral: true });

      const categoryValue = interaction.values[0];
      const TICKET_CATEGORY_ID = "1478783091765018796"; 

      let category = interaction.guild.channels.cache.get(TICKET_CATEGORY_ID);
      if (!category) {
        // Fallback or create? Usually we use the ID as requested.
        console.warn(`[Tickets] Category ID ${TICKET_CATEGORY_ID} not found.`);
        // Attempt search by name as a safety net
        category = interaction.guild.channels.cache.find(c => c.name.includes("TICKETS") && c.type === ChannelType.GuildCategory);
      }

      const staffRole = interaction.guild.roles.cache.find(r => r.name === "Staff") || 
                        interaction.guild.roles.cache.get("1485148160614465586");

      const channel = await interaction.guild.channels.create({
        name: `${categoryValue}-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: category ? category.id : null,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles
            ]
          },
          ...(staffRole ? [{
            id: staffRole.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
          }] : [])
        ]
      });

      // Welcome Message Construction
      let welcomeTitle = "🎫 Support Ticket";
      let welcomeDesc = `Hello ${interaction.user}, thanks for reaching out. Please describe your request clearly.`;

      if (categoryValue === "reward_collection") {
        welcomeTitle = "🎁 Reward Collection";
        welcomeDesc = `Hello ${interaction.user}! Congratulations on your win. \n\nPlease provide your **BGMI UID** and the **Event Name** you participated in so we can process your reward.`;
      } else if (categoryValue === "complaints_issues") {
        welcomeTitle = "⚠️ Complaints / Issues";
        welcomeDesc = `Hello ${interaction.user}. We're sorry you're facing an issue. \n\nPlease detail the problem or report the player with **evidence (screenshots/video)** to help us investigate.`;
      } else if (categoryValue === "owner_management") {
        welcomeTitle = "📩 Management Contact";
        welcomeDesc = `Hello ${interaction.user}. Your message will be reviewed by the Management team directly. \n\nPlease be detailed and wait patiently for a response.`;
      }

      const embed = new EmbedBuilder()
        .setTitle(welcomeTitle)
        .setDescription(welcomeDesc)
        .setColor("#F1C40F")
        .setTimestamp()
        .setFooter({ text: "Ticket System | Admin Panel Required to Close" });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_close_request")
          .setLabel("Close Ticket")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({
        content: `${interaction.user} ${staffRole ? staffRole : ""}`,
        embeds: [embed],
        components: [row]
      });

      return interaction.editReply({
        content: `✅ Your ticket has been created: ${channel}`
      });
    }

    /* ---------- CLOSE TICKET REQUEST ---------- */

    if (interaction.isButton() && interaction.customId === "ticket_close_request") {

      // Send the Admin closure panel
      const adminEmbed = new EmbedBuilder()
        .setTitle("🔒 Administrative Action Required")
        .setDescription(
          `Staff member ${interaction.user}, please choose an action for this ticket. \n\n` +
          "**Re-open**: Resumes the ticket conversation. \n" +
          "**Save Transcript**: Saves a record and deletes the channel."
        )
        .setColor("#E74C3C");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_reopen")
          .setLabel("Re-open Ticket")
          .setEmoji("🔓")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("ticket_save_delete")
          .setLabel("Save Transcript & Delete")
          .setEmoji("📁")
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({
        embeds: [adminEmbed],
        components: [row]
      });
    }

    /* ---------- RE-OPEN TICKET ---------- */

    if (interaction.isButton() && interaction.customId === "ticket_reopen") {
      // Just delete the closure proposal
      return interaction.message.delete().catch(() => {});
    }

    /* ---------- SAVE & DELETE TICKET ---------- */

    if (interaction.isButton() && interaction.customId === "ticket_save_delete") {
      // Only admins should use this
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "❌ Only Administrators can finalize tickets.", ephemeral: true });
      }

      await interaction.reply({ content: "💾 Generating transcript, please wait...", ephemeral: true });

      const attachment = await transcript.createTranscript(interaction.channel);
      const LOG_CHANNEL_ID = "1478693793791348776"; 

      let logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
      if (!logChannel) {
        logChannel = interaction.guild.channels.cache.find(c => c.name.includes("ticket-log"));
      }

      if (logChannel) {
        await logChannel.send({
          content: `📁 Ticket Transcript: **${interaction.channel.name}** \nClosed by: ${interaction.user} (${interaction.user.id})`,
          files: [attachment]
        });
      }

      await interaction.followUp({ content: "🗑️ Ticket will be deleted in 5 seconds.", ephemeral: true });

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 5000);
    }
  }
};
