const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");

const Player = require("../../bot/database/models/Player");

module.exports = {
  schema: {
    "name": "register_player",
    "description": "CLAN DATABASE: Register a new player in the database with their IGN and UID.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "ign": {
                "type": "STRING"
            },
            "uid": {
                "type": "STRING"
            }
        },
        "required": [
            "ign",
            "uid"
        ]
    }
},

  /**
   * CLAN DATABASE: Register a new player.
   */
  async execute(args, invoker, guild) {
    const { ign, uid } = args;
    if (!(await this._checkPower(invoker, guild, [PermissionFlagsBits.Administrator]))) {
      return { success: false, message: "Unauthorized. Only Administrators can register players." };
    }
    try {
      const existing = await Player.findOne({ uid: uid });
      if (existing) return { success: false, message: `Player with UID ${uid} already exists.` };
      
      const newPlayer = new Player({ ign, uid, isClanMember: true, role: "Recruit", accountLevel: 1, seasonSynergy: 0 });
      await newPlayer.save();
      return { success: true, message: `Successfully registered new player: ${ign} (${uid}).` };
    } catch (e) {
      return { success: false, message: `Registration failed: ${e.message}` };
    }
  }
};
