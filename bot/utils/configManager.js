const GuildConfig = require("../database/models/GuildConfig");
const logger = require('../../utils/logger');

const configCache = new Map();
let botClient = null;

/**
 * Initialize the configuration cache by fetching all guild configs from MongoDB.
 */
async function init(client) {
  botClient = client;
  logger.info("ConfigManager", "Initializing configuration cache...");
  try {
    const configs = await GuildConfig.find({});
    configs.forEach(config => {
      configCache.set(config.guildId, config.toObject());
    });
    logger.info("ConfigManager", `Loaded ${configs.length} guild configurations.`);
  } catch (err) {
    logger.error("ConfigManager", `Failed to initialize cache: ${err.message}`);
  }
}

/**
 * Fetch a guild's configuration. Uses cache first, then MongoDB if not found.
 * @param {string} guildId 
 */
async function getGuildConfig(guildId) {
  if (!guildId) {
    logger.error("ConfigManager", "Attempted to fetch config with undefined/null guildId.");
    return null;
  }

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
    logger.error("ConfigManager", `Error fetching config for guild ${guildId}: ${err.message}`);
    return null;
  }
}

/**
 * Helper to flatten a nested object into dot notation.
 * Example: { plugins: { clan: true } } -> { "plugins.clan": true }
 */
function flattenObject(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
}

/**
 * Update a guild's configuration in both MongoDB and the in-memory cache.
 * @param {string} guildId 
 * @param {object} updates 
 */
async function updateGuildConfig(guildId, updates) {
  try {
    // Flatten updates to prevent nested object overwrites
    const flattenedUpdates = flattenObject(updates);

    const config = await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: flattenedUpdates },
      { returnDocument: 'after', upsert: true }
    );
    
    const configObj = config.toObject();
    configCache.set(guildId, configObj);

    // Trigger dynamic plugin toggles if botClient is ready
    if (botClient) {
      // Check for both direct object and dot notation
      for (const [key, value] of Object.entries(flattenedUpdates)) {
        if (key.startsWith('plugins.')) {
          const pluginName = key.split('.')[1];
          if (typeof botClient.togglePlugin === 'function') {
            botClient.togglePlugin(pluginName, value, guildId);
          }
        }
      }
    }

    return configObj;
  } catch (err) {
    logger.error("ConfigManager", `Error updating config for guild ${guildId}: ${err.message}`);
    throw err;
  }
}

module.exports = {
  init,
  getGuildConfig,
  updateGuildConfig,
  configCache
};
