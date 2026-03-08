const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Config = require("../../database/models/ChannelCommandConfig");

module.exports = {

  name: "disable",
  category: "admin",
  description: "Disable a command category",

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

    await Config.findOneAndUpdate(
      { guildId: interaction.guild.id, channelId, category },
      { guildId: interaction.guild.id, channelId, category },
      { upsert: true }
    );

    const target = channel ? channel : "entire server";

    interaction.reply(`🚫 ${category} commands disabled in ${target}`);

  },

  async runPrefix(client, message, args) {

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply("No permission.");

    const category = args[0];
    const target = args[1];

    if (!category || !target)
      return message.reply("Usage: j disable <category> <#channel | all>");

    const channelId =
      target === "all"
        ? "all"
        : message.mentions.channels.first()?.id;

    if (!channelId)
      return message.reply("Mention a channel or use 'all'.");

    await Config.findOneAndUpdate(
      { guildId: message.guild.id, channelId, category },
      { guildId: message.guild.id, channelId, category },
      { upsert: true }
    );

    message.reply(`🚫 ${category} commands disabled in ${target}`);

  }

};