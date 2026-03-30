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
      let panelName = "Support";

      if (categoryValue === "reward_collection") {
        welcomeTitle = "🎁 Reward Collection";
        welcomeDesc = `Hello ${interaction.user}! Congratulations on your win. \n\nPlease provide your **BGMI UID** and the **Event Name** you participated in so we can process your reward.`;
        panelName = "Reward Collection";
      } else if (categoryValue === "complaints_issues") {
        welcomeTitle = "⚠️ Complaints / Issues";
        welcomeDesc = `Hello ${interaction.user}. We're sorry you're facing an issue. \n\nPlease detail the problem or report the player with **evidence (screenshots/video)** to help us investigate.`;
        panelName = "Complaints / Issues";
      } else if (categoryValue === "owner_management") {
        welcomeTitle = "📩 Management Contact";
        welcomeDesc = `Hello ${interaction.user}. Your message will be reviewed by the Management team directly. \n\nPlease be detailed and wait patiently for a response.`;
        panelName = "Owner / Management";
      }

      const embed = new EmbedBuilder()
        .setTitle(welcomeTitle)
        .setDescription(welcomeDesc)
        .setColor("#F1C40F")
        .setTimestamp()
        .setFooter({ text: `Ticket System | Category: ${panelName}` });

      // Save metadata to channel topic for later recall during transcript
      await channel.setTopic(`Owner: ${interaction.user.id} | Panel: ${panelName}`);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_close_request")
          .setLabel("Close Ticket")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({
        content: `${interaction.user} (Ticket Creator)`, // [IMPROVEMENT]: Removed staff ping, only ping opener.
        embeds: [embed],
        components: [row]
      });

      return interaction.editReply({
        content: `✅ Your ticket has been created: ${channel}`
      });
    }

    /* ---------- CLOSE TICKET REQUEST ---------- */

    if (interaction.isButton() && interaction.customId === "ticket_close_request") {
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
      return interaction.message.delete().catch(() => {});
    }

    /* ---------- SAVE & DELETE TICKET ---------- */

    if (interaction.isButton() && interaction.customId === "ticket_save_delete") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "❌ Only Administrators can finalize tickets.", ephemeral: true });
      }

      await interaction.reply({ content: "💾 Generating advanced transcript, please wait...", ephemeral: true });

      // Extract metadata from topic
      let ownerId = null;
      let panelName = "General";
      const topic = interaction.channel.topic;
      if (topic) {
        const ownerMatch = topic.match(/Owner: (\d+)/);
        const panelMatch = topic.match(/Panel: (.+)/);
        if (ownerMatch) ownerId = ownerMatch[1];
        if (panelMatch) panelName = panelMatch[1];
      }

      // Statistics Gathering
      const allMessages = await interaction.channel.messages.fetch({ limit: 100 });
      const stats = {
        total: allMessages.size,
        attachments: 0,
        users: {}
      };

      allMessages.forEach(m => {
        if (m.attachments.size > 0) stats.attachments += m.attachments.size;
        if (!m.author.bot) {
          const userTag = `${m.author.username}#${m.author.discriminator}`;
          stats.users[userTag] = (stats.users[userTag] || 0) + 1;
        } else if (m.author.id !== client.user.id) {
            // Include other bots? Yes
            const userTag = `[BOT] ${m.author.username}`;
            stats.users[userTag] = (stats.users[userTag] || 0) + 1;
        }
      });

      const participantBreakdown = Object.entries(stats.users)
          .sort((a,b) => b[1] - a[1]) // Sort by count descending
          .map(([user, count]) => `${count} - **${user}**`)
          .join('\n');

      const attachment = await transcript.createTranscript(interaction.channel);
      const LOG_CHANNEL_ID = "1478693793791348776"; 

      let logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
      if (!logChannel) {
        logChannel = interaction.guild.channels.cache.find(c => c.name.includes("ticket-log"));
      }

      if (logChannel) {
        // [IMAGE REQUEST]: Improved Formatting
        const serverInfoBlock = 
        `\`\`\`\n<Server-Info>\n` +
        `    Server: ${interaction.guild.name} (${interaction.guild.id})\n` +
        `    Channel: ${interaction.channel.name} (${interaction.channel.id})\n` +
        `    Messages: ${stats.total}\n` +
        `    Attachments Saved: ${stats.attachments}\n` +
        `    Attachments Skipped: 0 (due maximum file size limits.)\n\`\`\``;

        const detailEmbed = new EmbedBuilder()
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
            .setColor("#2ECC71") // Follow image style
            .addFields(
              { name: "Ticket Owner", value: ownerId ? `<@${ownerId}>` : "Unknown", inline: true },
              { name: "Ticket Name", value: interaction.channel.name, inline: true },
              { name: "Panel Name", value: panelName, inline: true },
              { name: "Direct Transcript", value: "Use Button (Above)", inline: false },
              { name: "Users in transcript", value: participantBreakdown || "No user messages", inline: false }
            )
            .setTimestamp();

        await logChannel.send({
          content: serverInfoBlock,
          embeds: [detailEmbed],
          files: [attachment]
        });
      }

      await interaction.followUp({ content: "🗑️ Ticket finalized. Deleting in 5 seconds.", ephemeral: true });

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 5000);
    }
  }
};
