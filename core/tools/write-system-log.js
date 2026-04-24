const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");


module.exports = {
  schema: {
    "name": "write_system_log",
    "description": "SYSTEM OPERATOR: Write a persistent log or note to the AI operator log file.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "message": {
                "type": "STRING"
            }
        },
        "required": [
            "message"
        ]
    }
},

  /**
   * SYSTEM OPERATOR: Write persistent logs.
   */
  async execute(args, invoker, guild) {
    const { message } = args;
    try {
      const logPath = path.join(__dirname, "../../../data/ai_operator_logs.txt");
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${message}\\n`;
      
      // Ensure directory exists
      const dir = path.dirname(logPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      
      fs.appendFileSync(logPath, logEntry);
      return { success: true, message: "Log saved to persistent storage." };
    } catch (e) {
      return { success: false, message: `Failed to write log: ${e.message}` };
    }
  }
};
