const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");


module.exports = {
  schema: {
    "name": "purge_messages",
    "description": "ROOT AUTHORITY: Bulk delete messages from a specific channel.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "channel_id": {
                "type": "STRING"
            },
            "amount": {
                "type": "INTEGER"
            }
        },
        "required": [
            "channel_id",
            "amount"
        ]
    }
},

  /**
   * ROOT AUTHORITY: Purge Messages.
   */
  async execute(args, invoker, guild) {
    const { channel_id, amount } = args;
    if (!(await this._checkPower(invoker, guild, [PermissionFlagsBits.ManageMessages]))) {
      return { success: false, message: "Unauthorized. Insufficient permissions to manage messages." };
    }
    
    try {
      const rawChannelId = this._sanitizeId(channel_id);
      const channel = guild.channels.cache.get(rawChannelId);
      
      if (!channel) {
        return { success: false, message: `Channel not found: ${channel_id}` };
      }
      
      const numToDelete = Math.min(100, Math.max(1, parseInt(amount) || 0));
      if (numToDelete <= 0) return { success: false, message: "Invalid amount specified." };
      
      await channel.bulkDelete(numToDelete, true);
      return { success: true, message: `Successfully deleted ${numToDelete} messages from ${channel.name}.` };
    } catch (e) {
      return { success: false, message: `Purge failed: ${e.message}` };
    }
  }
};
