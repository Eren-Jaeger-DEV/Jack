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

    const players = await Player.find({})
      .sort({ seasonSynergy: -1 });

    if (!players.length) {
      return ctx.reply("❌ No players registered yet.");
    }

    let list = "";
    for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const name = await resolveDisplayName(ctx.guild, p.discordId, p.ign);
        list += `${i + 1}. **${name}** — UID: ${p.uid}\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle("🎮 Clan Player Roster")
      .setDescription(list)
      .setColor("Blue")
      .setFooter({ text: `Total Players: ${players.length}` })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });

  }

};