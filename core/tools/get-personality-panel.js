const configManager = require("../../bot/utils/configManager");
const personalityService = require("../../plugins/admin/services/personalityService");

module.exports = {
  schema: {
    "name": "get_personality_panel",
    "description": "Displays the Personality Engine UI Panel allowing the Supreme Manager to view and adjust your core personality dials.",
    "parameters": {
        "type": "OBJECT",
        "properties": {}
    }
  },

  /**
   * Spawns the interactive personality tuner panel.
   */
  async execute(args, invoker, guild) {
    const targetGuildId = guild ? guild.id : "1341978655437619250"; // Use prod guild if in DM
    const config = await configManager.getGuildConfig(targetGuildId);
    
    const panelPayload = personalityService.buildPersonalityPanel(config);
    
    return {
      success: true,
      components: panelPayload.components,
      flags: panelPayload.flags,
      message: "Personality panel displayed."
    };
  }
};
