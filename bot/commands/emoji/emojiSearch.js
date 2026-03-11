const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const { searchEmojiCDN, buildEmojiEmbed } = require("../../utils/emojiCDN");

module.exports = {

  name: "emoji",
  category: "emoji",
  description: "Summon an emoji from the global CDN directly into chat.",

  data: new SlashCommandBuilder()
    .setName("emoji")
    .setDescription("Search the global vault CDN and summon an emoji into chat")
    .addStringOption(opt => opt.setName("query").setDescription("The emoji name to search").setRequired(true)),

  async run(ctx) {

    const query = ctx.type === "slash" ? ctx.options.getString("query").toLowerCase() : ctx.args.join(" ").toLowerCase();
    if (!query) return ctx.reply("❌ Please provide a name to search the CDN!");

    const matches = await searchEmojiCDN(query);
    if (!matches || matches.length === 0) {
      return ctx.reply(`❌ No global emojis found matching \`${query}\`.`);
    }

    if (matches.length === 1) {
      // Direct hit
      const embed = buildEmojiEmbed(matches[0]);
      return ctx.reply({ embeds: [embed] });
    }

    // Menu logic if multiple partial matches
    const options = matches.slice(0, 25).map((m, index) => ({
      label: m.name.length > 20 ? m.name.substring(0, 20) + "..." : m.name,
      description: `Pack: ${m.pack || 'none'}`,
      value: `${m.emojiID}_${index}`
    }));

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("emoji_cdn_select")
        .setPlaceholder("Multiple matches found! Select one:")
        .addOptions(options)
    );

    let msg;
    if (ctx.type === "slash") {
       msg = await ctx.reply({ content: `Multiple emojis found for **${query}**!`, components: [row] });
    } else {
       msg = await ctx.reply({ content: `Multiple emojis found for **${query}**!`, components: [row] });
    }

    // Temporary collector just for this execution
    const collector = msg.createMessageComponentCollector({ time: 60000 });
    collector.on('collect', async i => {
       if (i.user.id !== (ctx.user?.id || ctx.author?.id)) {
           return i.reply({ content: "You didn't run this command.", ephemeral: true });
       }
       const selectedID = i.values[0].split("_")[0];
       const targetEmoji = matches.find(m => m.emojiID === selectedID);
       if (targetEmoji) {
           await i.update({ content: null, embeds: [buildEmojiEmbed(targetEmoji)], components: [] });
       }
    });

  }
};
