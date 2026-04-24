const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");


module.exports = {
  schema: {
    "name": "timeout_member",
    "description": "DISCIPLINE: Place a member in timeout for a specified duration.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "discord_id": {
                "type": "STRING"
            },
            "minutes": {
                "type": "INTEGER"
            },
            "reason": {
                "type": "STRING"
            }
        },
        "required": [
            "discord_id",
            "minutes",
            "reason"
        ]
    }
},

  /**
   * DISCIPLINE: Timeout a member.
   */
  async execute(args, invoker, guild) {
    const { discord_id, minutes, reason } = args;
    if (!(await this._checkPower(invoker, guild, [PermissionFlagsBits.ModerateMembers]))) {
      return { success: false, message: "Unauthorized. Insufficient permissions to moderate members." };
    }
    try {
      const targetId = this._sanitizeId(discord_id);
      const targetMember = await guild.members.fetch(targetId);
      const botMember = await guild.members.fetch(guild.client.user.id);

      // DIAGNOSTIC LOGGING
      // MANUAL MODERATEABLE CHECK (since targetMember.moderateable can be undefined in some envs)
      const isModerateable = targetMember.moderateable ?? (
        botMember.roles.highest.position > targetMember.roles.highest.position && 
        !targetMember.permissions.has(PermissionFlagsBits.Administrator) &&
        targetId !== guild.ownerId
      );

      console.log(`[TIMEOUT_DEBUG] Final Is Moderateable: ${isModerateable}`);

      if (!isModerateable) {
        return { success: false, message: `Timeout failed: Discord says this member is not moderateable by me. This usually means their role is higher than mine, or they have Administrator powers.` };
      }

      // If minutes is 0 or less, we treat it as an untimeout
      const duration = (minutes > 0) ? minutes * 60 * 1000 : null;
      await targetMember.timeout(duration, `[JACK AI] ${reason}`);
      
      if (duration === null) {
        return { success: true, message: `Successfully removed timeout for ${targetMember.user.tag}.` };
      }
      return { success: true, message: `Successfully placed ${targetMember.user.tag} in timeout for ${minutes} minutes.` };
    } catch (e) {
      return { success: false, message: `Timeout failed: ${e.message}` };
    }
  }
};
