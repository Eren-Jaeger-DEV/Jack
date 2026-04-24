const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionFlagsBits } = require("discord.js");

/**
 * Spawns an interactive paginated embed for browsing arrays of DB documents.
 * Admin modes enable management buttons natively in the Paginator.
 * 
 * GALLERY VIEW: Displays exactly 1 item per page with a large image and direct action buttons.
 */
async function spawnBrowserUI(interactionOrCtx, documents, type = "Emoji") {
  if (!documents || documents.length === 0) {
    const replyFn = interactionOrCtx.editReply ? interactionOrCtx.editReply.bind(interactionOrCtx) : interactionOrCtx.reply.bind(interactionOrCtx);
    return replyFn({ content: `No ${type}s found in the vault!`, flags: 64 });
  }

  const itemsPerPage = 1;
  let currentPage = 0;
  let activeDocs = [...documents];
  let maxPages = Math.ceil(activeDocs.length / itemsPerPage);

  const isAdmin = interactionOrCtx.member.permissions.has(PermissionFlagsBits.Administrator) ||
                  interactionOrCtx.member.permissions.has(PermissionFlagsBits.ManageGuild);

  /**
   * Generates a single embed for the current active item
   */
  const generateEmbeds = () => {
    if (activeDocs.length === 0) {
       return [new EmbedBuilder().setTitle(`${type} Vault`).setDescription("No items found or isolated by search.")];
    }

    const doc = activeDocs[currentPage];
    const idStr = doc.emojiID || doc.stickerID || "unknown";
    const docName = doc.name || "unnamed";
    
    const embed = new EmbedBuilder()
      .setTitle(`${currentPage + 1}. ${docName}`)
      .setDescription(`**Pack:** ${doc.pack || "None"}\n**Format:** ${doc.format || "unknown"} | **Vault ID:** \`${idStr}\``)
      .setColor("Gold")
      .setFooter({ text: `Page ${currentPage + 1} of ${maxPages} | Total: ${activeDocs.length}` });
      
    if (doc.format === "lottie") {
       embed.setDescription(embed.data.description + `\n*[Lottie Animation Preview Unsupported](${doc.url || 'none'})*`);
    } else {
       if (doc.url && doc.url.startsWith("http")) {
         try {
           embed.setImage(doc.url);
         } catch (e) {
           console.error("Invalid image URL:", doc.url);
         }
       }
    }

    return [embed];
  };

  /**
   * Generates the component rows based on the Gallery state
   */
  const generateComponents = () => {
    if (activeDocs.length === 0) return [];

    const doc = activeDocs[currentPage];
    const idStr = doc.emojiID || doc.stickerID || "unknown";
    const typeLower = type.toLowerCase();
    const rows = [];

    // Row 1: Navigation & Search
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("browser_prev")
        .setLabel("◀ Prev")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId("browser_search")
        .setLabel("🔍 Search")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("browser_reset")
        .setLabel("🔄 Reset")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("browser_next")
        .setLabel("Next ▶")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage >= maxPages - 1)
    ));

    // Row 2: Direct Actions
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`browser_add_${typeLower}_${idStr}`.substring(0, 100))
        .setLabel(`➕ Add to Server`)
        .setStyle(ButtonStyle.Success)
    );

    if (isAdmin) {
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`browser_rename_${typeLower}_${idStr}`.substring(0, 100))
          .setLabel("✏️ Rename")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`browser_pack_${typeLower}_${idStr}`.substring(0, 100))
          .setLabel("📦 Move Pack")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`browser_delete_${typeLower}_${idStr}`.substring(0, 100))
          .setLabel("🗑️ Delete")
          .setStyle(ButtonStyle.Danger)
      );
    }
    
    rows.push(actionRow);
    return rows;
  };

  /**
   * Render function
   */
  const render = async (i = null) => {
    maxPages = Math.ceil(activeDocs.length / itemsPerPage);
    if (currentPage >= maxPages && maxPages > 0) currentPage = maxPages - 1;
    
    const payload = { embeds: generateEmbeds(), components: generateComponents() };

    if (i) {
       await i.update(payload).catch(e => console.error("BROWSER_UI_ERROR:", e));
    } else {
       if (interactionOrCtx.deferred) {
          return await interactionOrCtx.editReply(payload);
       } else if (interactionOrCtx.reply) {
          // Robust reply-then-fetch to avoid fetchReply deprecation warning
          await interactionOrCtx.reply(payload);
          return (interactionOrCtx.fetchReply) ? await interactionOrCtx.fetchReply() : null;
       } else {
          return await interactionOrCtx.channel.send(payload);
       }
    }
  };

  // Initial Send
  const msg = await render();

  if (!msg) return;
  const collector = msg.createMessageComponentCollector({ time: 600000 }); // 10 minutes

  collector.on('collect', async (i) => {
    try {
      const authorId = interactionOrCtx.user ? interactionOrCtx.user.id : interactionOrCtx.author.id;
      if (i.user.id !== authorId && !i.customId.startsWith('browser_add_')) {
         return i.reply({ content: "You cannot control this menu.", flags: 64 });
      }
      
      if (i.customId === 'browser_prev') {
        currentPage--;
        await render(i);
      } else if (i.customId === 'browser_next') {
        currentPage++;
        await render(i);
      } else if (i.customId === 'browser_reset') {
        activeDocs = [...documents];
        currentPage = 0;
        await render(i);
      } else if (i.customId === 'browser_search') {
        const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: ModalRowBuilder } = require('discord.js');
        const modal = new ModalBuilder().setCustomId('browser_search_modal').setTitle('Search Vault');
        const queryInput = new TextInputBuilder().setCustomId('search_query').setLabel("Enter Emoji/Sticker name").setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ModalRowBuilder().addComponents(queryInput));
        await i.showModal(modal);

        try {
           const submitted = await i.awaitModalSubmit({ time: 60000, filter: m => m.user.id === authorId });
           const query = submitted.fields.getTextInputValue('search_query').toLowerCase();
           activeDocs = documents.filter(d => d.name.includes(query) || (d.pack && d.pack.includes(query)));
           currentPage = 0;
           await submitted.update({ embeds: generateEmbeds(), components: generateComponents() });
        } catch (err) {}
      }
    } catch (err) {
      console.error("BROWSER_UI_COLLECTOR_ERROR:", err);
      if (!i.replied && !i.deferred) {
        await i.reply({ content: "UI Error: " + err.message, flags: 64 }).catch(()=>{});
      }
    }
  });

  collector.on('end', () => {
    msg.edit({ components: [] }).catch(()=>{});
  });
}

module.exports = { spawnBrowserUI };
