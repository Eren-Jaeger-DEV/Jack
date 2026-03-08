const fs = require("fs");

module.exports = (client) => {

  const folders = fs.readdirSync("./bot/commands");

  for (const folder of folders) {

    const files = fs
      .readdirSync(`./bot/commands/${folder}`)
      .filter(f => f.endsWith(".js"));

    for (const file of files) {

      const command = require(`../commands/${folder}/${file}`);

      if (command.data) {
        client.commands.set(command.data.name, command);
      }

      if (command.name) {
        client.commands.set(command.name, command);
      }

    }

  }

  console.log("✅ Commands Loaded");

};