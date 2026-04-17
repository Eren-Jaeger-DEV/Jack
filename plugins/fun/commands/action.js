const { EmbedBuilder } = require("discord.js");

module.exports = {

  name: "action",
  category: "fun",
  description: "Perform a fun action (hug, slap, kiss, etc.)",
  aliases: ["do","react"],
  usage: "j action <type> [@user]",
  details: "Performs a fun animated action: hug, slap, kiss, poke, pat, and more.",


  async run(ctx) {

    const type = ctx.args[0];
    const user = ctx.message.mentions.users.first();

    const allowed = [
      "hug","pat","slap","kiss","poke","wave","dance","cry",
      "punch","kick","kill","happy","sad","smile","innocent","evil","irritate"
    ];

    if (!type || !allowed.includes(type))
      return ctx.reply(`Available actions: ${allowed.join(", ")}`);

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