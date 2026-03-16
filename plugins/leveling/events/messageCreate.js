const levelHandler = require("../levelHandler");

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    await levelHandler(message);
  }
};
