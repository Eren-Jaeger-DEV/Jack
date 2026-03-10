const fs = require("fs");
const path = require("path");

module.exports = (client) => {

  client.commands = new Map();

  const commandPath = path.join(__dirname, "..", "commands");

  const folders = fs.readdirSync(commandPath);

  for (const folder of folders) {

    const files = fs
      .readdirSync(`${commandPath}/${folder}`)
      .filter(file => file.endsWith(".js"));

    for (const file of files) {

      const command = require(`${commandPath}/${folder}/${file}`);

      if (!command.name) {
        console.log(`⚠ Command missing name: ${file}`);
        continue;
      }

      client.commands.set(command.name, command);

      console.log(`Loaded command: ${command.name}`);

    }

  }

};