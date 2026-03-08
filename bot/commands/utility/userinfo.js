const {
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');

module.exports = {

  name: "userinfo",
  category: "utility",

  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get information about a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
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