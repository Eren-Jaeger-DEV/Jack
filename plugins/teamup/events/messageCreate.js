const { TEAMUP_CHANNEL_ID, JOIN_KEYWORDS, CHAT_DETECTION_PHRASES } = require("../config");
const teamService = require("../services/teamService");

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const content = message.content.toLowerCase();

    // 1. Join via Keywords in TeamUp Channel
    if (message.channel.id === TEAMUP_CHANNEL_ID) {
      if (JOIN_KEYWORDS.some(word => content.includes(word))) {
        try {
          const result = await teamService.joinTeam(client, message.guild, message.author.id);
          if (result.success) {
            await message.reply(`✅ You have joined the team!`);
          } else {
            // Silently ignore or short reply if no teams available to avoid spam
            if (result.message !== "No available teams found.") {
              await message.reply(`❌ ${result.message}`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
            }
          }
        } catch (err) {
          console.error("[TeamUp] Keyword join error:", err);
        }
        return;
      }
    }

    // 2. Chat Detection
    if (CHAT_DETECTION_PHRASES.some(phrase => content.includes(phrase))) {
      try {
        const team = await teamService.findBestTeam(message.guild.id, content);
        if (team) {
          await message.reply(`👋 It looks like you're looking for teammates! There's an active team looking for players in <#${TEAMUP_CHANNEL_ID}> for **${team.type}**.`);
        }
      } catch (err) {
        console.error("[TeamUp] Chat detection error:", err);
      }
    }
  }
};
