const fs = require('fs');
const path = require('path');

const pluginsDir = path.join(__dirname, '..', 'plugins');
const plugins = fs.readdirSync(pluginsDir).filter(p => fs.statSync(path.join(pluginsDir, p)).isDirectory());

let commandsByCategory = {};

plugins.forEach(plugin => {
    const pluginDir = path.join(pluginsDir, plugin);
    const cmdDir = path.join(pluginDir, 'commands');
    
    if (fs.existsSync(cmdDir)) {
        commandsByCategory[plugin] = [];
        const files = fs.readdirSync(cmdDir).filter(f => f.endsWith('.js'));
        files.forEach(file => {
            const content = fs.readFileSync(path.join(cmdDir, file), 'utf8');
            let nameMatch = content.match(/setName\(['"`](.*?)['"`]\)/);
            let descMatch = content.match(/setDescription\(['"`](.*?)['"`]\)/);
            
            // Try fallback for prefix commands if slash doesn't exist
            if (!nameMatch) nameMatch = content.match(/name:\s*['"`](.*?)['"`]/);
            if (!descMatch) descMatch = content.match(/description:\s*['"`](.*?)['"`]/);
            
            if (nameMatch) {
                commandsByCategory[plugin].push({
                    name: nameMatch[1],
                    description: descMatch ? descMatch[1] : 'No description',
                    type: content.includes('SlashCommandBuilder') ? 'slash' : 'prefix'
                });
            }
        });
    }
});

fs.writeFileSync(path.join(__dirname, 'commands.json'), JSON.stringify(commandsByCategory, null, 2));
console.log('Successfully wrote to scratch/commands.json');
