const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");

const MemberDiary = require("../../bot/database/models/MemberDiary");

module.exports = {
  schema: {
    "name": "record_personality_trait",
    "description": "MEMORY: Records a personality trait, interaction note, or reputation change for a clan member.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "discord_id": {
                "type": "STRING"
            },
            "note": {
                "type": "STRING"
            },
            "reputation_change": {
                "type": "INTEGER"
            }
        },
        "required": [
            "discord_id",
            "note"
        ]
    }
},

  /**
   * MEMORY TOOL: Records a personality trait or interaction note.
   */
  async execute(args, invoker, guild) {
    const { discord_id, note, reputation_change = 0 } = args;
    const rawId = this._sanitizeId(discord_id);
    try {
      let diary = await MemberDiary.findOne({ discordId: rawId });
      if (!diary) diary = new MemberDiary({ discordId: rawId });
      
      diary.notes += `\n[${new Date().toLocaleDateString()}] ${note}`;
      diary.reputationScore += reputation_change;
      diary.interactionCount += 1;
      diary.lastInteraction = Date.now();
      
      await diary.save();
      return { success: true, message: `Memory Updated: ${note} (Total Rep: ${diary.reputationScore})` };
    } catch (e) { return { success: false, message: "Failed to record personality trait." }; }
  }
};
