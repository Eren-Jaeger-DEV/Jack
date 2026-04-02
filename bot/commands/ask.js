const { SlashCommandBuilder } = require('discord.js');
const aiController = require('../../core/aiController');

module.exports = {
  name: "ask",
  description: "Consult with Jack AI (Strategist)",
  
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Consult with Jack AI (Strategist)")
    .addStringOption(option => 
      option.setName("prompt")
        .setDescription("What do you want to ask Jack?")
        .setRequired(true)
    ),

  async execute(interaction, client) {
    // 1. Channel Lock Check (Strict Activation Policy)
    // The core AI system is currently hard-coded to channel 1488453630184132729
    const AI_CHANNEL_ID = "1488453630184132729";
    
    if (interaction.channelId !== AI_CHANNEL_ID) {
      return interaction.reply({
        content: `❌ Jack AI only accepts consultations in <#${AI_CHANNEL_ID}>.`,
        ephemeral: true
      });
    }

    // 2. Delegate to Unified AI Controller
    // This ensures all security, rate-limiting, and validation rules are applied.
    await aiController.process(interaction, client);
  }
};
