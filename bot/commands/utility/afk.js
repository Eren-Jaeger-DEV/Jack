const Afk = require("../../database/models/Afk");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {

  name: "afk",
  description: "Set yourself as AFK",

  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Set yourself as AFK")
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason")
        .setRequired(false)
    ),

  /* ---------- SLASH COMMAND ---------- */

  async execute(interaction) {

    const reason = interaction.options.getString("reason") || "AFK";

    const member = await interaction.guild.members.fetch(interaction.user.id);

    await Afk.findOneAndUpdate(
      { userId: interaction.user.id },
      { reason, since: new Date() },
      { upsert: true }
    );

    if (!member.nickname || !member.nickname.startsWith("[AFK]")) {

      const newNick = `[AFK] ${member.displayName.replace("[AFK] ","")}`;
      

      await member.setNickname(newNick).catch(() => {});

    }

    interaction.reply(`You are now AFK: **${reason}**`);

  },

  /* ---------- PREFIX COMMAND ---------- */

  async runPrefix(client, message, args) {

    const reason = args.join(" ") || "AFK";

    const member = await message.guild.members.fetch(message.author.id);

    await Afk.findOneAndUpdate(
      { userId: message.author.id },
      { reason, since: new Date() },
      { upsert: true }
    );

    if (!member.nickname || !member.nickname.startsWith("[AFK]")) {

      const newNick = `[AFK] ${member.displayName}`;

      await member.setNickname(newNick).catch(() => {});

    }

    message.reply(`You are now AFK: **${reason}**`);

  }

};