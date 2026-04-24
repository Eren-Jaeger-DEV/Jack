const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { OWNER_IDS } = require("../constants");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");


module.exports = {
  schema: {
    "name": "read_system_logs",
    "description": "SYSTEM OPERATOR: Read recent PM2 system logs to diagnose crashes or errors.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "type": {
                "type": "STRING",
                "enum": [
                    "error",
                    "out"
                ]
            },
            "lines": {
                "type": "INTEGER"
            }
        },
        "required": [
            "type"
        ]
    }
},

  /**
   * SYSTEM OPERATOR: Read recent system logs to diagnose crashes.
   */
  async execute(args, invoker, guild) {
    const { type = "error", lines = 50 } = args;
    // Check permission to ensure normal users can't read logs
    if (!(await this._checkPower(invoker, guild, [PermissionFlagsBits.Administrator])) && !OWNER_IDS.includes(invoker.id)) {
        return { success: false, message: "Unauthorized. Insufficient permissions to access system logs." };
    }
    
    try {
      const cmd = `pm2 logs jack --${type === 'error' ? 'err' : 'out'} --nostream --lines ${Math.min(lines, 200)}`;
      const output = child_process.execSync(cmd, { encoding: 'utf-8', timeout: 5000 });
      return {
        success: true,
        message: `Retrieved last ${lines} lines of ${type} logs.`,
        data: output
      };
    } catch (e) {
      // Fallback if pm2 logs command fails
      return { success: false, message: `Failed to fetch PM2 logs. Check if PM2 is running and named 'jack'. Error: ${e.message}` };
    }
  }
};
