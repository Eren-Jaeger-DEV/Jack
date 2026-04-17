const Afk = require("../../../bot/database/models/Afk");


module.exports = {

  name: "afk",
  category: "utility",
  description: "Set yourself as AFK",
  aliases: ["away","setafk"],
  usage: "j afk [reason]",
  details: "Marks you as AFK. Bot will mention others when they ping you.",


  async run(ctx) {

    const reason = ctx.args.join(" ") || "AFK";

    const member = await ctx.guild.members.fetch(ctx.user.id);

    await Afk.findOneAndUpdate(
      { userId: ctx.user.id },
      { reason, since: new Date() },
      { upsert: true }
    );


    ctx.reply(`You are now AFK: **${reason}**`);

  }

};