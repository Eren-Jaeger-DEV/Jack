const Context = require("../structures/Context");

module.exports = async (client, interaction) => {

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  const ctx = new Context(client, interaction);

  try {

    // JACK 3.0 FORMAT
    if (command.run) {
      return command.run(ctx);
    }

    // JACK 2.0 FORMAT
    if (command.execute) {
      return command.execute(client, interaction);
    }

  } catch (error) {

    console.error("Slash command error:", error);

    if (!interaction.replied) {
      interaction.reply({
        content: "An error occurred while executing this command.",
        ephemeral: true
      });
    }

  }

};