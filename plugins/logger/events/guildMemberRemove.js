const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logSender');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member, client) {
    if (member.user.bot) return;

    const embed = new EmbedBuilder()
      .setAuthor({ name: '📤 Member Left', iconURL: member.user.displayAvatarURL() })
      .setColor('#e67e22')
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: 'User', value: `${member.user.tag} (\`${member.id}\`)`, inline: false },
        { name: 'Total Members', value: `${member.guild.memberCount}`, inline: true }
      )
      .setTimestamp();

    await sendLog(client, member.guild, 'join-leave', embed);
  }
};
