const { PermissionFlagsBits } = require("discord.js");
const toolService = require("../bot/utils/toolService");

/**
 * AI VALIDATOR (v1.0.0)
 * Security and integrity layer for AI-driven actions.
 */
module.exports = {
  
  /**
   * Validates if the tool exists and the user has permission to use it.
   */
  async validateAction(decision, invoker, guild, isOwner = false) {
    if (decision.type !== 'tool') return { valid: true };

    const toolName = decision.tool;
    const args = decision.args || {};

    // 1. Existence Check
    if (typeof toolService[toolName] !== 'function') {
      return { valid: false, reason: `Tool '${toolName}' does not exist in the capability matrix.` };
    }

    // 2. Permission Tiers
    if (isOwner) return { valid: true }; // Owner Bypass

    const ROOT_TOOLS = ['ban_member', 'kick_member', 'record_personality_trait'];
    const VISION_TOOLS = ['get_server_map', 'get_system_map', 'get_user_roles'];
    // Tools that require Administrator (announce, register, etc.)
    const BROADCAST_TOOLS = ['announce_message', 'register_player', 'update_stats', 'adjust_self_personality'];
    // Tools that are owner-only — no staff bypass
    const SYSTEM_TOOLS = ['restart_system', 'read_system_logs', 'read_codebase_file', 'write_system_log'];

    if (SYSTEM_TOOLS.includes(toolName)) {
      return { valid: false, reason: "Unauthorized: This operation is restricted to the Supreme Manager (Owner) only." };
    }

    if (ROOT_TOOLS.includes(toolName)) {
      const allowed = await toolService._checkPower(invoker, guild, [
        PermissionFlagsBits.ManageGuild, // Broadly for Staff
        PermissionFlagsBits.BanMembers,
        PermissionFlagsBits.KickMembers
      ]);
      if (!allowed) return { valid: false, reason: "Unauthorized: Access restricted to Root Authority (Staff/Admin)." };
    }

    if (VISION_TOOLS.includes(toolName)) {
      const allowed = await toolService._checkPower(invoker, guild, [
        PermissionFlagsBits.ManageGuild,
        PermissionFlagsBits.Administrator
      ]);
      if (!allowed) return { valid: false, reason: "Unauthorized: Access restricted to Strategic Command (Manage Guild)." };
    }

    if (BROADCAST_TOOLS.includes(toolName)) {
      const allowed = await toolService._checkPower(invoker, guild, [PermissionFlagsBits.Administrator]);
      if (!allowed) return { valid: false, reason: "Unauthorized: Access restricted to Administrators." };
    }

    // 3. Inner Permission Check (Safety Layer)
    // Note: Tools themselves now have internal _checkPower(invoker, guild, [FLAGS])

    // 3. Argument Validation (Basic)
    const validationError = this._validateArgs(toolName, args);
    if (validationError) {
      return { valid: false, reason: `Missing Arguments: ${validationError}` };
    }

    return { valid: true };
  },

  /**
   * Internal Argument Validator
   */
  _validateArgs(toolName, args) {
    const schemas = {
      ban_member: ['discord_id', 'reason'],
      kick_member: ['discord_id', 'reason'],
      record_personality_trait: ['discord_id', 'note'],
      get_player_profile: ['discord_id'],
      get_optimal_matchmaking: ['team_size']
    };

    const required = schemas[toolName] || [];
    for (const field of required) {
      if (!args[field]) return field;
    }
    return null;
  }
};
