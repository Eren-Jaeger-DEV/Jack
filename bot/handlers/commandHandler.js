const fs = require("fs");
const path = require("path");

module.exports = (client) => {

  const commandsPath = path.join(__dirname, "..", "commands");

  const folders = fs.readdirSync(commandsPath);

  // Load normal bot/commands/
  for (const folder of folders) {
    const files = fs
      .readdirSync(`${commandsPath}/${folder}`)
      .filter(file => file.endsWith(".js"));

    for (const file of files) {
      const command = require(`${commandsPath}/${folder}/${file}`);
      if (!command.name) {
        console.log(`⚠ Command missing name: ${file}`);
        continue;
      }
      client.commands.set(command.name, command);
      console.log(`Loaded command: ${command.name}`);
    }
  }

  // Load Leveling Module Commands
  const levelingCommandPath = path.join(__dirname, "..", "modules", "leveling", "commands");
  if (fs.existsSync(levelingCommandPath)) {
    const levelingFiles = fs.readdirSync(levelingCommandPath).filter(f => f.endsWith(".js"));
    levelingFiles.forEach(file => {
      const command = require(`${levelingCommandPath}/${file}`);
      if (command.name) {
        client.commands.set(command.name, command);
        console.log(`Loaded module command: ${command.name}`);
      }
    });
    
    // Admin Subfolder
    const adminPath = path.join(levelingCommandPath, "admin");
    if (fs.existsSync(adminPath)) {
      const adminFiles = fs.readdirSync(adminPath).filter(f => f.endsWith(".js"));
      adminFiles.forEach(file => {
        const command = require(`${adminPath}/${file}`);
        if (command.name) {
          client.commands.set(command.name, command);
          console.log(`Loaded module admin command: ${command.name}`);
        }
      });
    }
  }

};