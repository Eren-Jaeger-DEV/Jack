const {
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');

module.exports = {

  name: "serverinfo",
  category: "utility",
  description: "Show information about the server",

  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Show information about the server'),

  async run(ctx) {

    const guild = ctx.guild;

    const embed = new EmbedBuilder()
      .setTitle('🌍 Server Information')
      .setThumbnail(guild.iconURL({ size: 512 }))
      .addFields(
        { name: 'Server Name', value: guild.name, inline: true },
        { name: 'Server ID', value: guild.id, inline: true },
        { name: 'Members', value: `${guild.memberCount}`, inline: true },
        { name: 'Boost Level', value: `${guild.premiumTier}`, inline: true },
        { name: 'Boosts', value: `${guild.premiumSubscriptionCount || 0}`, inline: true },
        { name: 'Created', value: `<t:${parseInt(guild.createdTimestamp / 1000)}:R>` }
      )
      .setColor('Green');

    ctx.reply({ embeds: [embed] });

  }

};