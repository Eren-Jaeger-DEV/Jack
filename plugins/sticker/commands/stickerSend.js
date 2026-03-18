const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require("discord.js");
const StickerBank = require("../../../bot/database/models/StickerBank");

/**
 * Searches the Sticker Bank for partial matches.
 */
async function searchStickerCDN(query) {
   const exact = await StickerBank.findOne({ name: query });
   if (exact) return [exact];

   const partials = await StickerBank.find({ name: new RegExp(query, "i") }).limit(25);
   return partials;
}

function buildStickerEmbed(doc) {
   const embed = new EmbedBuilder()
     .setColor("Gold")
     .setImage(doc.url)
     .setFooter({ text: `Name: ${doc.name} | Global Vault` });
     
   if (doc.format === "lottie") {
      embed.setDescription(`*[Lottie Animation - Click here to view JSON](${doc.url})*`);
      embed.setImage(null);
   }
   return embed;
}

module.exports = {

  name: "sticker",
  category: "sticker",
  description: "Summon a sticker from the global CDN directly into chat (Bypasses server slots).",
  aliases: ["sendsticker","getstick"],
  usage: '/sticker <name>  |  j sticker <name>',
  details: 'Sends a sticker from the Global CDN directly into chat (bypasses server sticker slots).',

  data: new SlashCommandBuilder()
    .setName("sticker")
    .setDescription("Search the global vault CDN and summon a sticker")
    .addStringOption(opt => opt.setName("query").setDescription("The sticker name to search").setRequired(true)),

  async run(ctx) {

    const query = ctx.type === "slash" ? ctx.options.getString("query").toLowerCase() : ctx.args.join(" ").toLowerCase();
    if (!query) return ctx.reply("❌ Please provide a name to search the Sticker CDN!");

    const matches = await searchStickerCDN(query);
    if (!matches || matches.length === 0) {
      return ctx.reply(`❌ No global stickers found matching \`${query}\`.`);
    }

    if (matches.length === 1) {
      const doc = matches[0];
      return ctx.reply({ embeds: [buildStickerEmbed(doc)] });
    }

    // Menu logic if multiple partial matches
    const options = matches.map((m, index) => ({
      label: m.name.length > 20 ? m.name.substring(0, 20) + "..." : m.name,
      description: `Format: ${m.format}`,
      value: `${m.stickerID}_${index}`
    }));

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("sticker_cdn_select")
        .setPlaceholder("Multiple matches found! Select one:")
        .addOptions(options)
    );

    const msg = await ctx.reply({ content: `Multiple stickers found for **${query}**!`, components: [row] });

    const collector = msg.createMessageComponentCollector({ time: 60000 });
    collector.on('collect', async i => {
       if (i.user.id !== (ctx.user?.id || ctx.author?.id)) {
           return i.reply({ content: "You didn't run this command.", flags: 64 });
       }
       const selectedID = i.values[0].split("_")[0];
       const targetDoc = matches.find(m => m.stickerID === selectedID);
       if (targetDoc) {
           await i.update({ content: null, embeds: [buildStickerEmbed(targetDoc)], components: [] });
       }
    });

  }
};
