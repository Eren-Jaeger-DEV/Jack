const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");

const configManager = require("../../bot/utils/configManager");

module.exports = {
  schema: {
    "name": "adjust_self_personality",
    "description": "SELF-EVOLUTION: Allows Jack to recalibrate his own personality dials (humor, strictness, etc.) based on user feedback or server atmosphere.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "humor": {
                "type": "INTEGER",
                "description": "0-100 scale"
            },
            "strictness": {
                "type": "INTEGER",
                "description": "0-100 scale"
            },
            "verbosity": {
                "type": "INTEGER",
                "description": "0-100 scale"
            },
            "respect_bias": {
                "type": "INTEGER",
                "description": "0-100 scale"
            },
            "tone": {
                "type": "STRING",
                "description": "e.g., 'calm', 'funny', 'aggressive', 'professional'"
            },
            "rationale": {
                "type": "STRING",
                "description": "Why are you making this adjustment?"
            }
        }
    }
},

  /**
   * SELF-EVOLUTION: Adjust Jack's own personality parameters.
   */
  async execute(args, invoker, guild) {
    const { humor, strictness, verbosity, respect_bias, tone, rationale } = args;
    if (!guild) return { success: false, message: "Guild context missing." };

    try {
      const updates = { settings: { personality: {} } };
      if (humor !== undefined) updates.settings.personality.humor = Math.max(0, Math.min(100, humor));
      if (strictness !== undefined) updates.settings.personality.strictness = Math.max(0, Math.min(100, strictness));
      if (verbosity !== undefined) updates.settings.personality.verbosity = Math.max(0, Math.min(100, verbosity));
      if (respect_bias !== undefined) updates.settings.personality.respect_bias = Math.max(0, Math.min(100, respect_bias));
      if (tone) updates.settings.personality.tone = tone;

      await configManager.updateGuildConfig(guild.id, updates);
      
      return { 
        success: true, 
        message: `Personality recalibrated. Rationale: ${rationale || "Optimization"}. New State: Humor=${humor || 'NA'}, Strictness=${strictness || 'NA'}, Tone=${tone || 'NA'}` 
      };
    } catch (e) {
      return { success: false, message: `Calibration failed: ${e.message}` };
    }
  }
};
