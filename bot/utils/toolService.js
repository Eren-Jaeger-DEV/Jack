const fs = require("fs");
const path = require("path");
const Player = require("../database/models/Player");
const MemberDiary = require("../database/models/MemberDiary");
const { PermissionFlagsBits } = require("discord.js");

/**
 * TOOL SERVICE (v4.0.0)
 * Optimized for Jack's Neural Engine. Standardized signatures to (args, invoker, guild).
 */
module.exports = {
  
  async _checkPower(member, guild, requiredPerms = [PermissionFlagsBits.ManageGuild]) {
    if (!member || !guild) return false;
    if (member.id === guild.ownerId) return true;
    
    // REQUISITE: Use Permission flags instead of role names (Admin/Manager strings)
    return requiredPerms.some(perm => member.permissions.has(perm)) || member.permissions.has(PermissionFlagsBits.Administrator);
  },

  _sanitizeId(id) {
    return typeof id === 'string' ? id.replace(/\D/g, "") : id;
  },

  /**
   * MEMORY TOOL: Records a personality trait or interaction note.
   */
  async record_personality_trait(args, invoker, guild) {
    const { discord_id, note, reputation_change = 0 } = args;
    const rawId = this._sanitizeId(discord_id);
    try {
      let diary = await MemberDiary.findOne({ discordId: rawId });
      if (!diary) diary = new MemberDiary({ discordId: rawId });
      
      diary.notes += `\n[${new Date().toLocaleDateString()}] ${note}`;
      diary.reputationScore += reputation_change;
      diary.interactionCount += 1;
      diary.lastInteraction = Date.now();
      
      await diary.save();
      return { success: true, message: `Memory Updated: ${note} (Total Rep: ${diary.reputationScore})` };
    } catch (e) { return { success: false, message: "Failed to record personality trait." }; }
  },

  /**
   * STAT VISION: Fetch player profile from DB.
   */
  async get_player_profile(args, invoker, guild) {
    const { discord_id } = args;
    const rawId = this._sanitizeId(discord_id || args.discordId);
    try {
      const player = await Player.findOne({ discordId: rawId });
      if (!player) return { success: false, message: "Player not found in database." };
      return { 
        success: true,
        message: `Profile retrieved for ${player.ign}`,
        data: {
          ign: player.ign, 
          uid: player.uid, 
          level: player.accountLevel, 
          synergy: player.seasonSynergy,
          role: player.role 
        }
      };
    } catch (e) { return { success: false, message: "Failed to fetch player profile." }; }
  },

  /**
   * SERVER VISION: Live Discord stats.
   */
  async get_server_stats(args, invoker, guild) {
    if (!guild) return { success: false, message: "No guild context available." };
    try {
      const humans = guild.members.cache.filter(m => !m.user.bot).size;
      const bots = guild.members.cache.filter(m => m.user.bot).size;
      return {
        success: true,
        message: `Server stats for ${guild.name} compiled.`,
        data: {
          serverName: guild.name,
          totalMembers: guild.memberCount,
          humans,
          bots,
          online: guild.members.cache.filter(m => m.presence?.status !== 'offline').size
        }
      };
    } catch (e) { return { success: false, message: "Failed to compile server statistics." }; }
  },

  /**
   * SYSTEM AWARENESS: Bot plugin and health map.
   */
  async get_system_map(args, invoker, guild) {
    try {
      const pluginsPath = path.join(__dirname, "../../plugins");
      const plugins = fs.readdirSync(pluginsPath).filter(f => fs.statSync(path.join(pluginsPath, f)).isDirectory());
      
      const uptime = process.uptime();
      const mem = process.memoryUsage();
      
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);

      return { 
        success: true, 
        message: "System capability and health map generated.",
        data: { 
          active_plugins: plugins, 
          core: "Neural Identity V4 (Modular)",
          health: {
            uptime: `${hours}h ${minutes}m`,
            memory_heap: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
            status: "OPTIMAL"
          },
          capabilities: {
            commands_loaded: guild.client.commands.size,
            plugins_active: plugins.length
          }
        }
      };
    } catch (e) { return { success: false, message: "Failed to map system capabilities." }; }
  },

  /**
   * SERVER VISION: Channel/Role map.
   */
  async get_server_map(args, invoker, guild) {
    if (!guild) return { success: false, message: "No guild context available." };
    try {
      const channels = guild.channels.cache.map(c => ({ name: c.name, type: c.type })).slice(0, 20);
      const roles = guild.roles.cache.map(r => r.name).slice(0, 15);
      return { 
        success: true,
        message: `Visual map of ${guild.name} exported.`,
        data: { channels, roles, totalChannels: guild.channels.cache.size }
      };
    } catch (e) { return { success: false, message: "Failed to generate server map." }; }
  },

  /**
   * STRATEGIC: Matchmaking logic.
   */
  async get_optimal_matchmaking(args, invoker, guild) {
    const { team_size = "4" } = args;
    try {
      const players = await Player.find({ isClanMember: true }).sort({ seasonSynergy: -1 }).limit(12);
      if (players.length < parseInt(team_size)) return { success: false, message: "Insufficient clan members available for optimization." };
      
      const squad = players.slice(0, parseInt(team_size)).map(p => p.ign);
      return { 
        success: true,
        message: "Strategic squad optimization complete.",
        data: { recommended_squad: squad, strategy: "High-Synergy Aggressive Push" }
      };
    } catch (e) { return { success: false, message: "Matchmaking optimization failed." }; }
  },

  /**
   * ROOT AUTHORITY: Ban.
   */
  async ban_member(args, invoker, guild) {
    const { discord_id, reason } = args;
    if (!(await this._checkPower(invoker, guild, [PermissionFlagsBits.BanMembers]))) return { success: false, message: "Unauthorized. Insufficient permissions for Root Authority (Ban)." };
    const rawId = this._sanitizeId(discord_id);
    try {
      const member = await guild.members.fetch(rawId);
      await member.ban({ reason: `[JACK AI] ${reason}` });
      return { success: true, message: `Banned user ${member.user.tag} for: ${reason}` };
    } catch (e) { return { success: false, message: `Ban failed: ${e.message}` }; }
  },

  /**
   * ROOT AUTHORITY: Kick.
   */
  async kick_member(args, invoker, guild) {
    const { discord_id, reason } = args;
    if (!(await this._checkPower(invoker, guild, [PermissionFlagsBits.KickMembers]))) return { success: false, message: "Unauthorized. Insufficient permissions for Root Authority (Kick)." };
    const rawId = this._sanitizeId(discord_id);
    try {
      const member = await guild.members.fetch(rawId);
      await member.kick(`[JACK AI] ${reason}`);
      return { success: true, message: `Kicked user ${member.user.tag} for: ${reason}` };
    } catch (e) { return { success: false, message: `Kick failed: ${e.message}` }; }
  },

  /**
   * SERVER VISION: Fetch the current server roles of a user.
   */
  async get_user_roles(args, invoker, guild) {
    const { discord_id } = args;
    const rawId = this._sanitizeId(discord_id || invoker.id);
    if (!guild) return { success: false, message: "No guild context available." };
    try {
      const member = await guild.members.fetch(rawId);
      if (!member) return { success: false, message: "User not found in this guild." };
      
      const roles = member.roles.cache
        .filter(r => r.name !== "@everyone")
        .map(r => r.name);
        
      return {
        success: true,
        message: `Roles retrieved for ${member.user.tag}: ${roles.join(", ") || "No roles"}`,
        data: { roles }
      };
    } catch (e) { return { success: false, message: "Failed to fetch user roles." }; }
  }
};
