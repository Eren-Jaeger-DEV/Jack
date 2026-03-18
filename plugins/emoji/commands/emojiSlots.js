const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getEmojiSlots, getStickerSlots } = require("../../../bot/utils/slotManager");

module.exports = {
  name: "emojislots",
  category: "emoji",
  description: "Check the current server emoji and sticker slot usage.",
  aliases: ["slots","emojicap"],
  usage: "/emojislots  |  j emoji slots",
  details: "Shows current emoji and sticker slot usage for the server.",

  data: new SlashCommandBuilder()
    .setName("emojislots")
    .setDescription("Check the current server emoji and sticker slot usage against Nitro constraints."),

  async run(ctx) {
     const emojiInfo = getEmojiSlots(ctx.guild);
     const stickerInfo = getStickerSlots(ctx.guild);

     const totalEmojiMax = emojiInfo.maxStatic + emojiInfo.maxAnimated;
     const totalEmojiUsed = emojiInfo.currentStatic + emojiInfo.currentAnimated;

     const embed = new EmbedBuilder()
        .setTitle("Server Slot Usage")
        .setColor("Blue")
        .addFields(
           { 
             name: "Emoji Slots", 
             value: `**${totalEmojiUsed} / ${totalEmojiMax}** used overall.\nStatic: ${emojiInfo.currentStatic}/${emojiInfo.maxStatic}\nAnimated: ${emojiInfo.currentAnimated}/${emojiInfo.maxAnimated}`,
             inline: true
           },
           {
             name: "Sticker Slots",
             value: `**${stickerInfo.current} / ${stickerInfo.max}** used.`,
             inline: true
           }
        );

     if (totalEmojiMax - totalEmojiUsed <= 5 || stickerInfo.max - stickerInfo.current <= 1) {
         embed.setDescription("⚠️ Slots are nearly full! Consider running `j emoji cleanup` or using `j emoji temp` dynamically.");
         embed.setColor("Orange");
     }

     return ctx.reply({ embeds: [embed] });
  }
};
