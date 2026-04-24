const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");


module.exports = {
  schema: {
    "name": "get_server_map",
    "description": "SERVER VISION: Provides a full map of the server's channels, roles, and current structure."
},

  /**
   * SERVER VISION: Channel/Role map.
   */
  async execute(args, invoker, guild) {
    if (!guild) return { success: false, message: "No guild context available." };
    try {
      const channels = guild.channels.cache.map(c => ({ name: c.name, type: c.type })).slice(0, 20);
      const roles = guild.roles.cache.map(r => r.name).slice(0, 15);
      return { 
        success: true,
        message: `Visual map of ${guild.name} exported.`,
        data: { channels, roles, totalChannels: guild.channels.cache.size }
      };
    } catch (e) { return { success: false, message: "Failed to generate server map." }; }
  }
};
