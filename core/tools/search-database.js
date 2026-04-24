const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");

const Player = require("../../bot/database/models/Player");

module.exports = {
  schema: {
    "name": "search_database",
    "description": "SYSTEM OPERATOR: Search the player database by IGN or UID.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "query": {
                "type": "STRING"
            }
        },
        "required": [
            "query"
        ]
    }
},

  /**
   * SYSTEM OPERATOR: Search the database for specific players or stats.
   */
  async execute(args, invoker, guild) {
    const { query } = args;
    try {
      // Allow searching by exact UID or partial IGN
      const isNumeric = /^\d+$/.test(query);
      const searchCriteria = isNumeric 
        ? { uid: query }
        : { ign: { $regex: new RegExp(query, "i") } };
        
      const players = await Player.find(searchCriteria).limit(5);
      
      return {
        success: true,
        message: `Database search complete for: ${query}`,
        data: players.map(p => ({ ign: p.ign, uid: p.uid, role: p.role, level: p.accountLevel, synergy: p.seasonSynergy }))
      };
    } catch (e) {
      return { success: false, message: `Database search failed: ${e.message}` };
    }
  }
};
