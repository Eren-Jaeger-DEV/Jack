const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");


module.exports = {
  schema: {
    "name": "get_user_roles",
    "description": "SERVER VISION: Fetch the current server roles of a user by their Discord ID.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "discord_id": {
                "type": "STRING"
            }
        },
        "required": [
            "discord_id"
        ]
    }
},

  /**
   * SERVER VISION: Fetch the current server roles of a user.
   */
  async execute(args, invoker, guild) {
    const { discord_id } = args;
    const rawId = this._sanitizeId(discord_id || invoker.id);
    if (!guild) return { success: false, message: "No guild context available." };
    try {
      const member = await guild.members.fetch(rawId);
      if (!member) return { success: false, message: "User not found in this guild." };
      
      const roles = member.roles.cache
        .filter(r => r.name !== "@everyone")
        .map(r => r.name);
        
      return {
        success: true,
        message: `Roles retrieved for ${member.user.tag}: ${roles.join(", ") || "No roles"}`,
        data: { roles }
      };
    } catch (e) { return { success: false, message: "Failed to fetch user roles." }; }
  }
};
