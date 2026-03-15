const afkHandler = require("../handlers/afkHandler");
const screenshotHandler = require("../handlers/screenshotHandler");
const levelHandler = require("../modules/leveling/levelHandler");
const prefixHandler = require("../handlers/prefixHandler");

module.exports = {
  name: "messageCreate",

  async execute(message, client) {

    if (!message) return;
    if (message.author?.bot) return;
    if (!message.guild) return;

    try {

      await afkHandler(message);
      await screenshotHandler(message);
      await levelHandler(message);

      await prefixHandler(message, client);

    } catch (err) {
      console.error("messageCreate error:", err);
    }

  }
};