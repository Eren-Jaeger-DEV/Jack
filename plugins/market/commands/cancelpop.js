const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const PopListing = require("../../../bot/database/models/PopListing");
const { refreshMarketPanel } = require("../../../bot/utils/marketPanel");

const ALLOWED_ROLE_ID = "1480600580408742029";

module.exports = {

  name: "cancelpop",
  category: "market",
  description: "Cancel your active POP market listing",

  data: new SlashCommandBuilder()
    .setName("cancelpop")
    .setDescription("Cancel an active POP market listing")
    .addStringOption(opt =>
       opt.setName("listing_id")
          .setDescription("The ID of the listing (Admins only)")
          .setRequired(false)
    ),

  async run(ctx) {

    if (!ctx.member.roles.cache.has(ALLOWED_ROLE_ID)) {
      return ctx.reply({ content: "❌ You don't have access to the POP market.", flags: 64 });
    }

    const isAdmin = ctx.member.permissions.has(PermissionFlagsBits.ManageMessages);
    
    let listingIdArg;
    if (ctx.type === "slash") {
      listingIdArg = ctx.options.getString("listing_id");
    } else {
      listingIdArg = ctx.args[0]; // j pop cancel <id>
    }

    let filter = {};

    if (listingIdArg && isAdmin) {
       filter = { listingID: listingIdArg.toUpperCase(), status: "active" };
    } else {
       // Regular user cancelling their own listing
       filter = { sellerID: ctx.user.id, status: "active" };
    }

    const listing = await PopListing.findOne(filter);

    if (!listing) {
      if (listingIdArg && isAdmin) {
         return ctx.reply({ content: `❌ No active listing found with ID \`${listingIdArg}\`.`, flags: 64 });
      } else {
         return ctx.reply({ content: "❌ You do not have any active POP listings.", flags: 64 });
      }
    }

    // Update status to cancelled
    listing.status = "cancelled";
    await listing.save();

    await ctx.reply({ content: `✅ Successfully cancelled listing \`${listing.listingID}\`. It has been removed from the market.` });

    // Refresh Panel
    refreshMarketPanel(ctx.client);

  }
};
