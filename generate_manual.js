const fs = require('fs');
const path = require('path');

const cmdDataRaw = fs.readFileSync(path.join(__dirname, 'cmd_dump.json'), 'utf-8');
const commands = JSON.parse(cmdDataRaw);

const totalCommands = commands.length;
const plugins = [...new Set(commands.map(c => c.plugin))].sort();

let md = `# 🧠 JACK COMMAND MANUAL\n\n`;

md += `## 1. OVERVIEW\n`;
md += `- **Total number of commands:** ${totalCommands}\n`;
md += `- **Categories (plugins):** ${plugins.join(', ')}\n\n---\n\n`;

md += `## 2. COMMAND LIST (GROUPED BY PLUGIN)\n\n`;

for (const plugin of plugins) {
  md += `### 🔹 Plugin: ${plugin}\n\n`;
  const pluginCmds = commands.filter(c => c.plugin === plugin).sort((a,b) => a.name.localeCompare(b.name));
  
  for (const cmd of pluginCmds) {
    const isOwner = cmd.permission === 'Bot Owner';
    const isSystem = cmd.category === 'system' || isOwner || cmd.plugin === 'events'; // just a guess, I can adjust
    
    md += `#### Command Name: ${cmd.name}\n`;
    md += `- **Name:** /${cmd.name} ${cmd.aliases && cmd.aliases.length > 0 ? `(Aliases: ${cmd.aliases.join(', ')})` : ''}\n`;
    md += `- **Description:** ${cmd.description || 'No description provided'}\n`;
    md += `- **Usage:** ${cmd.usage}\n`;
    
    if (cmd.options && cmd.options.length > 0) {
      md += `- **Options:**\n`;
      for (const opt of cmd.options) {
        let optTypeStr = 'String';
        if (opt.type === 4) optTypeStr = 'Integer';
        if (opt.type === 5) optTypeStr = 'Boolean';
        if (opt.type === 6) optTypeStr = 'User';
        if (opt.type === 7) optTypeStr = 'Channel';
        if (opt.type === 8) optTypeStr = 'Role';
        if (opt.type === 9) optTypeStr = 'Mentionable';
        if (opt.type === 10) optTypeStr = 'Number';
        if (opt.type === 11) optTypeStr = 'Attachment';
        md += `  - \`${opt.name}\` (${optTypeStr}, ${opt.required ? 'Required' : 'Optional'}) - ${opt.description}\n`;
      }
    } else {
      md += `- **Options:** None\n`;
    }
    
    md += `- **Permission:** ${cmd.permission}\n`;
    
    // Generate an example if none is explicitly provided, based on usage
    let example = cmd.usage.split('|')[0].trim();
    if (!example.includes('/') && cmd.isSlash) example = `/${cmd.name}`;
    
    md += `- **Example:** \`${example}\`\n`;
    
    if (cmd.details || isOwner || cmd.permission !== 'Everyone') {
      md += `- **Notes:** ${cmd.details || 'None'}\n`;
    } else {
      md += `- **Notes:** None\n`;
    }
    
    md += `\n`;
  }
  md += `---\n\n`;
}

// Group 3: Admin Commands
md += `## 3. ADMIN COMMANDS (IMPORTANT)\n\n`;
const adminCmds = commands.filter(c => c.permission.includes('Admin') || c.permission.includes('Moderator'));
if (adminCmds.length > 0) {
  for (const cmd of adminCmds) {
    md += `- **/${cmd.name}** - ${cmd.description} *(Plugin: ${cmd.plugin})*\n`;
  }
} else {
  md += `*No explicit admin commands detected.*\n\n`;
}
md += `\n---\n\n`;

// Group 4: User Commands
md += `## 4. USER COMMANDS\n\n`;
const userCmds = commands.filter(c => c.permission === 'Everyone' && c.category !== 'system' && c.plugin !== 'admin' && c.permission !== 'Bot Owner');
for (const cmd of userCmds) {
  md += `- **/${cmd.name}** - ${cmd.description} *(Plugin: ${cmd.plugin})*\n`;
}
md += `\n---\n\n`;

// Group 5: System Commands
md += `## 5. SYSTEM COMMANDS\n\n`;
const systemCmds = commands.filter(c => c.category === 'system' || c.plugin === 'admin' || c.permission === 'Bot Owner');
if (systemCmds.length > 0) {
  for (const cmd of systemCmds) {
    md += `- **/${cmd.name}** - ${cmd.description} *(Requires: ${cmd.permission})*\n`;
  }
} else {
  md += `*No explicit system commands detected.*\n`;
}
md += `\n---\n`;

const outPath = path.join('/home/victor/.gemini/antigravity/brain/0d180d53-f31f-497e-b11f-2f7bc47b0c3f', 'Jack_Command_Manual.md');
fs.writeFileSync(outPath, md);
console.log(`Generated manual at ${outPath}`);
