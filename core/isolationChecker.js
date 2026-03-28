/**
 * JACK ISOLATION CHECKER (v2.1.0)
 * Scans plugin files to detect and prevent illegal cross-plugin imports.
 */

const fs = require('fs');
const path = require('path');
const logger = require('../bot/utils/logger');

/**
 * Scans a plugin's directory for illegal cross-plugin require() calls.
 */
function checkIsolation(pluginId, pluginPath) {
    const files = getAllFiles(pluginPath);
    const violations = [];

    for (const file of files) {
        if (!file.endsWith('.js')) continue;

        const content = fs.readFileSync(file, 'utf8');
        
        // Regex to detect cross-plugin imports:
        // Specifically looks for imports reaching into the 'plugins' directory
        const crossPluginRegex = /require\(['"](?:\.\.\/)+plugins\/([^'"]+)['"]\)/g;
        
        let match;
        while ((match = crossPluginRegex.exec(content)) !== null) {
            const importString = match[0];
            const importedPath = match[1];

            // 1. Path Resolution Check
            try {
                const absoluteImportPath = require.resolve(path.join(path.dirname(file), importedPath));
                const pluginsDir = path.join(__dirname, '../plugins');
                
                // If the resolved path is inside the plugins directory but outside ITS OWN plugin folder
                if (absoluteImportPath.startsWith(pluginsDir)) {
                    const relativeToPlugins = path.relative(pluginsDir, absoluteImportPath);
                    const targetPluginId = relativeToPlugins.split(path.sep)[0];

                    if (targetPluginId && targetPluginId !== pluginId) {
                        violations.push({ file: path.relative(pluginPath, file), imported: importedPath, resolved: absoluteImportPath });
                    }
                }
            } catch (err) {
                // If it can't be resolved, it's either an invalid import or a dynamic require
                // We'll still check the raw string for obvious violations
                const targetPluginId = importedPath.split('/')[0];
                if (targetPluginId && targetPluginId !== pluginId) {
                    violations.push({ file: path.relative(pluginPath, file), imported: importedPath });
                }
            }
        }
    }

    if (violations.length > 0) {
        const violationDetails = violations.map(v => `${v.file} -> ${v.imported}`).join(', ');
        const errorMsg = `[Isolation] Plugin '${pluginId}' violated isolation rules: ${violationDetails}`;
        logger.error("Isolation", errorMsg);
        throw new Error(errorMsg);
    }

    return true;
}

/**
 * Recursive helper to get all files in a directory.
 */
function getAllFiles(dir, allFiles = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const name = path.join(dir, file);
        if (fs.statSync(name).isDirectory()) {
            getAllFiles(name, allFiles);
        } else {
            allFiles.push(name);
        }
    }
    return allFiles;
}

module.exports = {
    checkIsolation
};
