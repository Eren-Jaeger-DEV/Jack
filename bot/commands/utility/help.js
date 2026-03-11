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

  getCommands(prefixMode = false) {

    const commandsPath = path.join(__dirname, "..");
    const folders = fs.readdirSync(commandsPath);

    const categories = {};

    for (const folder of folders) {

      const files = fs
        .readdirSync(`${commandsPath}/${folder}`)
        .filter(f => f.endsWith(".js"));

      const cmds = [];

      for (const file of files) {

        const cmd = require(`${commandsPath}/${folder}/${file}`);

        if (!cmd.name) continue;

        cmds.push(prefixMode ? cmd.name : `/${cmd.name}`);

      }

      if (cmds.length) {
        categories[folder] = cmds.join("\n");
      }

    }

    return categories;

  },

  /* ---------- HYBRID COMMAND ---------- */

  async run(ctx) {

    const isPrefix = ctx.type === "prefix";
    const categories = this.getCommands(isPrefix);

    const embed = new EmbedBuilder()
      .setTitle("📖 Jack Bot Command Guide")
      .setDescription("All commands grouped automatically.")
      .setColor("Blue")
      .setFooter({ text: "Prefixes: j | J | jack | Jack" });

    for (const [category, cmds] of Object.entries(categories)) {

      embed.addFields({
        name: `📂 ${category}`,
        value: cmds,
        inline: false
      });

    }

    ctx.reply({ embeds: [embed] });

  }

};