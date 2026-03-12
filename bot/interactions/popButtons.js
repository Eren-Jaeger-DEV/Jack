const { TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const PopListing = require("../database/models/PopListing");
const PopDeal = require("../database/models/PopDeal");
const { refreshMarketPanel, MARKET_CHANNEL_ID } = require("../utils/marketPanel");
const { generateTranscript } = require("../utils/transcript");

const ALLOWED_ROLE_ID = "1480600580408742029";
const LOG_CHANNEL_ID = "1407965645408043119";
const DEAL_CATEGORY_ID = "1480624145787125830";

module.exports = async function popButtons(interaction) {

  /* ---------- BUY POP LISTING ---------- */
  if (interaction.customId.startsWith("buy_pop_")) {
    const listingID = interaction.customId.replace("buy_pop_", "");

    // 1. Check Role Permission
    if (!interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
      return interaction.reply({ content: "❌ You don't have permission to buy POP.", flags: 64 });
    }

    // Fetch listing
    const listing = await PopListing.findOne({ listingID, status: "active" });
    if (!listing) {
      refreshMarketPanel(interaction.client);
      return interaction.reply({ content: "❌ This listing is no longer active.", flags: 64 });
    }

    // 2. Buyer cannot be the seller
    if (listing.sellerID === interaction.user.id) {
      return interaction.reply({ content: "❌ You cannot buy your own listing.", flags: 64 });
    }

    // 3. Ensure no active deal already exists for this listing
    const existingDeal = await PopDeal.findOne({ listingID, status: "ongoing" });
    if (existingDeal) {
      return interaction.reply({ content: "❌ Someone is already making a deal for this listing.", flags: 64 });
    }

    await interaction.deferReply({ flags: 64 });

    try {
      // Create the deal channel
      const guild = interaction.guild;
      const dealChannel = await guild.channels.create({
        name: `pop-deal-${listingID}`,
        type: ChannelType.GuildText,
        parent: DEAL_CATEGORY_ID,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          // Seller
          {
            id: listing.sellerID,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
          },
          // Buyer
          {
            id: interaction.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
          }
        ]
      });

      // Update Listing status to "pending"
      listing.status = "pending";
      await listing.save();

      // Create Deal Record
      await PopDeal.create({
        listingID,
        sellerID: listing.sellerID,
        buyerID: interaction.user.id,
        channelID: dealChannel.id,
        status: "ongoing"
      });

      // Setup Deal Channel UI
      const embed = new EmbedBuilder()
        .setTitle("🤝 POP Trading Deal")
        .addFields(
          { name: "Seller", value: `<@${listing.sellerID}>`, inline: true },
          { name: "Buyer", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Listing ID", value: `\`${listingID}\``, inline: true },
          { name: "POP Amount", value: `${listing.popAmount.toLocaleString()}`, inline: true },
          { name: "Price", value: `₹${listing.price.toLocaleString()}`, inline: true }
        )
        .setColor("Blue")
        .setDescription("Please coordinate your trade here.\nOnce completed, click **Deal Final** or **Cancel Deal**.");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
           .setCustomId(`deal_final_${listingID}`)
           .setLabel("Deal Final")
           .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
           .setCustomId(`deal_cancel_${listingID}`)
           .setLabel("Cancel Deal")
           .setStyle(ButtonStyle.Danger)
      );

      await dealChannel.send({
        content: `<@${listing.sellerID}> <@${interaction.user.id}>`,
        embeds: [embed],
        components: [row]
      });

      refreshMarketPanel(interaction.client);

      return interaction.editReply({ content: `✅ Deal channel created: ${dealChannel}` });
    } catch (err) {
      console.error("BUY_POP_ERROR:", err);
      return interaction.editReply({ content: `❌ An error occurred while creating the deal channel:\n\`\`\`js\n${err.message}\n\`\`\`` });
    }
  }


  /* ---------- DEAL FINAL ---------- */
  if (interaction.customId.startsWith("deal_final_")) {
    const listingID = interaction.customId.replace("deal_final_", "");

    const deal = await PopDeal.findOne({ listingID, channelID: interaction.channel.id, status: "ongoing" });
    if (!deal) return interaction.reply({ content: "❌ Deal not found or already closed.", flags: 64 });

    // Only buyer and seller
    if (interaction.user.id !== deal.buyerID && interaction.user.id !== deal.sellerID) {
      return interaction.reply({ content: "❌ Only the buyer or seller can finalize this deal.", flags: 64 });
    }

    await interaction.reply("✅ Deal finalized! Generating transcript and deleting channel...");

    // Update states
    deal.status = "finalized";
    await deal.save();

    const listing = await PopListing.findOne({ listingID });
    if (listing) {
      listing.status = "completed";
      await listing.save();
    }

    // Refresh Panel
    refreshMarketPanel(interaction.client);

    // Transcript & Logging
    const transcript = await generateTranscript(interaction.channel);
    const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);

    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle("✅ POP Deal Finalized")
        .setColor("Green")
        .addFields(
          { name: "Listing ID", value: listingID, inline: true },
          { name: "Seller", value: `<@${deal.sellerID}>`, inline: true },
          { name: "Buyer", value: `<@${deal.buyerID}>`, inline: true }
        );
      if (transcript) {
        await logChannel.send({ embeds: [embed], files: [transcript] });
      } else {
        await logChannel.send({ embeds: [embed] });
      }
    }

    // Delete channel
    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 3000);
  }


  /* ---------- CANCEL DEAL ---------- */
  if (interaction.customId.startsWith("deal_cancel_")) {
    const listingID = interaction.customId.replace("deal_cancel_", "");

    const deal = await PopDeal.findOne({ listingID, channelID: interaction.channel.id, status: "ongoing" });
    if (!deal) return interaction.reply({ content: "❌ Deal not found or already closed.", flags: 64 });

    // Buyer, Seller, Mods
    const isMod = interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);
    if (!isMod && interaction.user.id !== deal.buyerID && interaction.user.id !== deal.sellerID) {
      return interaction.reply({ content: "❌ You don't have permission to cancel this deal.", flags: 64 });
    }

    await interaction.reply("🚫 Deal cancelled! Relisting on the market. Deleting channel...");

    // Update states
    deal.status = "cancelled";
    await deal.save();

    const listing = await PopListing.findOne({ listingID });
    if (listing) {
      listing.status = "active";
      await listing.save();
    }

    // Refresh Panel
    refreshMarketPanel(interaction.client);

    // Transcript & Logging
    const transcript = await generateTranscript(interaction.channel);
    const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);

    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle("🚫 POP Deal Cancelled")
        .setColor("Red")
        .addFields(
          { name: "Listing ID", value: listingID, inline: true },
          { name: "Seller", value: `<@${deal.sellerID}>`, inline: true },
          { name: "Buyer", value: `<@${deal.buyerID}>`, inline: true },
          { name: "Cancelled By", value: `<@${interaction.user.id}>`, inline: true }
        );
      if (transcript) {
        await logChannel.send({ embeds: [embed], files: [transcript] });
      } else {
        await logChannel.send({ embeds: [embed] });
      }
    }

    // Delete channel
    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 3000);
  }

};
