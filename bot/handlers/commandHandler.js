const fs = require("fs");
const path = require("path");
const logger = require('../../utils/logger');

module.exports = (client) => {
  const commandsPath = path.join(__dirname, "..", "commands");
  if (!fs.existsSync(commandsPath)) return;

  const files = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith(".js"));

  for (const file of files) {
    try {
      const command = require(`${commandsPath}/${file}`);
      if (command.name) {
        client.commands.set(command.name, command);
        logger.startupStats.commands.loaded++;
      }
    } catch (err) {
      logger.error("CommandHandler", `Core Command error (${file}): ${err.message}`);
      logger.startupStats.commands.failed++;
    }
  }
};