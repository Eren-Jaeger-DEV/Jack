const { EmbedBuilder } = require("discord.js");
const configManager = require("../../../bot/utils/configManager");

module.exports = {
  name: "guildMemberRemove",
  async execute(member, client) {
    if (member.user.bot) return;

    try {
      const config = await configManager.getGuildConfig(member.guild.id);
      if (!config || !config.greetingData || !config.greetingData.goodbyeEnabled) return;

      let channelId = config.greetingData.goodbyeChannelId;
      let channel;

      if (channelId) {
        channel = member.guild.channels.cache.get(channelId);
      } else {
        channel = client.serverMap?.getChannelByName("goodbye");
      }

      if (!channel) return;

      const rawMessage = config.greetingData.goodbyeMessage || "**Goodbye Mate!!**\n\nThank You for spending time with us.";
      const parsedMessage = rawMessage
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{server}/g, member.guild.name)
        .replace(/{memberCount}/g, member.guild.memberCount);

      const embed = new EmbedBuilder()
        .setDescription(parsedMessage)
        .setImage(config.greetingData.goodbyeImage)
        .setColor("#0099ff") // Matches the light blue border from the reference picture
        .setFooter({ text: "🌙 Farewell & good luck" });

      await channel.send({
        content: `<@${member.id}> left..!!`,
        embeds: [embed]
      });

    } catch (err) {
      console.error("[GreetingPlugin - Goodbye] Error sending goodbye message:", err);
    }
  }
};
