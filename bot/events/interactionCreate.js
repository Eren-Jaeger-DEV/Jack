const Context = require("../structures/Context");

module.exports = {

  name: "interactionCreate",

  async execute(interaction, client) {

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    const ctx = new Context(client, interaction);

    try {

      if (command.run) {
        await command.run(ctx);
      }

    } catch (err) {

      console.error(`Command error (${interaction.commandName})`, err);

      if (!interaction.replied) {
        await interaction.reply({
          content: "⚠️ Something went wrong executing this command.",
          ephemeral: true
        });
      }

    }

  }

};