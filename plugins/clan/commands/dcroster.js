const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Player = require("../../../bot/database/models/Player");

module.exports = {

  name: "dcroster",
  category: "clan",
  description: "View the full discord member player roster",
  aliases: ["dc", "guests", "jdmroster"],
  usage: "/dcroster  |  j dcroster",
  details: "Shows the full registered discord member list with JDM ID, IGN, UID, and Discord mention.",

  data: new SlashCommandBuilder()
    .setName("dcroster")
    .setDescription("View the full discord member player roster"),

  async run(ctx) {

    const players = await Player.find({ serialNumber: /^JDM/ })
      .sort({ serialNumber: 1 });

    if (!players.length) {
      return ctx.reply("❌ No discord members registered yet.");
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
      .setTitle("🛡️ Official DC Member Roster")
      .setDescription(list)
      .setColor("#FFD700") // Gold color for members
      .setFooter({ text: `Total Members: ${players.length}` })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });

  }

};
