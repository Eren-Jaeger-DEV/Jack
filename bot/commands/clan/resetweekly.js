const Player = require("../../database/models/Player");
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {

  name: "resetweekly",
  category: "clan",

  data: new SlashCommandBuilder()
    .setName("resetweekly")
    .setDescription("Reset weekly synergy and assign Weekly MVP")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async run(ctx) {

    const isOwner = ctx.guild.ownerId === ctx.user.id;

    const hasPerm =
      ctx.member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
      ctx.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasPerm && !isOwner)
      return ctx.reply("❌ Only Mods/Admins can reset weekly synergy.");

    /* ---------- FIND WEEKLY WINNER ---------- */

    const topPlayer = await Player.findOne()
      .sort({ weeklySynergy: -1 });

    let winnerText = "No winner this week.";

    if (topPlayer && topPlayer.weeklySynergy > 0) {

      const roleName = process.env.WEEKLY_MVP_ROLE;

      const role = ctx.guild.roles.cache.find(r => r.name === roleName);

      if (role) {

        /* REMOVE ROLE FROM CURRENT HOLDERS */

        const membersWithRole = ctx.guild.members.cache.filter(m =>
          m.roles.cache.has(role.id)
        );

        for (const member of membersWithRole.values()) {
          await member.roles.remove(role);
        }

        /* GIVE ROLE TO NEW WINNER */

        try {

          const member = await ctx.guild.members.fetch(topPlayer.discordId);
          await member.roles.add(role);

          winnerText = `🏆 Weekly MVP: ${member.user.username} (${topPlayer.weeklySynergy})`;

        } catch {}

      }

    }

    /* ---------- RESET WEEKLY SYNERGY ---------- */

    await Player.updateMany({}, { weeklySynergy: 0 });

    ctx.reply(`🔄 Weekly synergy reset.\n${winnerText}`);

  }

};