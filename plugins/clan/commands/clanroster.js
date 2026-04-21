const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { resolveDisplayName } = require("../../../bot/utils/nameResolver");
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

    const players = await Player.find({ serialNumber: /^JCM/ })
      .sort({ serialNumber: 1 });

    if (!players.length) {
      return ctx.reply("❌ No clan members registered yet.");
    }

    let list = "";
    for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const discordMention = p.discordId ? `<@${p.discordId}>` : "Unlinked";
        list += `**${p.serialNumber}** - ${p.ign} - ${p.uid} - ${discordMention}\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle("🛡️ Official Clan Roster")
      .setDescription(list)
      .setColor("#00FFCC")
      .setFooter({ text: `Total Members: ${players.length} / 60` })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });

  }

};