const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");

/**
 * Spawns an interactive paginated embed for browsing array of DB documents (emojis/stickers).
 */
async function spawnBrowserUI(interactionOrCtx, documents, type = "Emoji") {
  if (!documents || documents.length === 0) {
    const replyFn = interactionOrCtx.editReply ? interactionOrCtx.editReply.bind(interactionOrCtx) : interactionOrCtx.reply.bind(interactionOrCtx);
    return replyFn({ content: `No ${type}s found in the vault!`, ephemeral: true });
  }

  let currentPage = 0;
  const maxPages = documents.length;

  const generateEmbed = (index) => {
    const doc = documents[index];
    const embed = new EmbedBuilder()
      .setTitle(`${type} Vault Browsing`)
      .setDescription(`**Name:** ${doc.name}\n**Pack:** ${doc.pack || "None"}\n**Format:** ${doc.format}\n**Added By:** <@${doc.addedBy}>`)
      .setImage(doc.url)
      .setColor("Gold")
      .setFooter({ text: `${type} ${index + 1} of ${maxPages} | ID: ${doc.emojiID || doc.stickerID}` });

    // Handle lottie stickers which can't be set as discord embed images cleanly
    if (doc.format === "lottie") {
       embed.setDescription(embed.data.description + `\n\n*Note: Lottie animations cannot preview directly in embeds. [Click here](${doc.url}) to view RAW data.*`);
       embed.setImage(null);
    }
    
    return embed;
  };

  const generateButtons = (index) => {
    const doc = documents[index];
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("browser_prev")
        .setLabel("◀")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(index === 0),
      new ButtonBuilder()
        .setCustomId("browser_next")
        .setLabel("▶")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(index === maxPages - 1),
      // Action buttons appended differently via handlers or here
      // For now, attaching the specific "add_to_server" interaction logic
      new ButtonBuilder()
        .setCustomId(`browser_add_${type.toLowerCase()}_${doc.emojiID || doc.stickerID}`)
        .setLabel("➕ Add to Server")
        .setStyle(ButtonStyle.Success)
    );
    return row;
  };

  let msg;
  if (interactionOrCtx.deferred) {
     msg = await interactionOrCtx.editReply({ embeds: [generateEmbed(0)], components: [generateButtons(0)] });
  } else if (interactionOrCtx.reply) {
     msg = await interactionOrCtx.reply({ embeds: [generateEmbed(0)], components: [generateButtons(0)], fetchReply: true });
  } else {
     msg = await interactionOrCtx.channel.send({ embeds: [generateEmbed(0)], components: [generateButtons(0)] });
  }

  // Set up collector
  const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 }); // 5 min timeout

  collector.on('collect', async (i) => {
    // Only author can paginate
    const authorId = interactionOrCtx.user ? interactionOrCtx.user.id : interactionOrCtx.author.id;
    if (i.user.id !== authorId && (i.customId === 'browser_prev' || i.customId === 'browser_next')) {
      return i.reply({ content: "You cannot control this menu.", ephemeral: true });
    }

    if (i.customId === 'browser_prev') {
      currentPage--;
      await i.update({ embeds: [generateEmbed(currentPage)], components: [generateButtons(currentPage)] });
    } else if (i.customId === 'browser_next') {
      currentPage++;
      await i.update({ embeds: [generateEmbed(currentPage)], components: [generateButtons(currentPage)] });
    }
  });

  collector.on('end', () => {
    const disabledRow = generateButtons(currentPage);
    disabledRow.components.forEach(c => c.setDisabled(true));
    msg.edit({ components: [disabledRow] }).catch(() => {});
  });
}

module.exports = { spawnBrowserUI };
