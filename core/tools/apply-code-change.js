const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");


module.exports = {
  schema: {
    "name": "apply_code_change",
    "description": "SYSTEM OPERATOR: Apply a previously drafted code change using its Proposal ID. ONLY call this if the Supreme Manager explicitly tells you to deploy/apply a patch in the conversation.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "proposal_id": {
                "type": "STRING"
            }
        },
        "required": [
            "proposal_id"
        ]
    }
},

  /**
   * SYSTEM OPERATOR: Apply a code change proposal.
   */
  async execute(args, invoker, guild) {
    const { proposal_id } = args;
    if (!OWNER_IDS.includes(invoker.id)) {
        return { success: false, message: "CRITICAL: Deploy denied. Only the Supreme Manager (Owner) can execute this command." };
    }

    try {
      const proposalsDir = path.join(__dirname, "../../../proposals");
      const patchPath = path.join(proposalsDir, `${proposal_id}_patch.txt`);
      const metaPath = path.join(proposalsDir, `${proposal_id}_meta.json`);

      if (!fs.existsSync(patchPath) || !fs.existsSync(metaPath)) {
        return { success: false, message: `Proposal ID ${proposal_id} not found.` };
      }

      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const targetPath = path.resolve(path.join(__dirname, "../../../", meta.file_path));
      const rootDir = path.resolve(path.join(__dirname, "../../../"));

      if (!targetPath.startsWith(rootDir)) {
        return { success: false, message: "Security violation: Path traversal detected." };
      }

      const newContent = fs.readFileSync(patchPath, 'utf8');
      fs.writeFileSync(targetPath, newContent);

      // Clean up
      fs.unlinkSync(patchPath);
      fs.unlinkSync(metaPath);

      return { success: true, message: `Patch applied successfully to ${meta.file_path}. You can now restart the system if required.` };
    } catch (e) {
      return { success: false, message: `Failed to apply patch: ${e.message}` };
    }
  }
};
