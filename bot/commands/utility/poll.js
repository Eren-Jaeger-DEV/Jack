const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('Poll question')
        .setRequired(true)),

  async execute(interaction) {
    const question = interaction.options.getString('question');

    const msg = await interaction.reply({
      content: `📊 **Poll:** ${question}`,
      fetchReply: true
    });

    await msg.react('👍');
    await msg.react('👎');
  },

  async prefixExecute(message, args) {
    const question = args.join(' ');
    if (!question) return message.channel.send('Ask a question.');

    const msg = await message.channel.send(`📊 **Poll:** ${question}`);

    await msg.react('👍');
    await msg.react('👎');
  }
};