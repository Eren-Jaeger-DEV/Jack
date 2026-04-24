const fs = require("fs");
const path = require("path");
const { PermissionFlagsBits } = require("discord.js");

const OWNER_IDS = (process.env.OWNER_IDS || "").split(',').map(id => id.trim());

module.exports = {
  schema: {
    "name": "list_directory",
    "description": "SYSTEM OPERATOR: List all files and subdirectories within a given path to navigate the codebase autonomously.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "dir_path": {
                "type": "STRING",
                "description": "The directory path to list (e.g., 'bot/utils', 'core/tools', or '.' for root)."
            }
        },
        "required": [
            "dir_path"
        ]
    }
  },

  /**
   * SYSTEM OPERATOR: List directory contents.
   */
  async execute(args, invoker, guild) {
    const { dir_path } = args;
    
    // Safety check: Only owners or admins
    const isAdmin = invoker.permissions?.has(PermissionFlagsBits.Administrator);
    if (!isAdmin && !OWNER_IDS.includes(invoker.id)) {
        return { success: false, message: "Unauthorized. You do not have permission to scan the system directories." };
    }

    try {
      // Prevent directory traversal attacks
      const resolvedPath = path.resolve(path.join(__dirname, "../../", dir_path));
      const rootDir = path.resolve(path.join(__dirname, "../../"));
      
      if (!resolvedPath.startsWith(rootDir)) {
        return { success: false, message: "Security violation: Attempted to scan outside the project root." };
      }
      
      if (!fs.existsSync(resolvedPath)) {
        return { success: false, message: `Directory not found: ${dir_path}` };
      }

      const stats = fs.statSync(resolvedPath);
      if (!stats.isDirectory()) {
        return { success: false, message: `Path is a file, not a directory: ${dir_path}` };
      }
      
      const contents = fs.readdirSync(resolvedPath, { withFileTypes: true });
      
      const result = contents.map(item => ({
        name: item.name,
        type: item.isDirectory() ? "directory" : "file"
      }));

      return {
        success: true,
        message: `Scanned directory: ${dir_path}`,
        files: result
      };
    } catch (e) {
      return { success: false, message: `Failed to scan directory: ${e.message}` };
    }
  }
};
