const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Config = require("../../../bot/database/models/ChannelCommandConfig");

module.exports = {

  name: "disable",
  category: "admin",
  description: "Disable a command category in a channel or server-wide",
  aliases: ["cmdoff","disablecmd"],
  usage: '/disable  |  j disable',
  details: 'Disables a command category in a specific channel or server-wide.',

  data: new SlashCommandBuilder()
    .setName("disable")
    .setDescription("Disable a command category")
    .addStringOption(o =>
      o.setName("category")
        .setDescription("Command category")
        .setRequired(true)
        .addChoices(
          { name: "fun", value: "fun" },
          { name: "clan", value: "clan" },
          { name: "moderation", value: "moderation" },
          { name: "utility", value: "utility" },
          { name: "admin", value: "admin" }
        )
    )
    .addChannelOption(o =>
      o.setName("channel")
        .setDescription("Channel to disable commands in")
        .setRequired(false)
    )
    .addBooleanOption(o =>
      o.setName("all")
        .setDescription("Disable this category in the whole server")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {

    /* Permission check for prefix */

    if (ctx.type === "prefix") {
      if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator))
        return ctx.reply("❌ No permission.");
    }

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
        return ctx.reply("Usage: `jack disable <category> <#channel | all>`");

      channelId =
        target === "all"
          ? "all"
          : ctx.message.mentions.channels.first()?.id;

      if (!channelId)
        return ctx.reply("Mention a channel or use 'all'.");

    }

    await Config.findOneAndUpdate(
      { guildId: ctx.guild.id, channelId, category },
      { guildId: ctx.guild.id, channelId, category },
      { upsert: true }
    );

    const target = channelId === "all" ? "entire server" : `<#${channelId}>`;

    ctx.reply(`🚫 ${category} commands disabled in ${target}`);

  }

};