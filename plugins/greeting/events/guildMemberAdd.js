const { EmbedBuilder } = require("discord.js");
const configManager = require("../../../bot/utils/configManager");

module.exports = {
  name: "guildMemberAdd",
  async execute(member, client) {
    if (member.user.bot) return;

    try {
      const config = await configManager.getGuildConfig(member.guild.id);
      if (!config || !config.greetingData || !config.greetingData.welcomeEnabled) return;

      let channelId = config.greetingData.welcomeChannelId;
      let channel;

      if (channelId) {
        channel = member.guild.channels.cache.get(channelId);
      } else {
        // Fallback to ServerMapManager checking for channel named 'welcome' exactly as requested
        channel = client.serverMap?.getChannelByName("welcome");
      }

      if (!channel) return;

      // Extract raw data from config or use defaults specifically tuned to the user's reference
      const rawMessage = config.greetingData.welcomeMessage || "⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘\nYou are the {memberCount}th member here.\n✦ Chatting Area ✦\n➤ <#1341978656096129065>\n✦ Read Rules ✦\n➤ <#1477894453300559957>\n✦ Self Roles ✦\n➤ <#1408839027771048148>\n✦ Server Info. ✦\n➤ <#1477894589565374667>\n⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘";
      
      const parsedMessage = rawMessage
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{server}/g, member.guild.name)
        .replace(/{memberCount}/g, member.guild.memberCount)
        .replace(/{server\(members\)}/g, member.guild.memberCount);

      const embed = new EmbedBuilder()
        .setAuthor({ name: `Welcome to ${member.guild.name}!!` })
        .setTitle(`*We Are Pleased To Have You Here*`)
        .setDescription(parsedMessage)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setImage(config.greetingData.welcomeImage)
        .setColor(5198940) 
        .setFooter({ text: "Hope You'll Enjoy Your Time With Us." });

      await channel.send({
        content: `Hey <@${member.id}>!`,
        embeds: [embed]
      });

    } catch (err) {
      console.error("[GreetingPlugin - Welcome] Error sending welcome message:", err);
    }
  }
};
