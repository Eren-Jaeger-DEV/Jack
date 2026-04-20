const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Config = require("../../../bot/database/models/ChannelCommandConfig");

module.exports = {

  name: "enable",
  category: "admin",
  description: "Enable a command category in a channel or server-wide",
  aliases: ["cmdon","enablecmd"],
  usage: "/enable  |  j enable",
  details: "Re-enables a previously disabled command category.",
  userPermissions: [PermissionFlagsBits.Administrator],

  data: new SlashCommandBuilder()
    .setName("enable")
    .setDescription("Enable a command category")
    .addStringOption(o =>
      o.setName("category")
        .setDescription("Command category")
        .setRequired(true)
    )
    .addChannelOption(o =>
      o.setName("channel")
        .setDescription("Channel to enable commands in")
        .setRequired(false)
    )
    .addBooleanOption(o =>
      o.setName("all")
        .setDescription("Enable in the whole server")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {
    let category;
    let channelId;

    /* SLASH */

    if (ctx.type === "slash") {

      category = ctx.options.getString("category");
      const channel = ctx.options.getChannel("channel");
      const all = ctx.options.getBoolean("all");

      if (all) {
        channelId = "all";
      } else if (channel) {
        channelId = channel.id;
      } else {
        return ctx.reply("Provide a channel or enable `all`.");
      }

    }

    /* PREFIX */

    if (ctx.type === "prefix") {

      category = ctx.args[0];
      const target = ctx.args[1];

      if (!category || !target)
        return ctx.reply("Usage: `jack enable <category> <#channel | all>`");

      channelId =
        target === "all"
          ? "all"
          : ctx.message.mentions.channels.first()?.id;

      if (!channelId)
        return ctx.reply("Mention a channel or use 'all'.");

    }

    await Config.deleteOne({
      guildId: ctx.guild.id,
      channelId,
      category
    });

    const target = channelId === "all" ? "entire server" : `<#${channelId}>`;

    ctx.reply(`✅ ${category} commands enabled in ${target}`);

  }

};