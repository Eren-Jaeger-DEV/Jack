const Player = require("../../database/models/Player");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {

  name: "clanroster",
  category: "clan",

  data: new SlashCommandBuilder()
    .setName("clanroster")
    .setDescription("View the full clan player roster"),

  async run(ctx) {

    const players = await Player.find({})
      .sort({ seasonSynergy: -1 });

    if (!players.length)
      return ctx.reply("❌ No players registered yet.");

    const list = players.map((p, i) => {

      return `${i + 1}. **${p.ign}** — UID: ${p.uid}`;

    }).join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🎮 Clan Player Roster")
      .setDescription(list)
      .setColor("Blue")
      .setFooter({ text: `Total Players: ${players.length}` })
      .setTimestamp();

    ctx.reply({ embeds: [embed] });

  }

};