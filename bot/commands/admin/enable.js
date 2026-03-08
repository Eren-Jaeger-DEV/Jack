const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Config = require("../../database/models/ChannelCommandConfig");

module.exports = {

  name: "enable",
  category: "admin",
  description: "Enable a command category",

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

  async execute(interaction) {

    const category = interaction.options.getString("category");
    const channel = interaction.options.getChannel("channel");
    const all = interaction.options.getBoolean("all");

    let channelId;

    if (all) {
      channelId = "all";
    } else if (channel) {
      channelId = channel.id;
    } else {
      return interaction.reply({
        content: "Provide a channel or enable `all`.",
        ephemeral: true
      });
    }

    await Config.deleteOne({
      guildId: interaction.guild.id,
      channelId,
      category
    });

    const target = channel ? channel : "entire server";

    interaction.reply(`✅ ${category} commands enabled in ${target}`);

  },

  async runPrefix(client, message, args) {

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply("No permission.");

    const category = args[0];
    const target = args[1];

    if (!category || !target)
      return message.reply("Usage: j enable <category> <#channel | all>");

    const channelId =
      target === "all"
        ? "all"
        : message.mentions.channels.first()?.id;

    if (!channelId)
      return message.reply("Mention a channel or use 'all'.");

    await Config.deleteOne({
      guildId: message.guild.id,
      channelId,
      category
    });

    message.reply(`✅ ${category} commands enabled in ${target}`);

  }

};