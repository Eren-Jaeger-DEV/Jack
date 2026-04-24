const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");

const Player = require("../../bot/database/models/Player");

module.exports = {
  schema: {
    "name": "get_player_profile",
    "description": "STAT VISION: Fetch a player's BGMI profile, IGN, UID, and stats.",
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
   * STAT VISION: Fetch player profile from DB.
   */
  async execute(args, invoker, guild) {
    const { discord_id } = args;
    const rawId = this._sanitizeId(discord_id || args.discordId);
    try {
      const player = await Player.findOne({ discordId: rawId });
      if (!player) return { success: false, message: "Player not found in database." };
      return { 
        success: true,
        message: `Profile retrieved for ${player.ign}`,
        data: {
          ign: player.ign, 
          uid: player.uid, 
          level: player.accountLevel, 
          synergy: player.seasonSynergy,
          role: player.role 
        }
      };
    } catch (e) { return { success: false, message: "Failed to fetch player profile." }; }
  }
};
