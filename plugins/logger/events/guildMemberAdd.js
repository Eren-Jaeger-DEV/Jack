const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logSender');
const { formatDuration } = require('../utils/auditUtils');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    if (member.user.bot) return;

    const accountAge = Date.now() - member.user.createdTimestamp;
    const embed = new EmbedBuilder()
      .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
      .setTitle('Member joined')
      .setDescription(`<@${member.id}> joined the server`)
      .setColor('#2ecc71') // Green
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: 'Account Age', value: `${formatDuration(accountAge)}` },
        { name: 'Creation Date', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:f>` }
      )
      .setTimestamp()
      .setFooter({ text: `ID: ${member.id}` });

    await sendLog(client, member.guild, 'join-leave', embed);
  }
};
