const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const configManager = require("../../../bot/utils/configManager");

module.exports = {
  name: "setupgreeting",
  category: "admin",
  description: "Configure the welcome and goodbye messages and channels.",
  usage: "/setupgreeting <welcome|goodbye> [channel] [enabled] [image] [message]",
  aliases: ["setgreet", "greetconfig"],
  details: "Use this to manage the greeting plugin channels and toggles. You can use {user}, {server}, and {memberCount} in your messages.",

  data: new SlashCommandBuilder()
    .setName("setupgreeting")
    .setDescription("Configure welcome and goodbye settings")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => 
      sub.setName("welcome")
         .setDescription("Configure the welcome message settings")
         .addChannelOption(o => o.setName("channel").setDescription("Where to send welcome messages"))
         .addBooleanOption(o => o.setName("enabled").setDescription("Turn welcomes on/off"))
         .addStringOption(o => o.setName("image").setDescription("URL of the GIF/image to use"))
         .addStringOption(o => o.setName("message").setDescription("Custom message text"))
    )
    .addSubcommand(sub => 
      sub.setName("goodbye")
         .setDescription("Configure the goodbye message settings")
         .addChannelOption(o => o.setName("channel").setDescription("Where to send goodbye messages"))
         .addBooleanOption(o => o.setName("enabled").setDescription("Turn goodbyes on/off"))
         .addStringOption(o => o.setName("image").setDescription("URL of the GIF/image to use"))
         .addStringOption(o => o.setName("message").setDescription("Custom message text"))
    ),

  async run(ctx) {
    if (ctx.type === 'prefix') {
      return ctx.reply("❌ Please use the slash command `/setupgreeting` to configure these complex settings.");
    }

    const command = ctx.options.getSubcommand();
    const channel = ctx.options.getChannel("channel");
    const enabled = ctx.options.getBoolean("enabled");
    const image = ctx.options.getString("image");
    const message = ctx.options.getString("message");

    // Require at least one option to be modified
    if (channel === null && enabled === null && image === null && message === null) {
      return ctx.reply({ content: "⚠️ You must specify at least one option to update.", ephemeral: true });
    }

    const guildId = ctx.guild.id;
    let config = await configManager.getGuildConfig(guildId);
    
    // Ensure the greetingData object exists
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
      if (channel !== null) { updates.welcomeChannelId = channel.id; replyMsg.push(`Channel: <#${channel.id}>`); }
      if (enabled !== null) { updates.welcomeEnabled = enabled; replyMsg.push(`Enabled: **${enabled}**`); }
      if (image !== null) { updates.welcomeImage = image; replyMsg.push(`Image: [Link](${image})`); }
      if (message !== null) { updates.welcomeMessage = message; replyMsg.push(`Message Updated`); }
    } else if (command === "goodbye") {
      if (channel !== null) { updates.goodbyeChannelId = channel.id; replyMsg.push(`Channel: <#${channel.id}>`); }
      if (enabled !== null) { updates.goodbyeEnabled = enabled; replyMsg.push(`Enabled: **${enabled}**`); }
      if (image !== null) { updates.goodbyeImage = image; replyMsg.push(`Image: [Link](${image})`); }
      if (message !== null) { updates.goodbyeMessage = message; replyMsg.push(`Message Updated`); }
    }

    await configManager.updateGuildConfig(guildId, { greetingData: updates });

    return ctx.reply(`✅ **${command.charAt(0).toUpperCase() + command.slice(1)} Settings Updated**\n` + replyMsg.map(x => `・ ${x}`).join('\n'));
  }
};
