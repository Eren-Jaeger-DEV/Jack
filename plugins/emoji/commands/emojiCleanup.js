const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const EmojiUsage = require("../../../bot/database/models/EmojiUsage");

module.exports = {
  name: "emojicleanup",
  category: "emoji",
  description: "Scans for server emojis unused in the CDN for 30+ days.",
  aliases: ["mojiscan","emojiscan"],
  usage: '/emojicleanup  |  j emoji cleanup',
  details: 'Scans for server emojis unused in the CDN for 30+ days to free up slots.',

  data: new SlashCommandBuilder()
    .setName("emojicleanup")
    .setDescription("Scans for server emojis unused in the CDN for 30+ days."),

  async run(ctx) {
     if (!ctx.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers) && !ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
         return ctx.reply({ content: "❌ You need `Manage Emojis and Stickers` permission.", flags: 64 });
     }

     await ctx.deferReply();

     const serverEmojis = Array.from(ctx.guild.emojis.cache.values());
     const threshold = new Date();
     threshold.setDate(threshold.getDate() - 30); // 30 days ago

     // Find all usage documents globally
     const allUsage = await EmojiUsage.find({});
     
     // 1. We want to find server emojis that haven't been touched in the usage tracker
     // or whose newest usage across ANY user is older than 30 days.
     const deadEmojis = [];

     serverEmojis.forEach(se => {
         const usages = allUsage.filter(u => u.emojiName === se.name.toLowerCase());
         if (usages.length === 0) {
            // Never explicitly used by the `j emoji` or `j emoji temp` system
            deadEmojis.push(se);
         } else {
            // Find the most recent usage
            const maxDate = Math.max(...usages.map(u => u.lastUsed.getTime()));
            if (maxDate < threshold.getTime()) {
                deadEmojis.push(se);
            }
         }
     });

     if (deadEmojis.length === 0) {
        return ctx.editReply("✅ All server emojis appear active or haven't met the 30-day inactivity threshold!");
     }

     const listStr = deadEmojis.map(e => `${e} (\`${e.name}\`)`).join(" ");
     let safeListStr = listStr;
     if (listStr.length > 2000) safeListStr = listStr.substring(0, 1950) + "...";

     const embed = new EmbedBuilder()
        .setTitle(`🗑️ Cleanup Suggested: ${deadEmojis.length} Stale Emojis`)
        .setColor("Red")
        .setDescription(`The following emojis have not been actively summoned via the CDN or Bot recently.\nYou may safely delete them to reclaim slots:\n\n${safeListStr}`);

     return ctx.editReply({ embeds: [embed] });
  }
};
