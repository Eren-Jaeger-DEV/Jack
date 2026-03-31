const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logSender');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    if (member.user.bot) return;

    const embed = new EmbedBuilder()
      .setAuthor({ name: '📥 Member Joined', iconURL: member.user.displayAvatarURL() })
      .setColor('#2ecc71')
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: 'User', value: `${member.user.tag} (\`${member.id}\`)`, inline: false },
        { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Total Members', value: `${member.guild.memberCount}`, inline: true }
      )
      .setTimestamp();

    await sendLog(client, member.guild, 'join-leave', embed);
  }
};
