const afkHandler = require("../handlers/afkHandler");
const screenshotHandler = require("../handlers/screenshotHandler");
const levelHandler = require("../handlers/levelHandler");
const prefixHandler = require("../handlers/prefixHandler");

module.exports = {
  name: "messageCreate",

  async execute(message, client) {

    if (message.author.bot) return;
    if (!message.guild) return;

    await afkHandler(message);
    await screenshotHandler(message);
    await levelHandler(message);
    await prefixHandler(message, client);

  }
};