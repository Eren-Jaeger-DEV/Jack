const fs = require("fs");
const path = require("path");
const { addLog } = require("../../utils/logger");

module.exports = (client) => {
  const commandsPath = path.join(__dirname, "..", "commands");
  if (!fs.existsSync(commandsPath)) return;

  const files = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith(".js"));

  let commandCount = 0;

  for (const file of files) {
    try {
      const command = require(`${commandsPath}/${file}`);
      if (command.name) {
        client.commands.set(command.name, command);
        commandCount++;
      }
    } catch (err) {
      const logger = require("../../utils/logger");
      logger.error("CommandHandler", `Core Command error (${file}): ${err.message}`);
    }
  }

  addLog("Commands", `${commandCount} core commands loaded`);
};