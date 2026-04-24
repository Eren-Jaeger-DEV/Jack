const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");


module.exports = {
  schema: {
    "name": "get_server_stats",
    "description": "SERVER VISION: Provides live Discord server stats (Member count, humans, bots)."
},

  /**
   * SERVER VISION: Live Discord stats.
   */
  async execute(args, invoker, guild) {
    if (!guild) return { success: false, message: "No guild context available." };
    try {
      const humans = guild.members.cache.filter(m => !m.user.bot).size;
      const bots = guild.members.cache.filter(m => m.user.bot).size;
      return {
        success: true,
        message: `Server stats for ${guild.name} compiled.`,
        data: {
          serverName: guild.name,
          totalMembers: guild.memberCount,
          humans,
          bots,
          online: guild.members.cache.filter(m => m.presence?.status !== 'offline').size
        }
      };
    } catch (e) { return { success: false, message: "Failed to compile server statistics." }; }
  }
};
