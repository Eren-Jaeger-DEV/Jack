const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const PopListing = require("../database/models/PopListing");

const configManager = require("./configManager");

let cachedMessageId = null;

async function refreshMarketPanel(client) {
  try {
    const guildId = process.env.GUILD_ID;

    const config = await configManager.getGuildConfig(guildId);
    const marketChannelId = config?.settings?.marketChannelId;

    if (!marketChannelId) return;

    const channel = await client.channels.fetch(marketChannelId).catch(() => null);
    if (!channel) return console.error("Market channel not found or accessible.");


    // Fetch all active listings, sorted lowest price first
    const activeListings = await PopListing.find({ status: "active" }).sort({ price: 1 });

    const embed = new EmbedBuilder()
      .setTitle("🛒 POP Marketplace")
      .setDescription("Welcome to the POP Marketplace! Click 'Buy' to start a deal with the seller. \n\n**Currently Active Listings:**")
      .setColor("Gold")
      .setTimestamp();

    const rows = [];
    
    if (activeListings.length === 0) {
      embed.setDescription("The market is currently empty! Use `/sell pop` to create a listing.");
    } else {
      activeListings.forEach((listing, index) => {
        embed.addFields({
          name: `Listing ID: ${listing.listingID}`,
          value: `**Seller:** ${listing.sellerName}\n**POP Amount:** ${listing.popAmount.toLocaleString()}\n**Price:** ₹${listing.price.toLocaleString()}`,
          inline: false
        });

        // Add a Buy button for this listing
        // Discord allows up to 5 Button components per ActionRow, and up to 5 ActionRows per Message.
        // If we have > 25 listings, Discord will throw an error. We will cap displayed buttons to 25.
        if (index < 25) {
          const rowIndex = Math.floor(index / 5);
          if (!rows[rowIndex]) {
            rows[rowIndex] = new ActionRowBuilder();
          }
          
          rows[rowIndex].addComponents(
             new ButtonBuilder()
               .setCustomId(`buy_pop_${listing.listingID}`)
               .setLabel(`Buy (ID: ${listing.listingID})`)
               .setStyle(ButtonStyle.Success)
          );
        }
      });
      
      if (activeListings.length > 25) {
        embed.setFooter({ text: `Showing top 25 newest/cheapest listings... (${activeListings.length} total active)` });
      }
    }

    // Try to edit the cached message first
    if (cachedMessageId) {
      const msg = await channel.messages.fetch(cachedMessageId).catch(() => null);
      if (msg) {
        return await msg.edit({ embeds: [embed], components: rows });
      }
    }

    // If no msg cached, clear channel (optional for pure aesthetic) and send new
    const messages = await channel.messages.fetch({ limit: 10 });
    const botMessages = messages.filter(m => m.author.id === client.user.id);
    const existingMsg = botMessages.first();

    if (existingMsg) {
      cachedMessageId = existingMsg.id;
      return await existingMsg.edit({ embeds: [embed], components: rows });
    }

    const newMsg = await channel.send({ embeds: [embed], components: rows });
    cachedMessageId = newMsg.id;

  } catch (err) {
    console.error("Error refreshing market panel:", err);
  }
}

module.exports = {
  refreshMarketPanel
};

