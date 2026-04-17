const {
  EmbedBuilder
} = require('discord.js');

module.exports = {

  name: "avatar",
  category: "utility",
  description: "Show a user's avatar",
  aliases: ['av', 'pfp', 'icon'],
  usage: "j avatar [@user]",
  details: "Displays the full-size avatar of yourself or another user.",


  async run(ctx) {

    const user = ctx.message.mentions.users.first() || ctx.user;

    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}'s Avatar`)
      .setImage(user.displayAvatarURL({ size: 512 }))
      .setColor('Purple');

    ctx.reply({ embeds: [embed] });

  }

};