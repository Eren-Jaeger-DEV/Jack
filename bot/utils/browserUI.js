const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, PermissionFlagsBits } = require("discord.js");

/**
 * Spawns an interactive paginated embed for browsing arrays of DB documents.
 * Admin modes enable management buttons natively in the Paginator.
 * 
 * Supports rendering "state" overlays (e.g., base view, rename selection view, search view).
 */
async function spawnBrowserUI(interactionOrCtx, documents, type = "Emoji") {
  if (!documents || documents.length === 0) {
    const replyFn = interactionOrCtx.editReply ? interactionOrCtx.editReply.bind(interactionOrCtx) : interactionOrCtx.reply.bind(interactionOrCtx);
    return replyFn({ content: `No ${type}s found in the vault!`, flags: 64 });
  }

  const itemsPerPage = 5;
  let currentPage = 0;
  let activeDocs = [...documents];
  let maxPages = Math.ceil(activeDocs.length / itemsPerPage);

  const isAdmin = interactionOrCtx.member.permissions.has(PermissionFlagsBits.Administrator) ||
                  interactionOrCtx.member.permissions.has(PermissionFlagsBits.ManageGuild);

  // State flag: "base", "select_rename", "select_delete", "select_pack"
  let viewState = "base"; 

  /**
   * Generates up to 5 embeds for the current page
   */
  const generateEmbeds = () => {
    if (activeDocs.length === 0) {
       return [new EmbedBuilder().setTitle(`${type} Vault`).setDescription("No items found or isolated by search.")];
    }

    const startIdx = currentPage * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const slice = activeDocs.slice(startIdx, endIdx);
    
    const embeds = [];
    slice.forEach((doc, idx) => {
      const globalIdx = startIdx + idx + 1;
      const idStr = doc.emojiID || doc.stickerID;
      const embed = new EmbedBuilder()
        .setTitle(`${globalIdx}. ${doc.name}`)
        .setDescription(`**Pack:** ${doc.pack || "None"}\n**Format:** ${doc.format} | **Vault ID:** \`${idStr}\``)
        .setColor("Gold");
      
      if (doc.format === "lottie") {
         embed.setDescription(embed.data.description + `\n*[Lottie Animation Preview Unsupported](${doc.url})*`);
      } else {
         embed.setThumbnail(doc.url); // Use thumbnail so 5 stack cleanly without flooding chat
      }

      // Only the last embed needs the footer
      if (idx === slice.length - 1) {
         embed.setFooter({ text: `Page ${currentPage + 1} of ${maxPages} | Total: ${activeDocs.length}` });
      }

      embeds.push(embed);
    });

    return embeds;
  };

  /**
   * Generates the component rows based on the current ViewState
   */
  const generateComponents = () => {
    if (activeDocs.length === 0) return [];

    const startIdx = currentPage * itemsPerPage;
    const slice = activeDocs.slice(startIdx, startIdx + itemsPerPage);
    const rows = [];

    // --- State: Base View ---
    if (viewState === "base") {
      // Row 1: Add to Server links for the 5 items
      const addRow = new ActionRowBuilder();
      slice.forEach((doc, idx) => {
         const globalIdx = startIdx + idx + 1;
         const idStr = doc.emojiID || doc.stickerID;
         addRow.addComponents(
             new ButtonBuilder()
               .setCustomId(`browser_add_${type.toLowerCase()}_${idStr}`)
               .setLabel(`➕ ${globalIdx}`)
               .setStyle(ButtonStyle.Success)
         );
      });
      rows.push(addRow);

      // Row 2: Standard Pagination & Search
      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("browser_prev")
          .setLabel("◀")
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
          .setLabel("▶")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage >= maxPages - 1)
      ));

      // Row 3: Admin Tools
      if (isAdmin) {
         rows.push(new ActionRowBuilder().addComponents(
             new ButtonBuilder().setCustomId("state_rename").setLabel("✏️ Rename").setStyle(ButtonStyle.Secondary),
             new ButtonBuilder().setCustomId("state_delete").setLabel("🗑️ Delete").setStyle(ButtonStyle.Danger),
             new ButtonBuilder().setCustomId("state_pack").setLabel("📦 Move Pack").setStyle(ButtonStyle.Secondary)
         ));
      }
    } 
    // --- State: Selection (Admin pressed a tool) ---
    else {
      let placeholder = "";
      if (viewState === "select_rename") placeholder = "Select an item to Rename...";
      if (viewState === "select_delete") placeholder = "Select an item to Delete...";
      if (viewState === "select_pack") placeholder = "Select an item to Repack...";

      const options = slice.map((doc, idx) => {
         const idStr = doc.emojiID || doc.stickerID;
         return {
            label: `${startIdx + idx + 1}. ${doc.name}`,
            description: `ID: ${idStr}`,
            value: `${viewState}_${idStr}` // e.g., select_rename_12345
         };
      });

      rows.push(new ActionRowBuilder().addComponents(
         new StringSelectMenuBuilder()
           .setCustomId("admin_select_action")
           .setPlaceholder(placeholder)
           .addOptions(options)
      ));

      rows.push(new ActionRowBuilder().addComponents(
         new ButtonBuilder().setCustomId("state_base").setLabel("Cancel Action").setStyle(ButtonStyle.Secondary)
      ));
    }

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
       await i.update(payload).catch(()=>{});
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

  // Temporary inline collector for pagination & state switches (not modals)
  // Real interactions (Add, Rename DB execution) are piped to interactionCreate.js to survive restarts 
  // and handle modals easily without leaking memory.
  if (!msg) return;
  const collector = msg.createMessageComponentCollector({ time: 600000 }); // 10 minutes

  collector.on('collect', async (i) => {
    const authorId = interactionOrCtx.user ? interactionOrCtx.user.id : interactionOrCtx.author.id;
    if (i.user.id !== authorId && !i.customId.startsWith('browser_add_')) {
       // Only owner can paginate/admin. Anyone can try to Add.
       return i.reply({ content: "You cannot control this menu.", flags: 64 });
    }

    // Handled in interactions/emojiBrowserButtons.js globally:
    // - browser_add_X_Y
    // - admin_select_action (StringSelect)
    
    // Handled purely UI-side here:
    if (i.customId === 'browser_prev') {
      currentPage--;
      await render(i);
    } else if (i.customId === 'browser_next') {
      currentPage++;
      await render(i);
    } else if (i.customId === 'state_rename') {
      viewState = "select_rename";
      await render(i);
    } else if (i.customId === 'state_delete') {
      viewState = "select_delete";
      await render(i);
    } else if (i.customId === 'state_pack') {
      viewState = "select_pack";
      await render(i);
    } else if (i.customId === 'state_base') {
      viewState = "base";
      await render(i);
    } else if (i.customId === 'browser_reset') {
      // Revert search
      activeDocs = [...documents];
      currentPage = 0;
      viewState = "base";
      await render(i);
    }
    // Search handled mostly externally or via a modal natively here:
    else if (i.customId === 'browser_search') {
      // For quick search, we can pop a modal here safely since it's transient UI state
      const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: ModalRowBuilder } = require('discord.js');
      const modal = new ModalBuilder()
        .setCustomId('browser_search_modal')
        .setTitle('Search Vault');
      
      const queryInput = new TextInputBuilder()
        .setCustomId('search_query')
        .setLabel("Enter Emoji/Sticker name")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      
      modal.addComponents(new ModalRowBuilder().addComponents(queryInput));
      await i.showModal(modal);

      // Wait for submission
      try {
         const submitted = await i.awaitModalSubmit({ time: 60000, filter: m => m.user.id === authorId });
         const query = submitted.fields.getTextInputValue('search_query').toLowerCase();
         activeDocs = documents.filter(d => d.name.includes(query) || (d.pack && d.pack.includes(query)));
         currentPage = 0;
         viewState = "base";
         await submitted.update({ embeds: generateEmbeds(), components: generateComponents() });
      } catch (err) {
         // Modal timeout, ignore
      }
    }
  });

  collector.on('end', () => {
    msg.edit({ components: [] }).catch(()=>{});
  });
}

module.exports = { spawnBrowserUI };
