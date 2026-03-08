const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {

  name: "action",
  category: "fun",
  description: "Perform a fun action",

  data: new SlashCommandBuilder()
    .setName("action")
    .setDescription("Perform a fun action")
    .addStringOption(option =>
      option
        .setName("type")
        .setDescription("Action type")
        .setRequired(true)
        .addChoices(
          { name: "hug", value: "hug" },
          { name: "pat", value: "pat" },
          { name: "slap", value: "slap" },
          { name: "kiss", value: "kiss" },
          { name: "poke", value: "poke" },
          { name: "wave", value: "wave" },
          { name: "dance", value: "dance" },
          { name: "cry", value: "cry" },
          { name: "punch", value: "slap" },   // fallback mapping
          { name: "kick", value: "slap" },
          { name: "kill", value: "slap" },
          { name: "happy", value: "happy" },
          { name: "sad", value: "cry" },
          { name: "smile", value: "smile" },
          { name: "innocent", value: "blush" },
          { name: "evil", value: "smug" },
          { name: "irritate", value: "annoy" }
        )
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Target user")
        .setRequired(false)
    ),

  /* ---------- SLASH COMMAND ---------- */

  async execute(interaction) {

    const type = interaction.options.getString("type");
    const user = interaction.options.getUser("user");

    let gif;

    try {

      const res = await fetch(`https://nekos.best/api/v2/${type}`);
      const data = await res.json();

      gif = data?.results?.[0]?.url;

    } catch {}

    if (!gif) {
      gif = "https://media.tenor.com/6Xb1Gq8Lh9kAAAAC/anime.gif";
    }

    const text = user
      ? `**${interaction.user.username}** ${type}s **${user.username}**`
      : `**${interaction.user.username}** ${type}s`;

    const embed = new EmbedBuilder()
      .setDescription(text)
      .setImage(gif)
      .setColor("Random");

    interaction.reply({ embeds: [embed] });

  },

  /* ---------- PREFIX COMMAND ---------- */

  async runPrefix(client, message, args) {

    const type = args[0];
    const user = message.mentions.users.first();

    const allowed = [
      "hug","pat","slap","kiss","poke","wave","dance","cry",
      "punch","kick","kill","happy","sad","smile","innocent","evil","irritate"
    ];

    if (!allowed.includes(type))
      return message.reply(`Available actions: ${allowed.join(", ")}`);

    let gif;

    try {

      const res = await fetch(`https://nekos.best/api/v2/${type}`);
      const data = await res.json();

      gif = data?.results?.[0]?.url;

    } catch {}

    if (!gif) {
      gif = "https://media.tenor.com/6Xb1Gq8Lh9kAAAAC/anime.gif";
    }

    const text = user
      ? `**${message.author.username}** ${type}s **${user.username}**`
      : `**${message.author.username}** ${type}s`;

    const embed = new EmbedBuilder()
      .setDescription(text)
      .setImage(gif)
      .setColor("Random");

    message.reply({ embeds: [embed] });

  }

};