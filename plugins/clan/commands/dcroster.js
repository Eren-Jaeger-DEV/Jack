const { 
  SlashCommandBuilder, 
  ContainerBuilder, 
  TextDisplayBuilder, 
  SeparatorBuilder, 
  MessageFlags 
} = require("discord.js");
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

    const container = new ContainerBuilder();

    // 1. Header
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent("🛡️ **Official DC Member Roster**")
    );

    container.addSeparatorComponents(new SeparatorBuilder());

    // 2. Roster List
    let list = "` ID   | IGN             | UID        `\n";
    
    for (let i = 0; i < players.length; i++) {
        const p = players[i];
        
        // Truncate/Pad IGN to 15 chars for alignment
        const ign = (p.ign || "N/A").substring(0, 15).padEnd(15, ' ');
        const id = p.serialNumber.padEnd(5, ' ');
        const uid = (p.uid || "N/A").padEnd(10, ' ');
        
        const discordMention = p.discordId ? `<@${p.discordId}>` : "Unlinked";
        
        list += `\`${id} | ${ign} | ${uid} \` ${discordMention}\n`;

        if (list.length > 800) {
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(list));
            list = "";
        }
    }

    if (list) {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(list));
    }

    container.addSeparatorComponents(new SeparatorBuilder());

    // 3. Footer
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`*Total Members: ${players.length}*`)
    );

    await ctx.reply({ 
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });

  }

};
