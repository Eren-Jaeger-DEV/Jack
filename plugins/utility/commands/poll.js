const {
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');

module.exports = {

  name: "poll",
  category: "utility",
  description: "Create a Yes/No poll",
  aliases: ["vote","yesno"],
  usage: "/poll <question>  |  j poll <question>",
  details: "Creates a Yes/No poll embed with reaction buttons.",

  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('Poll question')
        .setRequired(true)),

  async run(ctx) {

    let question;

    /* PREFIX */

    if (ctx.type === "prefix") {

      question = ctx.args.join(" ");

      if (!question)
        return ctx.reply("Usage: jack poll Your question here");

    }

    /* SLASH */

    if (ctx.type === "slash") {

      question = ctx.interaction.options.getString('question');

    }

    const embed = new EmbedBuilder()
      .setTitle("📊 New Poll")
      .setDescription(`**${question}**`)
      .addFields(
        { name: "👍 Yes", value: "Vote with 👍", inline: true },
        { name: "👎 No", value: "Vote with 👎", inline: true }
      )
      .setFooter({ text: `Poll by ${ctx.user.tag}` })
      .setTimestamp()
      .setColor("Purple");

    const msg = await ctx.reply({
      embeds: [embed],
      fetchReply: true
    });

    await msg.react("👍");
    await msg.react("👎");

  }

};