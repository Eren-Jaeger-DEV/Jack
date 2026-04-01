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
  
  async _checkPower(member, guild) {
    if (!member || !guild) return false;
    if (member.id === guild.ownerId) return true;
    
    const managerRoles = ["Manager", "Staff", "Moderator", "Admin"];
    const hasRole = member.roles.cache.some(r => managerRoles.includes(r.name));
    const hasPerm = member.permissions.has(PermissionFlagsBits.ManageGuild) || member.permissions.has(PermissionFlagsBits.KickMembers);
    
    return hasRole || hasPerm;
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
      return { success: `Memory Updated: ${note} (Total Rep: ${diary.reputationScore})` };
    } catch (e) { return { error: "Failed to record trait." }; }
  },

  /**
   * STAT VISION: Fetch player profile from DB.
   */
  async get_player_profile(args, invoker, guild) {
    const { discord_id } = args;
    const rawId = this._sanitizeId(discord_id || args.discordId);
    try {
      const player = await Player.findOne({ discordId: rawId });
      if (!player) return { error: "Player not found in database." };
      return { 
        ign: player.ign, 
        uid: player.uid, 
        level: player.accountLevel, 
        synergy: player.seasonSynergy,
        role: player.role 
      };
    } catch (e) { return { error: "Fetch failed." }; }
  },

  /**
   * SERVER VISION: Live Discord stats.
   */
  async get_server_stats(args, invoker, guild) {
    if (!guild) return { error: "No guild context." };
    try {
      return {
        serverName: guild.name,
        totalMembers: guild.memberCount,
        humans: guild.members.cache.filter(m => !m.user.bot).size,
        bots: guild.members.cache.filter(m => m.user.bot).size,
        online: guild.members.cache.filter(m => m.presence?.status !== 'offline').size
      };
    } catch (e) { return { error: "Stats failed." }; }
  },

  /**
   * SYSTEM AWARENESS: Bot plugin map.
   */
  async get_system_map(args, invoker, guild) {
    try {
      const pluginsPath = path.join(__dirname, "../../plugins");
      const plugins = fs.readdirSync(pluginsPath).filter(f => fs.statSync(path.join(pluginsPath, f)).isDirectory());
      return { active_plugins: plugins, core: "Neural Identity V4" };
    } catch (e) { return { error: "Mapping failed." }; }
  },

  /**
   * SERVER VISION: Channel/Role map.
   */
  async get_server_map(args, invoker, guild) {
    if (!guild) return { error: "No guild context." };
    try {
      const channels = guild.channels.cache.map(c => ({ name: c.name, type: c.type })).slice(0, 30);
      const roles = guild.roles.cache.map(r => r.name).slice(0, 20);
      return { channels, roles, totalChannels: guild.channels.cache.size };
    } catch (e) { return { error: "Vision failed." }; }
  },

  /**
   * STRATEGIC: Matchmaking logic.
   */
  async get_optimal_matchmaking(args, invoker, guild) {
    const { team_size = "4" } = args;
    try {
      const players = await Player.find({ isClanMember: true }).sort({ seasonSynergy: -1 }).limit(12);
      if (players.length < parseInt(team_size)) return { error: "Not enough online members for a squad." };
      
      const squad = players.slice(0, parseInt(team_size)).map(p => p.ign);
      return { recommended_squad: squad, strategy: "High-Synergy Aggressive Push" };
    } catch (e) { return { error: "Matchmaking failed." }; }
  },

  /**
   * ROOT AUTHORITY: Ban.
   */
  async ban_member(args, invoker, guild) {
    const { discord_id, reason } = args;
    if (!(await this._checkPower(invoker, guild))) return { error: "Unauthorized." };
    const rawId = this._sanitizeId(discord_id);
    try {
      const member = await guild.members.fetch(rawId);
      await member.ban({ reason: `[JACK AI] ${reason}` });
      return { success: `Banned ${member.user.tag}` };
    } catch (e) { return { error: e.message }; }
  },

  /**
   * ROOT AUTHORITY: Kick.
   */
  async kick_member(args, invoker, guild) {
    const { discord_id, reason } = args;
    if (!(await this._checkPower(invoker, guild))) return { error: "Unauthorized." };
    const rawId = this._sanitizeId(discord_id);
    try {
      const member = await guild.members.fetch(rawId);
      await member.kick(`[JACK AI] ${reason}`);
      return { success: `Kicked ${member.user.tag}` };
    } catch (e) { return { error: e.message }; }
  }
};
