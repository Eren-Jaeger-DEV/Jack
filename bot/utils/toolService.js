const fs = require("fs");
const path = require("path");
const logger = require("./logger");
const { PermissionFlagsBits } = require("discord.js");

const toolsPath = path.join(__dirname, "../../core/tools");

const toolService = {
  _schemas: [],

  getToolsSchema() {
    return this._schemas;
  },

  // Helper Methods required by tools
  async _checkPower(member, guild, requiredPerms = [PermissionFlagsBits.ManageGuild]) {
    if (!member || !guild) return false;
    if (member.id === guild.ownerId) return true;
    return requiredPerms.some(perm => member.permissions.has(perm)) || member.permissions.has(PermissionFlagsBits.Administrator);
  },

  _sanitizeId(id) {
    return typeof id === 'string' ? id.replace(/\D/g, "") : id;
  }
};

// Dynamically load all tools
if (fs.existsSync(toolsPath)) {
  const files = fs.readdirSync(toolsPath).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      const fullPath = path.join(toolsPath, file);
      // Clear cache for hot-reloading capability
      delete require.cache[require.resolve(fullPath)];
      const toolModule = require(fullPath);
      
      if (toolModule.schema && toolModule.execute) {
        toolService._schemas.push(toolModule.schema);
        // Bind 'this' context to toolService so tools can access _checkPower and _sanitizeId
        toolService[toolModule.schema.name] = toolModule.execute.bind(toolService);
      } else {
        logger.error("ToolService", `Tool module ${file} is missing schema or execute method.`);
      }
    } catch (err) {
      logger.error("ToolService", `Failed to load tool ${file}: ${err.message}`);
    }
  }
}

module.exports = toolService;
