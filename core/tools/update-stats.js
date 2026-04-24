const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");

const Player = require("../../bot/database/models/Player");

module.exports = {
  schema: {
    "name": "update_stats",
    "description": "CLAN DATABASE: Update a player's seasonSynergy or accountLevel in the database using their UID.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "uid": {
                "type": "STRING"
            },
            "synergy": {
                "type": "INTEGER"
            },
            "level": {
                "type": "INTEGER"
            }
        },
        "required": [
            "uid"
        ]
    }
},

  /**
   * CLAN DATABASE: Update player stats.
   */
  async execute(args, invoker, guild) {
    const { uid, synergy, level } = args;
    if (!(await this._checkPower(invoker, guild, [PermissionFlagsBits.Administrator]))) {
      return { success: false, message: "Unauthorized. Only Administrators can update player stats." };
    }
    try {
      const player = await Player.findOne({ uid: uid });
      if (!player) return { success: false, message: `Player with UID ${uid} not found.` };
      
      if (synergy !== undefined) player.seasonSynergy = synergy;
      if (level !== undefined) player.accountLevel = level;
      
      await player.save();
      return { success: true, message: `Successfully updated stats for ${player.ign}.` };
    } catch (e) {
      return { success: false, message: `Stat update failed: ${e.message}` };
    }
  }
};
