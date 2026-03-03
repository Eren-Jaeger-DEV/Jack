const transcript = require("discord-html-transcripts");
const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {

    /* ---------------- SLASH COMMANDS ---------------- */
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error("Command Error:", err);

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: "Command error.", ephemeral: true });
        } else {
          await interaction.reply({ content: "Command error.", ephemeral: true });
        }
      }
      return;
    }

    /* ---------------- BUTTON HANDLER ---------------- */
    if (!interaction.isButton()) return;

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
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
          },
          ...(staffRole
            ? [
                {
                  id: staffRole.id,
                  allow: [PermissionFlagsBits.ViewChannel]
                }
              ]
            : [])
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
        content: `👮 Ticket claimed by ${interaction.user}`,
        ephemeral: false
      });
    }

    /* ---------- CLOSE TICKET ---------- */
    if (interaction.customId === "ticket_close") {
      await interaction.reply({ content: "Saving transcript...", ephemeral: true });

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
  }
};