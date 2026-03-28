const GuildConfig = require("../database/models/GuildConfig");

const configCache = new Map();
let botClient = null;

/**
 * Initialize the configuration cache by fetching all guild configs from MongoDB.
 */
async function init(client) {
  botClient = client;
  console.log("[ConfigManager] Initializing configuration cache...");
  try {
    const configs = await GuildConfig.find({});
    configs.forEach(config => {
      configCache.set(config.guildId, config.toObject());
    });
    console.log(`[ConfigManager] Loaded ${configs.length} guild configurations.`);
  } catch (err) {
    console.error("[ConfigManager] Failed to initialize cache:", err);
  }
}

/**
 * Fetch a guild's configuration. Uses cache first, then MongoDB if not found.
 * @param {string} guildId 
 */
async function getGuildConfig(guildId) {
  if (configCache.has(guildId)) {
    return configCache.get(guildId);
  }

  try {
    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
      // Create default config if it doesn't exist
      config = await GuildConfig.create({ guildId });
    }
    
    const configObj = config.toObject();
    configCache.set(guildId, configObj);
    return configObj;
  } catch (err) {
    console.error(`[ConfigManager] Error fetching config for guild ${guildId}:`, err);
    return null;
  }
}

/**
 * Update a guild's configuration in both MongoDB and the in-memory cache.
 * @param {string} guildId 
 * @param {object} updates 
 */
async function updateGuildConfig(guildId, updates) {
  try {
    const config = await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: updates },
      { new: true, upsert: true }
    );
    
    const configObj = config.toObject();
    const oldConfig = configCache.get(guildId);
    configCache.set(guildId, configObj);

    // Trigger dynamic plugin toggles if botClient is ready
    if (botClient && updates.plugins) {
      for (const [plugin, enabled] of Object.entries(updates.plugins)) {
        if (typeof botClient.togglePlugin === 'function') {
          botClient.togglePlugin(plugin, enabled);
        }
      }
    }
    
    // Also handle dot notation updates like plugins.clan
    if (botClient) {
      for (const key of Object.keys(updates)) {
        if (key.startsWith('plugins.')) {
          const pluginName = key.split('.')[1];
          const enabled = updates[key];
          if (typeof botClient.togglePlugin === 'function') {
            botClient.togglePlugin(pluginName, enabled);
          }
        }
      }
    }

    return configObj;
  } catch (err) {
    console.error(`[ConfigManager] Error updating config for guild ${guildId}:`, err);
    throw err;
  }
}

module.exports = {
  init,
  getGuildConfig,
  updateGuildConfig,
  configCache
};
