const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");


module.exports = {
  schema: {
    "name": "propose_code_change",
    "description": "SYSTEM OPERATOR: Draft a code change to a codebase file. This will NOT apply the change immediately. It saves a patch file. After calling this, inform the Supreme Manager of the Proposal ID and ask if they want to apply it.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "file_path": {
                "type": "STRING"
            },
            "replacement_content": {
                "type": "STRING"
            },
            "rationale": {
                "type": "STRING"
            }
        },
        "required": [
            "file_path",
            "replacement_content",
            "rationale"
        ]
    }
},

  /**
   * SYSTEM OPERATOR: Draft a code change (Proposal Pattern).
   */
  async execute(args, invoker, guild) {
    const { file_path, replacement_content, rationale } = args;
    if (!OWNER_IDS.includes(invoker.id)) {
        return { success: false, message: "Unauthorized. Only the Supreme Manager can draft code changes." };
    }
    
    try {
      const crypto = require('crypto');
      const proposalId = crypto.randomBytes(4).toString('hex');
      const proposalsDir = path.join(__dirname, "../../proposals");
      
      if (!fs.existsSync(proposalsDir)) fs.mkdirSync(proposalsDir, { recursive: true });
      
      const patchPath = path.join(proposalsDir, `${proposalId}_patch.txt`);
      const metaPath = path.join(proposalsDir, `${proposalId}_meta.json`);
      
      fs.writeFileSync(patchPath, replacement_content);
      fs.writeFileSync(metaPath, JSON.stringify({ file_path, rationale, timestamp: Date.now() }, null, 2));
      
      return { 
        success: true, 
        message: `Proposal saved successfully with ID: ${proposalId}. Please inform the Supreme Manager and ask if they would like you to apply it.` 
      };
    } catch (e) {
      return { success: false, message: `Failed to draft proposal: ${e.message}` };
    }
  }
};
