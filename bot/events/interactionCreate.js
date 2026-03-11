const Context = require("../structures/Context");
const buttonHandler = require("../handlers/buttonHandler");
const modalHandler = require("../handlers/modalHandler");

/* Server Overview button embeds */
const overview = require("../systems/panels/serverOverview");

module.exports = {

  name: "interactionCreate",

  async execute(interaction, client) {

    /* ---------- SLASH COMMANDS ---------- */

    if (interaction.isChatInputCommand()) {

      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      const ctx = new Context(client, interaction);

      try {

        if (command.run) {
          await command.run(ctx);
        }

      } catch (err) {

        console.error(`Command error (${interaction.commandName})`, err);

        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "⚠️ Something went wrong executing this command.",
            ephemeral: true
          });
        }

      }

      return;

    }

    /* ---------- BUTTON INTERACTIONS ---------- */

    if (interaction.isButton()) {

      /* Server Overview panel buttons */

      if (interaction.customId.startsWith("overview_")) {

        const guild = interaction.guild;
        let embed;

        switch (interaction.customId) {
          case "overview_roles":    embed = overview.rolesEmbed(guild); break;
          case "overview_channels": embed = overview.channelsEmbed(guild); break;
          case "overview_clan":     embed = overview.clanEmbed(); break;
          case "overview_pop":      embed = overview.popEmbed(); break;
          case "overview_support":  embed = overview.supportEmbed(); break;
        }

        if (embed) {
          return interaction.reply({
            embeds: [embed],
            components: [overview.buildButtons()],
            ephemeral: true
          });
        }

      }

      /* Ticket & other buttons */

      return buttonHandler(interaction);

    }

    /* ---------- MODAL SUBMISSIONS ---------- */

    if (interaction.isModalSubmit()) {

      return modalHandler(interaction);

    }

  }

};