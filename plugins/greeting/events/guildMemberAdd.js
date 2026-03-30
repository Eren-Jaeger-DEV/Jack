const { EmbedBuilder } = require("discord.js");
const configManager = require("../../../bot/utils/configManager");

module.exports = {
  name: "guildMemberAdd",
  async execute(member, client) {
    if (member.user.bot) return;

    try {
      const config = await configManager.getGuildConfig(member.guild.id);
      if (!config || !config.greetingData || !config.greetingData.welcomeEnabled) return;

      const channelId = config.greetingData.welcomeChannelId;
      if (!channelId) return;

      const channel = member.guild.channels.cache.get(channelId);
      if (!channel) return;

      // Extract raw data from config or use defaults specifically tuned to the user's reference
      const rawMessage = config.greetingData.welcomeMessage || "*We Are Pleased To Have You Here*\n\n✁- - - - - - - - - - - -\nYou are the {memberCount}th member here.\n✦ Chatting Area ✦\n➤ <#1341981246619648092>\n✦ Read Rules ✦\n➤ <#1341981246619648092>\n✦ Self Roles ✦\n➤ <#1341981246619648092>\n✦ Server Info. ✦\n➤ <#1341981246619648092>\n\n✁- - - - - - - - - - - -";
      
      const parsedMessage = rawMessage
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{server}/g, member.guild.name)
        .replace(/{memberCount}/g, member.guild.memberCount);

      const embed = new EmbedBuilder()
        .setTitle(`Welcome to ${member.guild.name}!!`)
        .setDescription(parsedMessage)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setImage(config.greetingData.welcomeImage)
        .setColor("#2b2d31") // Dark/Invisible theme as seen in reference
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
