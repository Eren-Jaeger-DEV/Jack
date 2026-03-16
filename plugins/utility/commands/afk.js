const Afk = require("../../../bot/database/models/Afk");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {

  name: "afk",
  category: "utility",
  description: "Set yourself as AFK",

  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Set yourself as AFK")
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason")
        .setRequired(false)
    ),

  async run(ctx) {

    let reason;

    /* SLASH */

    if (ctx.type === "slash") {

      reason = ctx.options.getString("reason") || "AFK";

    }

    /* PREFIX */

    if (ctx.type === "prefix") {

      reason = ctx.args.join(" ") || "AFK";

    }

    const member = await ctx.guild.members.fetch(ctx.user.id);

    await Afk.findOneAndUpdate(
      { userId: ctx.user.id },
      { reason, since: new Date() },
      { upsert: true }
    );

    if (!member.nickname || !member.nickname.startsWith("[AFK]")) {

      const newNick = `[AFK] ${member.displayName.replace("[AFK] ", "")}`;

      await member.setNickname(newNick).catch(() => {});

    }

    ctx.reply(`You are now AFK: **${reason}**`);

  }

};