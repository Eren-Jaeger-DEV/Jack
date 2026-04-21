const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Player = require("../../../bot/database/models/Player");

module.exports = {

  name: "guestroster",
  category: "clan",
  description: "View the full discord guest player roster",
  aliases: ["guests", "jdmroster"],
  usage: "/guestroster  |  j guestroster",
  details: "Shows the full registered discord guest list with JDM ID, IGN, UID, and Discord mention.",

  data: new SlashCommandBuilder()
    .setName("guestroster")
    .setDescription("View the full discord guest player roster"),

  async run(ctx) {

    const players = await Player.find({ serialNumber: /^JDM/ })
      .sort({ serialNumber: 1 });

    if (!players.length) {
      return ctx.reply("❌ No guest members registered yet.");
    }

    // Header
    let list = "` ID   | IGN             | UID        `\n";
    
    for (let i = 0; i < players.length; i++) {
        const p = players[i];
        
        // Truncate/Pad IGN to 15 chars for alignment
        const ign = (p.ign || "N/A").substring(0, 15).padEnd(15, ' ');
        const id = p.serialNumber.padEnd(5, ' ');
        const uid = (p.uid || "N/A").padEnd(10, ' ');
        
        const discordMention = p.discordId ? `<@${p.discordId}>` : "Unlinked";
        
        list += `\`${id} | ${ign} | ${uid} \` ${discordMention}\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle("🤝 Official Guest Roster")
      .setDescription(list)
      .setColor("#FFD700") // Gold color for guests
      .setFooter({ text: `Total Guests: ${players.length}` })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });

  }

};
