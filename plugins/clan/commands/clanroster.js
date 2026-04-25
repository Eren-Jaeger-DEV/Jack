const { 
  SlashCommandBuilder, 
  ContainerBuilder, 
  SectionBuilder, 
  TextDisplayBuilder, 
  SeparatorBuilder,
  MessageFlags 
} = require("discord.js");
const Player = require("../../../bot/database/models/Player");

module.exports = {

  name: "clanroster",
  category: "clan",
  description: "View the full clan player roster",
  aliases: ["roster","players"],
  usage: "/clanroster  |  j clanroster",
  details: "Shows the full registered clan member list with IGN, UID, and synergy.",

  data: new SlashCommandBuilder()
    .setName("clanroster")
    .setDescription("View the full clan player roster"),

  async run(ctx) {
    const players = await Player.find({ serialNumber: /^JCM/ }).sort({ serialNumber: 1 });

    if (!players.length) {
      return ctx.reply("❌ No clan members registered yet.");
    }

    const container = new ContainerBuilder();

    // 1. Header
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent("🛡️ **Official Clan Roster**")
    );

    container.addSeparatorComponents(new SeparatorBuilder());

    // 2. Roster List
    let list = "` ID  | IGN             | UID        `\n";
    
    for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const ign = (p.ign || "N/A").substring(0, 15).padEnd(15, ' ');
        const id = p.serialNumber.padEnd(4, ' ');
        const uid = (p.uid || "N/A").padEnd(10, ' ');
        const discordMention = p.discordId ? `<@${p.discordId}>` : "Unlinked";
        
        list += `\`${id} | ${ign} | ${uid} \` ${discordMention}\n`;
        
        // Split into multiple TextDisplay if it gets too long (Discord limit is ~1000 per TextDisplay)
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
      new TextDisplayBuilder().setContent(`*Total Members: ${players.length} / 60*`)
    );

    await ctx.reply({ 
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }

};