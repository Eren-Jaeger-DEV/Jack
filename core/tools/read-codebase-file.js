const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { OWNER_IDS } = require("../constants");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");


module.exports = {
  schema: {
    "name": "read_codebase_file",
    "description": "SYSTEM OPERATOR: Read the contents of a codebase file (e.g., bot/utils/aiService.js) to diagnose code issues.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "file_path": {
                "type": "STRING"
            }
        },
        "required": [
            "file_path"
        ]
    }
},

  /**
   * SYSTEM OPERATOR: Read codebase file for self-diagnosis.
   */
  async execute(args, invoker, guild) {
    const { file_path } = args;
    
    if (!(await this._checkPower(invoker, guild, [PermissionFlagsBits.Administrator])) && !OWNER_IDS.includes(invoker.id)) {
        return { success: false, message: "Unauthorized. Insufficient permissions to access the codebase." };
    }

    try {
      // Prevent directory traversal attacks
      const resolvedPath = path.resolve(path.join(__dirname, "../../", file_path));
      const rootDir = path.resolve(path.join(__dirname, "../../"));
      
      if (!resolvedPath.startsWith(rootDir)) {
        return { success: false, message: "Security violation: Attempted path traversal out of workspace." };
      }
      
      if (!fs.existsSync(resolvedPath)) {
        return { success: false, message: `File not found at path: ${file_path}` };
      }
      
      const fileContent = fs.readFileSync(resolvedPath, 'utf8');
      return {
        success: true,
        message: `File loaded: ${file_path}`,
        data: fileContent.substring(0, 15000) // Truncate to prevent token overflow
      };
    } catch (e) {
      return { success: false, message: `Failed to read file: ${e.message}` };
    }
  }
};
