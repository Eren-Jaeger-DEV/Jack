const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const GuildConfig = require("../../../bot/database/models/GuildConfig");

module.exports = {

  name: "setlog",
  category: "admin",
  description: "Set the moderation log channel",
  aliases: ["modlog","setmodlog"],
  usage: '/setlog  |  j setlog',
  details: 'Sets the channel where moderation actions are logged.',

  data: new SlashCommandBuilder()
    .setName('setlog')
    .setDescription('Set the moderation log channel')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Select log channel')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {

    /* Permission check for prefix */

    if (ctx.type === "prefix") {
      if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator))
        return ctx.reply("❌ No permission.");
    }

    let channel;

    /* SLASH */

    if (ctx.type === "slash") {

      channel = ctx.options.getChannel('channel');

    }

    /* PREFIX */

    if (ctx.type === "prefix") {

      channel = ctx.message.mentions.channels.first();

      if (!channel) {
        return ctx.reply("Usage: `jack setlog #channel`");
      }

    }

    await GuildConfig.findOneAndUpdate(
      { guildId: ctx.guild.id },
      { logChannelId: channel.id },
      { upsert: true }
    );

    await ctx.reply(`✅ Log channel set to ${channel}`);

  }

};