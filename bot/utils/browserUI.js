const { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionFlagsBits, 
  ContainerBuilder, 
  MediaGalleryBuilder, 
  MediaGalleryItemBuilder, 
  SectionBuilder, 
  TextDisplayBuilder, 
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags
} = require("discord.js");

/**
 * Spawns an interactive paginated UI for browsing DB documents using Discord Components v2.
 * 
 * EVOLUTION: Uses MediaGallery, Sections, and Containers for a premium grid-based look.
 */
async function spawnBrowserUI(interactionOrCtx, documents, type = "Emoji") {
  if (!documents || documents.length === 0) {
    const replyFn = interactionOrCtx.editReply ? interactionOrCtx.editReply.bind(interactionOrCtx) : interactionOrCtx.reply.bind(interactionOrCtx);
    return replyFn({ content: `No ${type}s found in the vault!`, flags: 64 });
  }

  const itemsPerPage = 4; // 2x2 Grid
  let currentPage = 0;
  let activeDocs = [...documents];
  let maxPages = Math.ceil(activeDocs.length / itemsPerPage);

  const isAdmin = interactionOrCtx.member.permissions.has(PermissionFlagsBits.Administrator) ||
                  interactionOrCtx.member.permissions.has(PermissionFlagsBits.ManageGuild);

  /**
   * Generates the V2 Layout Components
   */
  const generateV2Components = () => {
    if (activeDocs.length === 0) return [];

    const start = currentPage * itemsPerPage;
    const pageItems = activeDocs.slice(start, start + itemsPerPage);
    const typeLower = type.toLowerCase();

    // 1. Main Container
    const mainContainer = new ContainerBuilder();

    // -- Header --
    mainContainer.addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(`🏦 **Global ${type} Vault**`)
    );

    // -- Media Gallery (Grid) --
    const gallery = new MediaGalleryBuilder();
    pageItems.forEach(doc => {
      if (doc.url && doc.url.startsWith("http") && doc.format !== "lottie") {
        gallery.addItems(
          new MediaGalleryItemBuilder()
            .setURL(doc.url)
        );
      }
    });

    if (gallery.items.length > 0) {
      mainContainer.addMediaGalleryComponents(gallery);
    }

    // -- Info --
    let infoText = "";
    pageItems.forEach((doc, idx) => {
      const idStr = doc.emojiID || doc.stickerID || "unknown";
      infoText += `**${idx + 1}.** ${doc.name} (\`${idStr}\`)\n`;
    });
    infoText += `\n*Page ${currentPage + 1} of ${maxPages} | Total: ${activeDocs.length}*`;
    
    mainContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(infoText)
    );

    // -- Action Rows (Standard ActionRow for Buttons/Menus) --
    const rows = [mainContainer];

    // 2. Select Menu for Actions (since we have multiple items)
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("browser_select_item")
      .setPlaceholder("Select an item to Manage/Download");

    pageItems.forEach((doc, idx) => {
       const idStr = doc.emojiID || doc.stickerID || "unknown";
       selectMenu.addOptions(
         new StringSelectMenuOptionBuilder()
           .setLabel(`${idx + 1}. ${doc.name}`)
           .setDescription(`ID: ${idStr}`)
           .setValue(`${typeLower}_${idStr}`)
       );
    });
    rows.push(new ActionRowBuilder().addComponents(selectMenu));

    // 3. Navigation Buttons
    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("browser_prev")
        .setLabel("◀ Prev")
        .setStyle(ButtonStyle.Secondary)
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
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= maxPages - 1)
    );
    rows.push(navRow);

    return rows;
  };

  /**
   * Render function
   */
  const render = async (i = null) => {
    maxPages = Math.ceil(activeDocs.length / itemsPerPage);
    if (currentPage >= maxPages && maxPages > 0) currentPage = maxPages - 1;
    
    const payload = { 
      components: generateV2Components(),
      flags: MessageFlags.IsComponentsV2 
    };

    if (i) {
       await i.update(payload).catch(e => console.error("BROWSER_UI_ERROR:", e));
    } else {
       if (interactionOrCtx.deferred) {
          return await interactionOrCtx.editReply(payload);
       } else if (interactionOrCtx.reply) {
          payload.fetchReply = true;
          return await interactionOrCtx.reply(payload);
       } else {
          return await interactionOrCtx.channel.send(payload);
       }
    }
  };

  const msg = await render();
  if (!msg) return;

  const collector = msg.createMessageComponentCollector({ time: 600000 });
  const authorId = interactionOrCtx.user ? interactionOrCtx.user.id : interactionOrCtx.author.id;

  collector.on('collect', async (i) => {
    try {
      if (i.user.id !== authorId) {
         return i.reply({ content: "You cannot control this menu.", flags: 64 });
      }
      
      // Handling Selection (Manage/Download)
      if (i.customId === 'browser_select_item') {
         const [typeVal, idVal] = i.values[0].split("_");
         const typeLower = typeVal.toLowerCase();

         const rows = [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`browser_add_${typeLower}_${idVal}`)
                .setLabel("➕ Download to Server")
                .setStyle(ButtonStyle.Success)
            )
         ];

         if (isAdmin) {
            rows[0].addComponents(
              new ButtonBuilder()
                .setCustomId(`browser_rename_${typeLower}_${idVal}`)
                .setLabel("✏️ Rename")
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId(`browser_delete_${typeLower}_${idVal}`)
                .setLabel("🗑️ Delete")
                .setStyle(ButtonStyle.Danger)
            );
         }

         return i.reply({ 
           content: `🛠️ **Managing ${typeVal} ID:** \`${idVal}\``, 
           components: rows, 
           flags: 64 
         });
      }

      // Pagination
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
        const queryInput = new TextInputBuilder().setCustomId('search_query').setLabel("Enter name/pack").setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ModalRowBuilder().addComponents(queryInput));
        await i.showModal(modal);

        try {
           const submitted = await i.awaitModalSubmit({ time: 60000, filter: m => m.user.id === authorId });
           const query = submitted.fields.getTextInputValue('search_query').toLowerCase();
           activeDocs = documents.filter(d => d.name.toLowerCase().includes(query) || (d.pack && d.pack.toLowerCase().includes(query)));
           currentPage = 0;
           await submitted.update({ components: generateV2Components(), flags: MessageFlags.IsComponentsV2 });
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
    const components = generateV2Components();
    components.forEach(row => {
        if (row.components && typeof row.components.forEach === 'function') {
            row.components.forEach(c => { if (typeof c.setDisabled === 'function') c.setDisabled(true); });
        }
    });
    msg.edit({ components, flags: MessageFlags.IsComponentsV2 }).catch(()=>{});
  });
}

module.exports = { spawnBrowserUI };
