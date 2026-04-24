const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");


module.exports = {
  schema: {
    "name": "restart_system",
    "description": "SYSTEM OPERATOR: Execute a hard reboot of the PM2 system process."
},

  /**
   * SYSTEM OPERATOR: Restart system via PM2.
   */
  async execute(args, invoker, guild) {
    // ONLY the absolute owner can trigger a reboot via Discord to be perfectly safe.
    if (!OWNER_IDS.includes(invoker.id)) {
        return { success: false, message: "CRITICAL: Reboot denied. Only the Supreme Manager (Owner) can execute this command." };
    }
    
    try {
      // Fire and forget, as it will kill the node process
      setTimeout(() => {
        child_process.exec("pm2 restart jack");
      }, 2000);
      
      return { success: true, message: "Reboot sequence initiated. The system will go offline and return momentarily." };
    } catch (e) {
      return { success: false, message: `Reboot sequence failed: ${e.message}` };
    }
  }
};
