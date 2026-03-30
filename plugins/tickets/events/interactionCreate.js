const transcript = require("discord-html-transcripts");
const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

module.exports = {
  name: 'interactionCreate',

  async execute(interaction, client) {
    if (!interaction.guild) return;

    /* ---------- OPEN TICKET ---------- */
    if (interaction.isButton() && interaction.customId === "ticket_open") {
      await interaction.deferReply({ ephemeral: true });

      // Use ServerMapManager to find the "Support" category
      let category = client.serverMap.getCategory("support");

      if (!category) {
        // Fallback or create if totally missing? 
        // User said: "ensure thing ticket panel goes to 'Support' category"
        // If it's missing in map, we try to fetch by name directly as a last resort
        const categoryName = process.env.TICKET_CATEGORY_NAME || "Support";
        category = interaction.guild.channels.cache.find(
          c => c.name.toLowerCase().includes("support") && c.type === ChannelType.GuildCategory
        );

        if (!category) {
          category = await interaction.guild.channels.create({
            name: categoryName,
            type: ChannelType.GuildCategory
          });
          // Re-init map to include new category
          await client.serverMap.init(interaction.guild);
        }
      }

      const staffRoleName = process.env.STAFF_ROLE_NAME || "Staff";
      const staffRole = interaction.guild.roles.cache.find(
        r => r.name === staffRoleName
      );

      const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: category.id,
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
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.ReadMessageHistory
            ]
          },
          ...(staffRole ? [{
            id: staffRole.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
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
        content: `🎫 Ticket opened by ${interaction.user}. Please describe your issue clearly.`,
        components: [row]
      });

      return interaction.editReply({
        content: `✅ Ticket created: ${channel}`
      });
    }

    /* ---------- CLAIM TICKET ---------- */
    if (interaction.isButton() && interaction.customId === "ticket_claim") {
      return interaction.reply({
        content: `👮 Ticket claimed by ${interaction.user}`
      });
    }

    /* ---------- CLOSE TICKET ---------- */
    if (interaction.isButton() && interaction.customId === "ticket_close") {
      await interaction.reply({
        content: "Saving transcript and closing ticket...",
        ephemeral: true
      });

      const attachment = await transcript.createTranscript(interaction.channel);

      // Use ServerMapManager to find the "reward_ticket" channel under "Support"
      let logChannel = client.serverMap.getChannel("support", "reward_ticket");

      if (!logChannel) {
        // Fallback to env or name search
        const logChannelName = process.env.TICKET_LOG_CHANNEL_NAME || "reward-ticket";
        logChannel = interaction.guild.channels.cache.find(
          c => c.name === logChannelName
        );
      }

      if (logChannel) {
        await logChannel.send({
          content: `📁 Ticket \`${interaction.channel.name}\` closed by ${interaction.user} (${interaction.user.id})`,
          files: [attachment]
        });
      }

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 3000);
    }
  }
};
