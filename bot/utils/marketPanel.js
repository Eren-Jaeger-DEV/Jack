const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const PopListing = require("../database/models/PopListing");
const configManager = require("./configManager");
const logger = require("../../utils/logger");

let cachedMessageId = null;

async function refreshMarketPanel(client, page = 0, interaction = null) {
  try {
    const guildId = process.env.GUILD_ID;
    const config = await configManager.getGuildConfig(guildId);
    const marketChannelId = config?.settings?.marketChannelId;

    if (!marketChannelId) return;

    const channel = await client.channels.fetch(marketChannelId).catch(() => null);
    if (!channel) {
      logger.error("Market", "Market channel not found or accessible.");
      return;
    }

    // Fetch all active listings, sorted lowest price first
    const activeListings = await PopListing.find({ status: "active" }).sort({ price: 1 });

    const ITEMS_PER_PAGE = 10;
    const totalPages = Math.max(1, Math.ceil(activeListings.length / ITEMS_PER_PAGE));
    const safePage = Math.max(0, Math.min(page, totalPages - 1));
    const start = safePage * ITEMS_PER_PAGE;
    const slice = activeListings.slice(start, start + ITEMS_PER_PAGE);

    const embeds = [];
    const rows = [];
    
    if (activeListings.length === 0) {
      embeds.push(new EmbedBuilder()
        .setTitle("🛒 POP Marketplace")
        .setDescription("The market is currently empty! Use `/sell pop` to create a listing.")
        .setColor("Gold")
        .setTimestamp()
      );
    } else {
      // 1. Master Header Embed
      embeds.push(new EmbedBuilder()
        .setTitle("🛒 POP Marketplace")
        .setDescription(`Welcome to the POP Marketplace! Click 'Buy' below to start a deal with the seller.\n\nShowing page **${safePage + 1}** of **${totalPages}**`)
        .setColor("Gold")
      );

      // 2. Individual Cards (Embeds) for each listing & Row Buttons
      slice.forEach((listing, index) => {
        embeds.push(new EmbedBuilder()
          .setColor("#2B2D31") // Discord dark theme grey
          .setAuthor({ name: listing.sellerName, iconURL: "https://cdn.discordapp.com/embed/avatars/0.png" })
          .setDescription(`**POP Amount:** ${listing.popAmount.toLocaleString()}\n**Price:** ₹${listing.price.toLocaleString()}`)
          .setFooter({ text: `Listing ID: ${listing.listingID}` })
        );

        // Add corresponding Buy button (Discord limit 5 per row)
        const rowIndex = Math.floor(index / 5);
        if (!rows[rowIndex]) rows[rowIndex] = new ActionRowBuilder();
        
        rows[rowIndex].addComponents(
          new ButtonBuilder()
            .setCustomId(`buy_pop_${listing.listingID}`)
            .setLabel(`Buy (${listing.popAmount.toLocaleString()})`)
            .setStyle(ButtonStyle.Success)
        );
      });

      // 3. Pagination Row (If needed)
      if (totalPages > 1) {
        const pagRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`pop_lb_prev_${safePage}`)
            .setLabel('◀ Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(safePage <= 0),
          new ButtonBuilder()
            .setCustomId(`pop_lb_next_${safePage}`)
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(safePage >= totalPages - 1)
        );
        rows.push(pagRow); // push to the bottom
      }
    }

    const payload = { content: '', embeds, components: rows, files: [] };

    let msg = null;

    // Interaction response if triggered via pagination
    if (interaction && (interaction.isButton() || interaction.isStringSelectMenu())) {
      msg = await interaction.editReply(payload).catch(err => {
        logger.error("Market", `Market editReply error: ${err.message}`);
        throw err;
      });
      return msg;
    }

    // Try to edit cached message if we have it
    if (cachedMessageId) {
      const oldMsg = await channel.messages.fetch(cachedMessageId).catch(() => null);
      if (oldMsg) {
        msg = await oldMsg.edit(payload).catch(() => null);
      }
    }

    // Attempt to recover existing bot message
    if (!msg) {
      const messages = await channel.messages.fetch({ limit: 10 });
      const botMessages = messages.filter(m => m.author.id === client.user.id);
      const existingMsg = botMessages.first();
      
      if (existingMsg) {
        msg = await existingMsg.edit(payload).catch(() => null);
        if (msg) cachedMessageId = msg.id;
      }
    }

    // Send fresh if all edits fail
    if (!msg) {
      msg = await channel.send(payload);
      cachedMessageId = msg.id;
    }

    return msg;
  } catch (err) {
    logger.error("Market", `Error refreshing panel: ${err.message}`);
  }
}

module.exports = {
  refreshMarketPanel
};
