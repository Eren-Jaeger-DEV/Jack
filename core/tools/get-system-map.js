const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");


module.exports = {
  schema: {
    "name": "get_system_map",
    "description": "SELF-AWARENESS: Provides a map of Jack's internal bot plugins and administrative powers."
},

  /**
   * SYSTEM AWARENESS: Bot plugin and health map.
   */
  async execute(args, invoker, guild) {
    try {
      const pluginsPath = path.join(__dirname, "../../plugins");
      const plugins = fs.readdirSync(pluginsPath).filter(f => fs.statSync(path.join(pluginsPath, f)).isDirectory());
      
      const uptime = process.uptime();
      const mem = process.memoryUsage();
      
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);

      return { 
        success: true, 
        message: "System capability and health map generated.",
        data: { 
          active_plugins: plugins, 
          core: "Neural Identity V4 (Modular)",
          health: {
            uptime: `${hours}h ${minutes}m`,
            memory_heap: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
            status: "OPTIMAL"
          },
          capabilities: {
            commands_loaded: guild.client.commands.size,
            plugins_active: plugins.length
          }
        }
      };
    } catch (e) { return { success: false, message: "Failed to map system capabilities." }; }
  }
};
