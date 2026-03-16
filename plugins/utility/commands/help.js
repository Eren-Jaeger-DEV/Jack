const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {

  name: "help",
  category: "utility",
  description: "Show all available commands",

  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all available commands"),

  /* ---------- BUILD COMMAND LIST ---------- */

  getCommands(client, prefixMode = false) {

    const categories = {};

    client.commands.forEach(cmd => {
      const cat = cmd.category || "uncategorized";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(prefixMode ? cmd.name : `/${cmd.name}`);
    });

    for (const cat in categories) {
      categories[cat] = categories[cat].join("\n");
    }

    return categories;

  },

  /* ---------- HYBRID COMMAND ---------- */

  async run(ctx) {

    const isPrefix = ctx.type === "prefix";
    const categories = this.getCommands(ctx.client, isPrefix);

    const embed = new EmbedBuilder()
      .setTitle("📖 Jack Bot Command Guide")
      .setDescription("All commands grouped automatically.")
      .setColor("Blue")
      .setFooter({ text: "Prefixes: j | J | jack | Jack" });

    for (const [category, cmds] of Object.entries(categories)) {

      embed.addFields({
        name: `📂 ${category.charAt(0).toUpperCase() + category.slice(1)}`,
        value: cmds,
        inline: false
      });

    }

    ctx.reply({ embeds: [embed] });

  }

};