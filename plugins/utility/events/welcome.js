const configManager = require("../../../bot/utils/configManager");

module.exports = {
  name: 'guildMemberAdd',

  async execute(member, client) {
    if (!member.guild) return;
    if (member.user.bot) return;

    try {
      const config = await configManager.getGuildConfig(member.guild.id);
      
      if (!config || !config.welcome || !config.welcome.enabled) return;

      const channelId = config.welcome.channelId;
      const channel = await member.guild.channels.fetch(channelId).catch(() => null);

      if (!channel) {
        console.warn(`[Welcome] Welcome channel ${channelId} not found in guild ${member.guild.id}`);
        return;
      }

      let welcomeMessage = config.welcome.message || "Welcome to the server, {user}!";
      welcomeMessage = welcomeMessage.replace(/{user}/g, `<@${member.id}>`);
      welcomeMessage = welcomeMessage.replace(/{guild}/g, member.guild.name);
      welcomeMessage = welcomeMessage.replace(/{tag}/g, member.user.tag);

      await channel.send(welcomeMessage).catch(err => {
        console.error(`[Welcome] Failed to send welcome message: ${err.message}`);
      });

    } catch (err) {
      console.error("[Welcome] Error in guildMemberAdd event:", err);
    }
  }
};
