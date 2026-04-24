const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");


module.exports = {
  schema: {
    "name": "kick_member",
    "description": "ROOT AUTHORITY: Remove a member from the server.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "discord_id": {
                "type": "STRING"
            },
            "reason": {
                "type": "STRING"
            }
        },
        "required": [
            "discord_id",
            "reason"
        ]
    }
},

  /**
   * ROOT AUTHORITY: Kick.
   */
  async execute(args, invoker, guild) {
    const { discord_id, reason } = args;
    if (!(await this._checkPower(invoker, guild, [PermissionFlagsBits.KickMembers]))) return { success: false, message: "Unauthorized. Insufficient permissions for Root Authority (Kick)." };
    const rawId = this._sanitizeId(discord_id);
    try {
      const member = await guild.members.fetch(rawId);
      await member.kick(`[JACK AI] ${reason}`);
      return { success: true, message: `Kicked user ${member.user.tag} for: ${reason}` };
    } catch (e) { return { success: false, message: `Kick failed: ${e.message}` }; }
  }
};
