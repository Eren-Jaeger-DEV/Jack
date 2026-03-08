module.exports = async function slashCommandHandler(interaction, client) {

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {

    if (typeof command.execute === "function") {
      await command.execute(interaction, client);
    }

  } catch (err) {

    console.error("Slash Command Error:", err);

    if (interaction.replied || interaction.deferred) {

      await interaction.followUp({
        content: "⚠️ Command error.",
        ephemeral: true
      });

    } else {

      await interaction.reply({
        content: "⚠️ Command error.",
        ephemeral: true
      });

    }

  }

};