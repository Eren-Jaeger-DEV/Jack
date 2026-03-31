const fs = require('fs');
const path = require('path');

const pluginPath = '/home/victor/Jack/plugins/ai';
const commandsPath = path.join(pluginPath, 'commands');

console.log('Commands Path:', commandsPath);
console.log('Exists:', fs.existsSync(commandsPath));

if (fs.existsSync(commandsPath)) {
    const files = fs.readdirSync(commandsPath);
    console.log('Files found:', files);
    
    for (const file of files) {
        const fullPath = path.join(commandsPath, file);
        const stats = fs.statSync(fullPath);
        console.log(`- ${file}: isFile=${stats.isFile()}, isDirectory=${stats.isDirectory()}`);
    }
}
