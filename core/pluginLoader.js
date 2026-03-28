/**
 * JACK PLUGIN LOADER (v2.1.0)
 * Orchestrates plugin discovery, validation, isolation, dependency resolution, and lifecycle.
 */

const fs = require('fs');
const path = require('path');
const logger = require('../bot/utils/logger');
const validator = require('./validator');
const isolation = require('./isolationChecker');
const dependency = require('./dependencyResolver');
const commandLoader = require('./commandLoader');
const eventLoader = require('./eventLoader');
const configManager = require('../bot/utils/configManager');
const { getAnomalies } = require('./metricsManager');

const activePlugins = new Map(); // folder -> { manifest, commands: [], events: [] }
const FAILURE_THRESHOLD = 0.3; // 30% error rate triggers auto-disable
const MIN_SAMPLES = 10;


/**
 * Public Toggle Function for Dashboard/Integration
 */
async function togglePlugin(client, folder, enabled, guildId) {
    if (enabled) {
        await enablePlugin(client, folder, guildId);
    } else {
        await disablePlugin(client, folder, guildId);
    }
}

/**
 * Master Initialization
 */
module.exports = async (client) => {
    client.togglePlugin = (folder, enabled, guildId) => togglePlugin(client, folder, enabled, guildId);

    const pluginsPath = path.join(__dirname, '../plugins');
    if (!fs.existsSync(pluginsPath)) return;

    // 1. Discovery & Basic Validation
    const folders = fs.readdirSync(pluginsPath).filter(f => fs.statSync(path.join(pluginsPath, f)).isDirectory());
    const manifests = [];

    for (const folder of folders) {
        const manifestPath = path.join(pluginsPath, folder, 'plugin.json');
        if (!fs.existsSync(manifestPath)) continue;

        try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            if (validator.validatePlugin(manifest, folder)) {
                manifests.push(manifest);
            }
        } catch (err) {
            logger.error("PluginLoader", `Failed to parse manifest for ${folder}`);
        }
    }

    // 2. Dependency Resolution
    let loadOrder = [];
    try {
        loadOrder = dependency.resolveLoadOrder(manifests);
    } catch (err) {
        logger.critical("PluginLoader", `Dependency resolution failed: ${err.message}`);
        if (process.env.STRICT_MODE === 'true') process.exit(1);
        return;
    }

    // 3. Sequential Loading
    const GUILD_ID = process.env.GUILD_ID;
    const config = await configManager.getGuildConfig(GUILD_ID);
    const enabledPlugins = config?.plugins || {};

    for (const pluginId of loadOrder) {
        if (enabledPlugins[pluginId] === true || manifests.find(m => m.id === pluginId)?.enabledByDefault) {
            await loadPlugin(client, pluginId);
        }
    }

    logger.info("PluginLoader", `${activePlugins.size} plugins active and synchronized.`);

    // 4. Fail-Safe Health Monitor
    setInterval(() => monitorHealth(client), 300000); // Check every 5 minutes
};

/**
 * Monitors metrics for anomalies and auto-disables failing plugins.
 */
async function monitorHealth(client) {
    const anomalies = getAnomalies(FAILURE_THRESHOLD);
    for (const anomaly of anomalies) {
        // Find which plugin this command belongs to
        for (const [folder, data] of activePlugins.entries()) {
            if (data.commands.includes(anomaly.name)) {
                logger.critical("PluginLoader", `AUTO-DISABLE: Plugin '${folder}' exceeded failure threshold (${(anomaly.errorRate * 100).toFixed(1)}%).`);
                await togglePlugin(client, folder, false, process.env.GUILD_ID);
                break;
            }
        }
    }
}

async function loadPlugin(client, folder) {
    if (activePlugins.has(folder)) return;

    const pluginPath = path.join(__dirname, '../plugins', folder);
    const manifest = JSON.parse(fs.readFileSync(path.join(pluginPath, 'plugin.json'), 'utf8'));

    // 1. Isolation Check
    try {
        isolation.checkIsolation(folder, pluginPath);
    } catch (err) {
        logger.error("PluginLoader", `Isolation violation in ${folder}. Load aborted.`);
        return;
    }

    // 2. Command & Event Loading
    const commands = commandLoader(client, pluginPath);
    const events = eventLoader(client, pluginPath);

    // 3. Optional index.js Lifecycle Hook
    const indexPath = path.join(pluginPath, manifest.main || 'index.js');
    if (fs.existsSync(indexPath)) {
        try {
            const plugin = require(indexPath);
            if (typeof plugin.load === 'function') {
                await plugin.load(client);
            }
        } catch (err) {
            logger.error("PluginLoader", `Error in load() hook for ${folder}: ${err.message}`);
        }
    }

    activePlugins.set(folder, { manifest, commands, events });
    logger.info("PluginLoader", `Plugin Loaded: ${folder}`);
}

/**
 * Lifecycle: UNLOAD
 */
async function unloadPlugin(client, folder) {
    const data = activePlugins.get(folder);
    if (!data) return;

    const pluginPath = path.join(__dirname, '../plugins', folder);

    // 1. Remove Commands
    data.commands.forEach(name => client.commands.delete(name));

    // 2. Remove Events
    data.events.forEach(({ eventName, handler }) => client.removeListener(eventName, handler));

    // 3. Optional unload() Hook
    const indexPath = path.join(pluginPath, data.manifest.main || 'index.js');
    if (fs.existsSync(indexPath)) {
        try {
            const plugin = require(indexPath);
            if (typeof plugin.unload === 'function') {
                await plugin.unload(client);
            }
            delete require.cache[require.resolve(indexPath)];
        } catch (err) {}
    }

    activePlugins.delete(folder);
    logger.info("PluginLoader", `Plugin Unloaded: ${folder}`);
}

/**
 * Lifecycle: ENABLE (Guild Specific)
 */
async function enablePlugin(client, folder, guildId) {
    await loadPlugin(client, folder);
    
    // Guild-specific setup hook
    const pluginPath = path.join(__dirname, '../plugins', folder);
    const manifestPath = path.join(pluginPath, 'plugin.json');
    if (!fs.existsSync(manifestPath)) return;
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const indexPath = path.join(pluginPath, manifest.main || 'index.js');
    
    if (fs.existsSync(indexPath)) {
        try {
            const plugin = require(indexPath);
            if (typeof plugin.enable === 'function') {
                const guild = client.guilds.cache.get(guildId);
                if (guild) await plugin.enable(guild);
            }
        } catch (err) {}
    }
}

/**
 * Lifecycle: DISABLE (Guild Specific)
 */
async function disablePlugin(client, folder, guildId) {
    // Only unload if it's not needed globally anymore (optional optimization)
    // For now, we follow the blueprint: disable triggers cleanup
    const data = activePlugins.get(folder);
    if (!data) return;

    const pluginPath = path.join(__dirname, '../plugins', folder);
    const indexPath = path.join(pluginPath, data.manifest.main || 'index.js');
    
    if (fs.existsSync(indexPath)) {
        try {
            const plugin = require(indexPath);
            if (typeof plugin.disable === 'function') {
                const guild = client.guilds.cache.get(guildId);
                if (guild) await plugin.disable(guild);
            }
        } catch (err) {}
    }
    
    // If this was the last guild using it, we could unload globally.
    // However, the current project structure assumes a primary guild.
}
