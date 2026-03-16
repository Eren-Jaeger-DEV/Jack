const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const PopListing = require("../../../bot/database/models/PopListing");
const popParser = require("../../../bot/utils/popParser");
const priceParser = require("../../../bot/utils/priceParser");
const { refreshMarketPanel } = require("../../../bot/utils/marketPanel");

const ALLOWED_ROLE_ID = "1480600580408742029";

module.exports = {

  name: "sell",
  category: "market",
  description: "List your POP for sale on the marketplace",

  data: new SlashCommandBuilder()
    .setName("sell")
    .setDescription("Sell POP on the market")
    .addStringOption(opt => 
       opt.setName("item")
          .setDescription("What are you selling? (Type 'pop')")
          .setRequired(true)
          .addChoices({ name: "pop", value: "pop" })
    )
    .addStringOption(opt =>
       opt.setName("amount")
          .setDescription("Amount of POP (e.g., 1000, 1k, 2.5k)")
          .setRequired(true)
    )
    .addStringOption(opt =>
       opt.setName("price")
          .setDescription("Price (e.g., ₹1000, 1000, 1k, ₹1k)")
          .setRequired(true)
    ),

  async run(ctx) {

    // 1. Role Restriction Check
    if (!ctx.member.roles.cache.has(ALLOWED_ROLE_ID)) {
      return ctx.reply({ content: "❌ You don't have permission to use the POP market.", flags: 64 });
    }

    let item, amountRaw, priceRaw;

    if (ctx.type === "slash") {
      item = ctx.options.getString("item").toLowerCase();
      amountRaw = ctx.options.getString("amount");
      priceRaw = ctx.options.getString("price");
    } else {
      item = ctx.args[0]?.toLowerCase();
      amountRaw = ctx.args[1];
      priceRaw = ctx.args[2];

      if (item !== "pop" || !amountRaw || !priceRaw) {
        return ctx.reply("Usage: `jack sell pop <amount> <price>`\nExample: `jack sell pop 1k ₹1000`");
      }
    }

    // 2. Parse Inputs
    const popAmount = popParser(amountRaw);
    const price = priceParser(priceRaw);

    if (!popAmount || popAmount <= 0) {
      return ctx.reply({ content: `❌ Invalid POP amount: \`${amountRaw}\`. Please use formats like 1000, 1k, 2.5k.`, flags: 64 });
    }

    if (!price || price <= 0) {
      return ctx.reply({ content: `❌ Invalid price: \`${priceRaw}\`. Please use formats like ₹1000, 1000, 1k.`, flags: 64 });
    }

    // 3. User can only have ONE active listing
    const existingListing = await PopListing.findOne({ sellerID: ctx.user.id, status: "active" });
    if (existingListing) {
      return ctx.reply({ content: `❌ You already have an active listing (ID: ${existingListing.listingID}). Please cancel it first or wait for it to sell.`, flags: 64 });
    }

    // 4. Generate unique ID & Save Output
    const listingID = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newListing = await PopListing.create({
      listingID,
      sellerID: ctx.user.id,
      sellerName: ctx.user.username,
      popAmount,
      price,
      status: "active"
    });

    // 5. Success msg + Refresh Market Panel
    const embed = new EmbedBuilder()
      .setTitle("✅ POP Listed Successfully")
      .addFields(
        { name: "Listing ID", value: `\`${listingID}\``, inline: true },
        { name: "POP Amount", value: `${popAmount.toLocaleString()}`, inline: true },
        { name: "Price", value: `₹${price.toLocaleString()}`, inline: true }
      )
      .setColor("Green")
      .setFooter({ text: "Check the market channel to see your listing!" });

    await ctx.reply({ embeds: [embed] });

    // Refresh the master panel asynchronously
    refreshMarketPanel(ctx.client);

  }
};
