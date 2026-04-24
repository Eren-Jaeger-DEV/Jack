const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");


module.exports = {
  schema: {
    "name": "ban_member",
    "description": "ROOT AUTHORITY: Ban a member from the server.",
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
   * ROOT AUTHORITY: Ban.
   */
  async execute(args, invoker, guild) {
    const { discord_id, reason } = args;
    if (!(await this._checkPower(invoker, guild, [PermissionFlagsBits.BanMembers]))) return { success: false, message: "Unauthorized. Insufficient permissions for Root Authority (Ban)." };
    const rawId = this._sanitizeId(discord_id);
    try {
      const member = await guild.members.fetch(rawId);
      await member.ban({ reason: `[JACK AI] ${reason}` });
      return { success: true, message: `Banned user ${member.user.tag} for: ${reason}` };
    } catch (e) { return { success: false, message: `Ban failed: ${e.message}` }; }
  }
};
