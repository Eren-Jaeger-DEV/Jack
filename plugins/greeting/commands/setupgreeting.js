const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const configManager = require("../../../bot/utils/configManager");

module.exports = {
  name: "setupgreeting",
  category: "admin",
  description: "Configure channels for welcome and goodbye messages.",
  usage: "/setupgreeting <welcome|goodbye> [channel] [enabled]",
  aliases: ["setgreet", "greetconfig"],
  details: "Use this to manage the channels for the greeting plugin.",

  data: new SlashCommandBuilder()
    .setName("setupgreeting")
    .setDescription("Configure welcome and goodbye settings")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => 
      sub.setName("welcome")
         .setDescription("Set the welcome message channel")
         .addChannelOption(o => o.setName("channel").setDescription("Where to send welcome messages"))
         .addBooleanOption(o => o.setName("enabled").setDescription("Turn welcomes on/off"))
    )
    .addSubcommand(sub => 
      sub.setName("goodbye")
         .setDescription("Set the goodbye message channel")
         .addChannelOption(o => o.setName("channel").setDescription("Where to send goodbye messages"))
         .addBooleanOption(o => o.setName("enabled").setDescription("Turn goodbyes on/off"))
    ),

  async run(ctx) {
    if (ctx.type === 'prefix') {
      return ctx.reply("❌ Please use the slash command `/setupgreeting` to configure these settings.");
    }

    const command = ctx.options.getSubcommand();
    const channel = ctx.options.getChannel("channel");
    const enabled = ctx.options.getBoolean("enabled");

    if (channel === null && enabled === null) {
      return ctx.reply({ content: "⚠️ You must specify a channel or toggle it enabled/disabled.", ephemeral: true });
    }

    const guildId = ctx.guild.id;
    let config = await configManager.getGuildConfig(guildId);
    
    if (!config.greetingData) {
      config.greetingData = {
        welcomeEnabled: false,
        welcomeChannelId: null,
        welcomeMessage: 'Welcome to **{server}**, {user}!',
        welcomeImage: 'https://cdn.discordapp.com/attachments/1353964404378701916/1394935239557517322/standard_1.gif',
        goodbyeEnabled: false,
        goodbyeChannelId: null,
        goodbyeMessage: '**Goodbye Mate!!**\n\nThank You for spending time with us.',
        goodbyeImage: 'https://cdn.discordapp.com/attachments/1353964404378701916/1402495184943452170/standard_2.gif'
      };
    }

    let updates = { ...config.greetingData };
    let replyMsg = [];

    if (command === "welcome") {
      if (channel !== null) { updates.welcomeChannelId = channel.id; replyMsg.push(`Channel set to: <#${channel.id}>`); updates.welcomeEnabled = true; }
      if (enabled !== null) { updates.welcomeEnabled = enabled; replyMsg.push(`Enabled status: **${enabled}**`); }
    } else if (command === "goodbye") {
      if (channel !== null) { updates.goodbyeChannelId = channel.id; replyMsg.push(`Channel set to: <#${channel.id}>`); updates.goodbyeEnabled = true; }
      if (enabled !== null) { updates.goodbyeEnabled = enabled; replyMsg.push(`Enabled status: **${enabled}**`); }
    }

    await configManager.updateGuildConfig(guildId, { greetingData: updates });

    return ctx.reply(`✅ **${command.charAt(0).toUpperCase() + command.slice(1)} Settings Updated**\n` + replyMsg.map(x => `・ ${x}`).join('\n'));
  }
};
