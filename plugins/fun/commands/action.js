const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {

  name: "action",
  category: "fun",
  description: "Perform a fun action (hug, slap, kiss, etc.)",
  aliases: ["do","react"],
  usage: '/action <type> [@user]  |  j action <type> [@user]',
  details: 'Performs a fun animated action: hug, slap, kiss, poke, pat, and more.',

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
          { name: "punch", value: "slap" },
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

  async run(ctx) {

    let type;
    let user;

    /* SLASH */

    if (ctx.type === "slash") {

      type = ctx.options.getString("type");
      user = ctx.options.getUser("user");

    }

    /* PREFIX */

    if (ctx.type === "prefix") {

      type = ctx.args[0];
      user = ctx.message.mentions.users.first();

      const allowed = [
        "hug","pat","slap","kiss","poke","wave","dance","cry",
        "punch","kick","kill","happy","sad","smile","innocent","evil","irritate"
      ];

      if (!type || !allowed.includes(type))
        return ctx.reply(`Available actions: ${allowed.join(", ")}`);

    }

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
      ? `**${ctx.user.username}** ${type}s **${user.username}**`
      : `**${ctx.user.username}** ${type}s`;

    const embed = new EmbedBuilder()
      .setDescription(text)
      .setImage(gif)
      .setColor("Random");

    ctx.reply({ embeds: [embed] });

  }

};