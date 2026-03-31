const fs = require("fs");
const path = require("path");
const Player = require("../database/models/Player");
const synergyService = require("../../plugins/seasonal-synergy/services/synergyService");
const { resolveDisplayName } = require("./nameResolver");
const { PermissionFlagsBits } = require("discord.js");

/**
 * TOOL SERVICE (v3.1.0)
 * Fixed ID sanitization and added internal logging for AI moderation.
 */
module.exports = {
  
  async _checkPower(member, guild) {
    if (!member || !guild) return false;
    if (member.id === guild.ownerId) return true;
    
    // Check for "Manager" or permissions
    const managerRoles = ["Manager", "Staff", "Moderator", "Admin"];
    const hasRole = member.roles.cache.some(r => managerRoles.includes(r.name));
    const hasPerm = member.permissions.has(PermissionFlagsBits.ManageGuild) || member.permissions.has(PermissionFlagsBits.KickMembers);
    
    return hasRole || hasPerm;
  },

  /**
   * Sanitizes a Discord mention/ID into a raw Snowflake string.
   */
  _sanitizeId(id) {
    return id.replace(/\D/g, "");
  },

  async get_system_map() {
    try {
      const pluginsPath = path.join(__dirname, "../../plugins");
      const plugins = fs.readdirSync(pluginsPath).filter(f => fs.statSync(path.join(pluginsPath, f)).isDirectory());
      return { total: plugins.length, active: plugins, note: "All plugins operational." };
    } catch (e) { return { error: "Mapping failed." }; }
  },

  async ban_member(discord_id, reason, invoker, guild) {
    const rawId = this._sanitizeId(discord_id);
    if (!(await this._checkPower(invoker, guild))) return { error: "Permission Denied." };
    
    try {
      const member = await guild.members.fetch(rawId).catch(() => null);
      if (!member) return { error: "User not found (Verify ID: " + rawId + ")" };
      
      await member.ban({ reason: `[Jack AI Command] ${reason}` });
      console.log(`[AI MOD] Banned ${member.user.tag} by order of ${invoker.user.tag}`);
      return { success: `Successfully banned ${member.user.tag}.` };
    } catch (e) {
      console.error(`[AI MOD FAIL] Ban error:`, e.message);
      return { error: `Failed to ban: ${e.message}` };
    }
  },

  async kick_member(discord_id, reason, invoker, guild) {
    const rawId = this._sanitizeId(discord_id);
    console.log(`[AI MOD] Attempting kick on rawId: ${rawId} | Reason: ${reason}`);

    if (!(await this._checkPower(invoker, guild))) {
      console.warn(`[AI MOD] Permission Denied for ${invoker?.user?.tag}`);
      return { error: "Permission Denied. Only Owners/Managers can kick." };
    }
    
    try {
      const member = await guild.members.fetch(rawId).catch(() => null);
      if (!member) {
        console.warn(`[AI MOD] Member not found: ${rawId}`);
        return { error: "User not found in the server. Make sure they are still here." };
      }
      
      await member.kick(`[Jack AI Command] ${reason}`);
      console.log(`[AI MOD] Kicked ${member.user.tag} by order of ${invoker.user.tag}`);
      return { success: `Successfully kicked ${member.user.tag} from the server.` };
    } catch (e) {
      console.error(`[AI MOD FAIL] Kick error:`, e.message);
      return { error: `Failed to kick: ${e.message}` };
    }
  },

  async clear_messages(amount, channel_id, invoker, guild) {
    const rawChannelId = this._sanitizeId(channel_id);
    if (!(await this._checkPower(invoker, guild))) return { error: "Permission Denied." };

    try {
      const channel = await guild.channels.fetch(rawChannelId).catch(() => null);
      if (!channel) return { error: "Invalid channel." };
      const deleted = await channel.bulkDelete(Math.min(amount, 100), true);
      return { success: `Cleared ${deleted.size} messages.` };
    } catch (e) { return { error: `Fail: ${e.message}` }; }
  },

  async get_player_profile(discordId, guild) {
    const rawId = this._sanitizeId(discordId);
    try {
      const player = await Player.findOne({ discordId: rawId });
      if (!player) return { error: "Not registered." };
      return { ign: player.ign, uid: player.uid, level: player.accountLevel };
    } catch (e) { return { error: "Fetch failed." }; }
  }
};
