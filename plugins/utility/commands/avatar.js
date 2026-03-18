const {
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');

module.exports = {

  name: "avatar",
  category: "utility",
  description: "Show a user's avatar",
  aliases: ['av', 'pfp', 'icon'],
  usage: '/avatar [@user]  |  j avatar [@user]',
  details: 'Displays the full-size avatar of yourself or another user.',

  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Show user avatar')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User whose avatar you want')
        .setRequired(false)),

  async run(ctx) {

    let user;

    /* PREFIX */

    if (ctx.type === "prefix") {

      user = ctx.message.mentions.users.first() || ctx.user;

    }

    /* SLASH */

    if (ctx.type === "slash") {

      user = ctx.interaction.options.getUser('user') || ctx.user;

    }

    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}'s Avatar`)
      .setImage(user.displayAvatarURL({ size: 512 }))
      .setColor('Purple');

    ctx.reply({ embeds: [embed] });

  }

};