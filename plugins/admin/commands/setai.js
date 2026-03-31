const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const configManager = require('../../../bot/utils/configManager');

module.exports = {
  name: "setai",
  category: "admin",
  description: "Sets the smart AI channel for the server",
  usage: "/setai <channel>",

  data: new SlashCommandBuilder()
    .setName("setai")
    .setDescription("Sets the smart AI channel for the server")
    .addChannelOption(o => 
      o.setName("channel")
        .setDescription("The channel where Jack AI will respond automatically")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async run(ctx) {
    const channel = ctx.options.getChannel("channel");

    try {
      await configManager.updateGuildConfig(ctx.guild.id, {
        "settings.aiChannelId": channel.id
      });

      await ctx.reply({
        content: `✅ **AI Channel Set**: Jack will now automatically respond to every message in <#${channel.id}>.`,
        ephemeral: true
      });

    } catch (err) {
      console.error('[Admin] setai error:', err.message);
      await ctx.reply({ content: "❌ Failed to update AI channel setting.", ephemeral: true });
    }
  }
};
