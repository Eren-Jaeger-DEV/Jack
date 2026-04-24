const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");


module.exports = {
  schema: {
    "name": "untimeout_member",
    "description": "DISCIPLINE: Lift the timeout restriction from a member immediately.",
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
   * DISCIPLINE: Remove a member from timeout.
   */
  async execute(args, invoker, guild) {
    const { discord_id, reason } = args;
    if (!(await this._checkPower(invoker, guild, [PermissionFlagsBits.ModerateMembers]))) {
      return { success: false, message: "Unauthorized. Insufficient permissions to moderate members." };
    }
    try {
      const targetId = this._sanitizeId(discord_id);
      const targetMember = await guild.members.fetch(targetId);
      
      await targetMember.timeout(null, `[JACK AI] ${reason}`);
      return { success: true, message: `Successfully removed timeout for ${targetMember.user.tag}.` };
    } catch (e) {
      return { success: false, message: `Untimeout failed: ${e.message}` };
    }
  }
};
