const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const OWNER_IDS = ["771611262022844427", "888337321869582367"];
const Player = require("../database/models/Player");
const MemberDiary = require("../database/models/MemberDiary");
const UserMemory = require("../database/models/UserMemory");
const configManager = require("./configManager");
const memoryEngine = require("../../core/memoryEngine");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");

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
   * ROOT AUTHORITY: Purge Messages.
   */
  async purge_messages(args, invoker, guild) {
    const { channel_id, amount } = args;
    if (!(await this._checkPower(invoker, guild, [PermissionFlagsBits.ManageMessages]))) {
      return { success: false, message: "Unauthorized. Insufficient permissions to manage messages." };
    }
    
    try {
      const rawChannelId = this._sanitizeId(channel_id);
      const channel = guild.channels.cache.get(rawChannelId);
      
      if (!channel) {
        return { success: false, message: `Channel not found: ${channel_id}` };
      }
      
      const numToDelete = Math.min(100, Math.max(1, parseInt(amount) || 0));
      if (numToDelete <= 0) return { success: false, message: "Invalid amount specified." };
      
      await channel.bulkDelete(numToDelete, true);
      return { success: true, message: `Successfully deleted ${numToDelete} messages from ${channel.name}.` };
    } catch (e) {
      return { success: false, message: `Purge failed: ${e.message}` };
    }
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
  },

  /**
   * TRUST & PAYMENT: Automates payment verification, logging, and semantic memory storage.
   */
  async verify_payment(args, invoker, guild) {
    const { userId, amount, currency, status, confidence, screenshotUrl, transactionId } = args;
    
    if (confidence < 0.75 || status !== "verified") {
      return { success: false, message: "unable to verify, manual review required" };
    }

    try {
      const rawId = this._sanitizeId(userId || invoker.id);
      
      // 1. Duplicate Detection
      let duplicateQuery = { guildId: guild.id, tags: "payment" };
      let memories = await UserMemory.find(duplicateQuery).sort({ createdAt: -1 }).limit(20);
      
      const isDuplicate = memories.some(mem => {
        return (transactionId && mem.content.includes(transactionId)) || 
               (mem.content.includes(amount) && mem.createdAt > Date.now() - 24 * 60 * 60 * 1000); // Same amount within 24h as a heuristic
      });

      if (isDuplicate && transactionId) {
        return { success: false, message: "duplicate payment detected" };
      }

      // 2. Memory Integration
      const memoryContent = `User completed payment of ₹${amount}${transactionId ? ' (TxID: ' + transactionId + ')' : ''}`;
      await memoryEngine.storeMemory({
        userId: rawId,
        guildId: guild.id,
        type: "event",
        content: memoryContent,
        tags: ["payment", "verified"],
        importance: 0.95
      });

      // 3. Trust Logging & Role
      const guildConfig = await configManager.getGuildConfig(guild.id);
      if (guildConfig && guildConfig.settings) {
        // Logging
        if (guildConfig.settings.trustChannelId) {
          const trustChannel = guild.channels.cache.get(guildConfig.settings.trustChannelId);
          if (trustChannel) {
            const embed = new EmbedBuilder()
              .setTitle("💰 Payment Verification")
              .setColor("#00FF00")
              .setDescription(`**User:** <@${rawId}>\n**Amount:** ₹${amount} ${currency || "INR"}\n**Status:** VERIFIED\n**Confidence:** ${confidence}`)
              .addFields({ name: "Transaction ID", value: transactionId || "N/A" })
              .setImage(screenshotUrl)
              .setFooter({ text: "Verified by Jack AI" });
              
            await trustChannel.send({ embeds: [embed] });
          }
        }
        
        // Optional Role
        if (guildConfig.settings.trustedRoleId) {
          try {
            const member = await guild.members.fetch(rawId);
            if (member && !member.roles.cache.has(guildConfig.settings.trustedRoleId)) {
              await member.roles.add(guildConfig.settings.trustedRoleId);
            }
          } catch (roleErr) {
            // ignore fetch/role errors
          }
        }
      }

      return { success: true, message: "Payment successfully verified and logged." };
    } catch (e) {
      return { success: false, message: "Validation error: " + e.message };
    }
  },

  /**
   * SYSTEM OPERATOR: Fetch the clan leaderboard based on specific criteria.
   */
  async get_clan_leaderboard(args, invoker, guild) {
    const { sort_by = "seasonSynergy", limit = 10, order = "desc" } = args;
    try {
      const sortConfig = {};
      sortConfig[sort_by] = order === "asc" ? 1 : -1;
      
      const players = await Player.find({ isClanMember: true })
        .sort(sortConfig)
        .limit(Math.min(limit, 50));
        
      const leaderboard = players.map(p => ({
        ign: p.ign,
        uid: p.uid,
        [sort_by]: p[sort_by]
      }));
      
      return {
        success: true,
        message: `Fetched top ${leaderboard.length} clan members sorted by ${sort_by}.`,
        data: leaderboard
      };
    } catch (e) {
      return { success: false, message: `Leaderboard fetch failed: ${e.message}` };
    }
  },

  /**
   * SYSTEM OPERATOR: Search the database for specific players or stats.
   */
  async search_database(args, invoker, guild) {
    const { query } = args;
    try {
      // Allow searching by exact UID or partial IGN
      const isNumeric = /^\\d+$/.test(query);
      const searchCriteria = isNumeric 
        ? { uid: query }
        : { ign: { $regex: new RegExp(query, "i") } };
        
      const players = await Player.find(searchCriteria).limit(5);
      
      return {
        success: true,
        message: `Database search complete for: ${query}`,
        data: players.map(p => ({ ign: p.ign, uid: p.uid, role: p.role, level: p.accountLevel, synergy: p.seasonSynergy }))
      };
    } catch (e) {
      return { success: false, message: `Database search failed: ${e.message}` };
    }
  },

  /**
   * SYSTEM OPERATOR: Read recent system logs to diagnose crashes.
   */
  async read_system_logs(args, invoker, guild) {
    const { type = "error", lines = 50 } = args;
    // Check permission to ensure normal users can't read logs
    if (!(await this._checkPower(invoker, guild, [PermissionFlagsBits.Administrator])) && !OWNER_IDS.includes(invoker.id)) {
        return { success: false, message: "Unauthorized. Insufficient permissions to access system logs." };
    }
    
    try {
      const cmd = `pm2 logs jack --${type === 'error' ? 'err' : 'out'} --nostream --lines ${Math.min(lines, 200)}`;
      const output = child_process.execSync(cmd, { encoding: 'utf-8', timeout: 5000 });
      return {
        success: true,
        message: `Retrieved last ${lines} lines of ${type} logs.`,
        data: output
      };
    } catch (e) {
      // Fallback if pm2 logs command fails
      return { success: false, message: `Failed to fetch PM2 logs. Check if PM2 is running and named 'jack'. Error: ${e.message}` };
    }
  },

  /**
   * SYSTEM OPERATOR: Write persistent logs.
   */
  async write_system_log(args, invoker, guild) {
    const { message } = args;
    try {
      const logPath = path.join(__dirname, "../../../data/ai_operator_logs.txt");
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${message}\\n`;
      
      // Ensure directory exists
      const dir = path.dirname(logPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      
      fs.appendFileSync(logPath, logEntry);
      return { success: true, message: "Log saved to persistent storage." };
    } catch (e) {
      return { success: false, message: `Failed to write log: ${e.message}` };
    }
  },

  /**
   * SYSTEM OPERATOR: Read codebase file for self-diagnosis.
   */
  async read_codebase_file(args, invoker, guild) {
    const { file_path } = args;
    
    if (!(await this._checkPower(invoker, guild, [PermissionFlagsBits.Administrator])) && !OWNER_IDS.includes(invoker.id)) {
        return { success: false, message: "Unauthorized. Insufficient permissions to access the codebase." };
    }

    try {
      // Prevent directory traversal attacks
      const resolvedPath = path.resolve(path.join(__dirname, "../../../", file_path));
      const rootDir = path.resolve(path.join(__dirname, "../../../"));
      
      if (!resolvedPath.startsWith(rootDir)) {
        return { success: false, message: "Security violation: Attempted path traversal out of workspace." };
      }
      
      if (!fs.existsSync(resolvedPath)) {
        return { success: false, message: `File not found at path: ${file_path}` };
      }
      
      const fileContent = fs.readFileSync(resolvedPath, 'utf8');
      return {
        success: true,
        message: `File loaded: ${file_path}`,
        data: fileContent.substring(0, 15000) // Truncate to prevent token overflow
      };
    } catch (e) {
      return { success: false, message: `Failed to read file: ${e.message}` };
    }
  },

  /**
   * SYSTEM OPERATOR: Restart system via PM2.
   */
  async restart_system(args, invoker, guild) {
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
