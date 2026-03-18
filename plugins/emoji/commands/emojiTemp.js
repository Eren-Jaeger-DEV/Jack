const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { spawnTempEmoji } = require("../../../bot/utils/tempEmojiManager");

module.exports = {
  name: "emojitemp",
  category: "emoji",
  description: "Temporarily install a global emoji for 10 minutes to save slots.",
  aliases: ["tempemoji","borrowmoji"],
  usage: "/emojitemp <name>  |  j emoji temp <name>",
  details: "Temporarily installs a global emoji for 10 minutes to save permanent slots.",

  data: new SlashCommandBuilder()
    .setName("emojitemp")
    .setDescription("Temporarily install a global emoji for 10 minutes to save slots.")
    .addStringOption(opt => opt.setName("name").setDescription("Exact name of the vault emoji").setRequired(true)),

  async run(ctx) {
     if (!ctx.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers) && !ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
         return ctx.reply({ content: "❌ You need `Manage Emojis and Stickers` permission.", flags: 64 });
     }

     const query = ctx.type === "slash" ? ctx.options.getString("name").toLowerCase() : ctx.args.join(" ").toLowerCase();
     if (!query) return ctx.reply("❌ Please provide the emoji name.");

     await ctx.deferReply();
     
     const result = await spawnTempEmoji(ctx.guild, query, 600000, ctx.user?.id || ctx.author.id);
     return ctx.editReply(result.message);
  }
};
