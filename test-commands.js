const fs = require('fs');
const path = require('path');

const commandsPath = path.join(__dirname, 'bot', 'commands');
const commandFolders = fs.readdirSync(commandsPath);

let total = 0;
let passed = 0;
let failed = 0;

console.log("Starting command validation...\n");

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;

  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    total++;
    const filePath = path.join(folderPath, file);
    try {
      const command = require(filePath);
      
      const errors = [];
      if (!command.name) errors.push("Missing 'name'");
      if (!command.category) errors.push("Missing 'category'");
      if (!command.description) errors.push("Missing 'description'");
      if (!command.data) errors.push("Missing 'data'");
      if (typeof command.run !== 'function') errors.push("'run' is not a function");

      if (errors.length > 0) {
        console.error(`❌ [${folder}/${file}] Failed structure validation: ${errors.join(', ')}`);
        failed++;
      } else {
        console.log(`✅ [${folder}/${file}] Loaded successfully.`);
        passed++;
      }
    } catch (error) {
      console.error(`💥 [${folder}/${file}] Failed to load (Syntax/Require Error):\n${error.message}`);
      failed++;
    }
  }
}

console.log(`\n--- Summary ---`);
console.log(`Total: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
