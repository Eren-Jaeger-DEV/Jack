const slashHandler = require("../handlers/slashCommandHandler");
const modalHandler = require("../handlers/modalHandler");
const buttonHandler = require("../handlers/buttonHandler");

module.exports = {

  name: "interactionCreate",

  async execute(interaction, client) {

    if (interaction.isChatInputCommand()) {
      return slashHandler(interaction, client);
    }

    if (interaction.isModalSubmit()) {
      return modalHandler(interaction, client);
    }

    if (interaction.isButton()) {
      return buttonHandler(interaction, client);
    }

  }

};