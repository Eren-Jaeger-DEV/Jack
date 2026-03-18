/**
 * fix_apostrophes.js
 * Replaces single-quoted details/usage/aliases strings that contain
 * unescaped apostrophes with double-quoted or escaped equivalents.
 */
const fs = require('fs');
const path = require('path');

const pluginsPath = path.join(__dirname, '../plugins');
let fixed = 0;

function fixFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  // Replace any single-quoted string on lines starting with details: or usage:
  // that contains an unescaped apostrophe inside the value
  const lineRegex = /^(  (?:details|usage):\s*)'((?:[^'\\]|\\.)*)'(,?)$/gm;
  const newSrc = src.replace(lineRegex, (match, prefix, content, comma) => {
    // If content contains an apostrophe that would break the string
    if (content.includes("'")) {
      changed = true;
      // Replace the wrapping single quotes with double quotes
      // and escape any double quotes inside the content
      const safe = content.replace(/"/g, '\\"');
      return `${prefix}"${safe}"${comma}`;
    }
    return match;
  });

  if (changed) {
    fs.writeFileSync(filePath, newSrc, 'utf-8');
    console.log(`✅ Fixed: ${path.relative(path.join(__dirname, '..'), filePath)}`);
    fixed++;
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f.endsWith('.js')) fixFile(full);
  }
}

for (const p of fs.readdirSync(pluginsPath)) {
  walk(path.join(pluginsPath, p, 'commands'));
}

console.log(`\n✅ Done. Fixed ${fixed} files.`);
