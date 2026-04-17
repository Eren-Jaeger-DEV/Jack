const { EmbedBuilder } = require('discord.js');

module.exports = {

  name: "userinfo",
  category: "utility",
  description: "Get information about a user",
  aliases: ["ui","whois","user"],
  usage: "j userinfo [@user]",
  details: "Shows detailed info about a user: roles, join date, creation date, etc.",


  async run(ctx) {

    const user = ctx.message.mentions.users.first() || ctx.user;

    const member = await ctx.guild.members.fetch(user.id);

    const embed = new EmbedBuilder()
      .setTitle('👤 User Info')
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: 'Username', value: user.tag },
        { name: 'ID', value: user.id },
        { name: 'Joined Server', value: `<t:${parseInt(member.joinedTimestamp / 1000)}:R>` },
        { name: 'Account Created', value: `<t:${parseInt(user.createdTimestamp / 1000)}:R>` }
      )
      .setColor('Blue');

    ctx.reply({ embeds: [embed] });

  }

};