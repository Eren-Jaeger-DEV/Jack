const { Events, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logSender');
const { formatDuration } = require('../utils/auditUtils');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member, client) {
    if (member.user.bot) return;

    const joinedDuration = member.joinedTimestamp 
      ? `joined ${formatDuration(Date.now() - member.joinedTimestamp)} ago` 
      : 'left the server';

    const embed = new EmbedBuilder()
      .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
      .setTitle('Member left')
      .setDescription(`<@${member.id}> ${joinedDuration}`)
      .setColor('#f1c40f')
      .setTimestamp()
      .setFooter({ text: `ID: ${member.id}` });

    // Display Roles (Carl-bot Style)
    const roles = member.roles.cache
      .filter(role => role.id !== member.guild.id)
      .map(role => `${role}`)
      .join(' ');

    if (roles) {
      embed.addFields({ name: 'Roles', value: roles, inline: false });
    }

    await sendLog(client, member.guild, 'join-leave', embed);
  }
};
