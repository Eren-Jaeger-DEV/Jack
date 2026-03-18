const Player = require("../../../bot/database/models/Player");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {

  name: "clanroster",
  category: "clan",
  description: "View the full clan player roster",
  aliases: ["roster","players"],
  usage: '/clanroster  |  j clanroster',
  details: 'Shows the full registered clan member list with IGN, UID, and synergy.',

  data: new SlashCommandBuilder()
    .setName("clanroster")
    .setDescription("View the full clan player roster"),

  async run(ctx) {

    const players = await Player.find({})
      .sort({ seasonSynergy: -1 });

    if (!players.length) {
      return ctx.reply("❌ No players registered yet.");
    }

    const list = players
      .map((p, i) => `${i + 1}. **${p.ign}** — UID: ${p.uid}`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🎮 Clan Player Roster")
      .setDescription(list)
      .setColor("Blue")
      .setFooter({ text: `Total Players: ${players.length}` })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });

  }

};