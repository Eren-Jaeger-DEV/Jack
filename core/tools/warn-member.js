const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");

const MemberDiary = require("../../bot/database/models/MemberDiary");

module.exports = {
  schema: {
    "name": "warn_member",
    "description": "DISCIPLINE: Issue an official warning to a member and log it in the database.",
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
   * DISCIPLINE: Warn a member.
   */
  async execute(args, invoker, guild) {
    const { discord_id, reason } = args;
    if (!(await this._checkPower(invoker, guild, [PermissionFlagsBits.ModerateMembers]))) {
      return { success: false, message: "Unauthorized. Insufficient permissions to moderate members." };
    }
    const rawId = this._sanitizeId(discord_id);
    try {
      let diary = await MemberDiary.findOne({ discordId: rawId });
      if (!diary) diary = new MemberDiary({ discordId: rawId });
      diary.notes += `
[${new Date().toLocaleDateString()}] [WARNING] ${reason}`;
      diary.reputationScore -= 10;
      await diary.save();

      try {
        const member = await guild.members.fetch(rawId);
        await member.send(`⚠️ **Official Warning from Clan Management:**
Reason: ${reason}`);
      } catch (err) {} // Ignore if DMs are closed
      
      return { success: true, message: `Warning issued and logged for user ID ${rawId}.` };
    } catch (e) {
      return { success: false, message: `Warning failed: ${e.message}` };
    }
  }
};
