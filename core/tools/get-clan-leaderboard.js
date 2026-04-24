const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");

const Player = require("../../bot/database/models/Player");

module.exports = {
  schema: {
    "name": "get_clan_leaderboard",
    "description": "SYSTEM OPERATOR: Fetch the top or bottom clan members sorted by a specific stat (seasonSynergy, accountLevel).",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "sort_by": {
                "type": "STRING",
                "enum": [
                    "seasonSynergy",
                    "accountLevel"
                ]
            },
            "limit": {
                "type": "INTEGER"
            },
            "order": {
                "type": "STRING",
                "enum": [
                    "desc",
                    "asc"
                ]
            }
        },
        "required": [
            "sort_by"
        ]
    }
},

  /**
   * SYSTEM OPERATOR: Fetch the clan leaderboard based on specific criteria.
   */
  async execute(args, invoker, guild) {
    const { sort_by = "seasonSynergy", limit = 10, order = "desc" } = args;
    try {
      const sortConfig = {};
      sortConfig[sort_by] = order === "asc" ? 1 : -1;
      
      const players = await Player.find({ isClanMember: true })
        .sort(sortConfig)
        .limit(Math.min(limit, 50));
        
      const leaderboard = players.map(p => ({
        ign: p.ign,
        uid: p.uid,
        [sort_by]: p[sort_by]
      }));
      
      return {
        success: true,
        message: `Fetched top ${leaderboard.length} clan members sorted by ${sort_by}.`,
        data: leaderboard
      };
    } catch (e) {
      return { success: false, message: `Leaderboard fetch failed: ${e.message}` };
    }
  }
};
