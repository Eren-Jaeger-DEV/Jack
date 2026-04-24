const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");


module.exports = {
  schema: {
    "name": "remove_role",
    "description": "PROMOTION: Remove a Discord role from a member by the role's name.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "discord_id": {
                "type": "STRING"
            },
            "role_name": {
                "type": "STRING"
            }
        },
        "required": [
            "discord_id",
            "role_name"
        ]
    }
},

  /**
   * PROMOTION: Remove a role by name.
   */
  async execute(args, invoker, guild) {
    const { discord_id, role_name } = args;
    if (!(await this._checkPower(invoker, guild, [PermissionFlagsBits.ManageRoles]))) {
      return { success: false, message: "Unauthorized. Insufficient permissions to manage roles." };
    }
    try {
      const role = guild.roles.cache.find(r => r.name.toLowerCase() === role_name.toLowerCase());
      if (!role) return { success: false, message: `Role '${role_name}' not found in the server.` };
      
      const member = await guild.members.fetch(this._sanitizeId(discord_id));
      await member.roles.remove(role);
      return { success: true, message: `Successfully removed role '${role.name}' from ${member.user.tag}.` };
    } catch (e) {
      return { success: false, message: `Role removal failed: ${e.message}` };
    }
  }
};
