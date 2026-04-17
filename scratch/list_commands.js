
const fs = require('fs');
const path = require('path');

const commands = [];

function getAllJSFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllJSFiles(fullPath));
        } else if (file.endsWith('.js')) {
            results.push(fullPath);
        }
    });
    return results;
}

const coreCommandsPath = path.join(process.cwd(), 'bot/commands');
const coreFiles = getAllJSFiles(coreCommandsPath);

const pluginsPath = path.join(process.cwd(), 'plugins');
let pluginFiles = [];
if (fs.existsSync(pluginsPath)) {
    const folders = fs.readdirSync(pluginsPath);
    folders.forEach(folder => {
        const cmdPath = path.join(pluginsPath, folder, 'commands');
        if (fs.existsSync(cmdPath)) {
            pluginFiles = pluginFiles.concat(getAllJSFiles(cmdPath));
        }
    });
}

const allFiles = [...coreFiles, ...pluginFiles];

allFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Extract metadata using regex
    const nameMatch = content.match(/name:\s*["']([^"']+)["']/);
    const categoryMatch = content.match(/category:\s*["']([^"']+)["']/);
    const descMatch = content.match(/description:\s*["']([^"']+)["']/);
    
    // Check if it's a slash command (has 'data:' or 'data =')
    const isSlash = content.includes('data:') || content.includes('data =');
    
    // Extract aliases (e.g., aliases: ["a", "b"])
    let aliases = [];
    const aliasMatch = content.match(/aliases:\s*\[([^\]]+)\]/);
    if (aliasMatch) {
        aliases = aliasMatch[1].split(',').map(s => s.trim().replace(/["']/g, ''));
    }

    if (nameMatch) {
        commands.push({
            name: nameMatch[1],
            isSlash: isSlash,
            aliases: aliases,
            category: categoryMatch ? categoryMatch[1] : 'misc',
            description: descMatch ? descMatch[1] : 'No description',
            file: path.relative(process.cwd(), file)
        });
    }
});

console.log(JSON.stringify(commands, null, 2));
