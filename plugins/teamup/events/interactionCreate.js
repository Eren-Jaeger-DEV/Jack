const teamService = require("../services/teamService");
const Team = require("../models/Team");

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    if (!interaction.isButton()) return;

    if (interaction.customId === "teamup_join") {
      try {
        // Find team associated with this message
        const team = await Team.findOne({ messageId: interaction.message.id });
        if (!team) {
          return interaction.reply({ content: "❌ This team no longer exists.", ephemeral: true });
        }

        const result = await teamService.joinTeam(client, interaction.guild, interaction.user.id, team._id);

        if (result.success) {
          await interaction.reply({ content: "✅ You have joined the team!", ephemeral: true });
        } else {
          await interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
        }
      } catch (err) {
        console.error("[TeamUp] Join button error:", err);
        await interaction.reply({ content: "⚠️ An error occurred while joining the team.", ephemeral: true });
      }
    }
  }
};
