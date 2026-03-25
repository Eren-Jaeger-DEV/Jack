const Team = require("../models/Team");
const { TEAMUP_CHANNEL_ID, EXPIRY_TIME_MS, REMINDER_TIME_MS } = require("../config");
const roleManager = require("./roleManager");
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

class TeamService {
  async isInTeam(userId) {
    return await Team.findOne({ members: userId });
  }

  async createTeam(client, guild, leaderId, type, maxSize, channel) {
    const existing = await this.isInTeam(leaderId);
    if (existing) throw new Error("You are already in a team!");

    // Create the embed
    const embed = new EmbedBuilder()
      .setTitle("🎮 Team Created")
      .setColor("#00ff00")
      .setDescription(`**Leader:** <@${leaderId}>\n**Mode:** ${type}\n**Players:** 1/${maxSize}`)
      .setTimestamp();

    const joinButton = new ButtonBuilder()
      .setCustomId(`teamup_join`) // We'll handle this in interactionCreate
      .setLabel("Join Team")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(joinButton);

    const teamupChannel = guild.channels.cache.get(TEAMUP_CHANNEL_ID) || channel;
    
    const message = await teamupChannel.send({
      content: `<@&1477876817099493550>`, // Ping role
      embeds: [embed],
      components: [row]
    });

    const team = await Team.create({
      leaderId,
      members: [leaderId],
      maxSize,
      type,
      messageId: message.id,
      channelId: teamupChannel.id,
      guildId: guild.id
    });

    await roleManager.assignRole(guild, leaderId);
    
    // Attempt merge immediately after creation
    await this.tryMerge(client, guild, team);

    return team;
  }

  async joinTeam(client, guild, userId, teamId = null) {
    const existing = await this.isInTeam(userId);
    if (existing) return { success: false, message: "You are already in a team!" };

    let team;
    if (teamId) {
      team = await Team.findById(teamId);
    } else {
      // Find team by member check (if called from keywords in channel)
      // Actually, joining via keyword usually joins the MOST RECENT non-full team in the channel
      team = await Team.findOne({ guildId: guild.id, members: { $ne: userId } })
        .sort({ createdAt: -1 });
    }

    if (!team) return { success: false, message: "No available teams found." };
    if (team.members.length >= team.maxSize) return { success: false, message: "Team is full!" };
    if (team.members.includes(userId)) return { success: false, message: "You are already in this team!" };

    team.members.push(userId);
    await team.save();

    await roleManager.assignRole(guild, userId);
    await this.updateTeamEmbed(client, guild, team);

    // Ping leader
    const channel = guild.channels.cache.get(team.channelId);
    if (channel) {
      channel.send(`📢 <@${team.leaderId}> someone joined your team! (${team.members.length}/${team.maxSize})`);
    }

    return { success: true, team };
  }

  async updateTeamEmbed(client, guild, team) {
    try {
      const channel = guild.channels.cache.get(team.channelId);
      if (!channel) return;

      const message = await channel.messages.fetch(team.messageId).catch(() => null);
      if (!message) return;

      const embed = EmbedBuilder.from(message.embeds[0])
        .setDescription(`**Leader:** <@${team.leaderId}>\n**Mode:** ${team.type}\n**Players:** ${team.members.length}/${team.maxSize}`);

      await message.edit({ embeds: [embed] });
    } catch (err) {
      console.error("[TeamUp] Failed to update embed:", err.message);
    }
  }

  async cleanupExpired(client) {
    const cutoff = new Date(Date.now() - EXPIRY_TIME_MS);
    const expiredTeams = await Team.find({ createdAt: { $lt: cutoff } });

    for (const team of expiredTeams) {
      try {
        const guild = client.guilds.cache.get(team.guildId);
        if (guild) {
          const channel = guild.channels.cache.get(team.channelId);
          if (channel) {
            const message = await channel.messages.fetch(team.messageId).catch(() => null);
            if (message) await message.delete().catch(() => {});
          }
          await roleManager.removeRoleFromMany(guild, team.members);
        }
        await Team.deleteOne({ _id: team._id });
      } catch (err) {
        console.error(`[TeamUp] Error cleaning up team ${team._id}:`, err.message);
      }
    }
  }

  async sendReminders(client) {
    const cutoff = new Date(Date.now() - REMINDER_TIME_MS);
    const pendingTeams = await Team.find({
      createdAt: { $lt: cutoff },
      lastReminderAt: null,
      $expr: { $lt: [{ $size: "$members" }, "$maxSize"] }
    });

    for (const team of pendingTeams) {
      try {
        const guild = client.guilds.cache.get(team.guildId);
        if (guild) {
          const channel = guild.channels.cache.get(team.channelId);
          if (channel) {
            await channel.send(`🚨 <@&1477876817099493550> Team still needs players!\nMode: ${team.type} (${team.members.length}/${team.maxSize})`);
          }
        }
        team.lastReminderAt = new Date();
        await team.save();
      } catch (err) {
        console.error(`[TeamUp] Error sending reminder for team ${team._id}:`, err.message);
      }
    }
  }

  async tryMerge(client, guild, team) {
    // Find another non-full team of the same type
    const otherTeam = await Team.findOne({
      _id: { $ne: team._id },
      guildId: guild.id,
      type: team.type,
      $expr: { $lt: [{ $size: "$members" }, "$maxSize"] }
    });

    if (!otherTeam) return;

    // Check if they can merge without exceeding max size
    if (team.members.length + otherTeam.members.length <= otherTeam.maxSize) {
      // Merge 'team' into 'otherTeam'
      otherTeam.members.push(...team.members);
      await otherTeam.save();

      // Notify
      const channel = guild.channels.cache.get(otherTeam.channelId);
      if (channel) {
        channel.send(`🔀 Teams merged for **${team.type}**!`);
      }

      // Cleanup old team
      const oldChannel = guild.channels.cache.get(team.channelId);
      if (oldChannel) {
        const message = await oldChannel.messages.fetch(team.messageId).catch(() => null);
        if (message) await message.delete().catch(() => {});
      }
      
      await Team.deleteOne({ _id: team._id });
      await this.updateTeamEmbed(client, guild, otherTeam);
    }
  }

  async findBestTeam(guildId, phrase) {
    // Basic detection: if the phrase is from chat detection, return any non-full team
    return await Team.findOne({
      guildId,
      $expr: { $lt: [{ $size: "$members" }, "$maxSize"] }
    }).sort({ createdAt: -1 });
  }

  async deleteTeam(client, guild, team) {
    try {
      const channel = guild.channels.cache.get(team.channelId);
      if (channel) {
        const message = await channel.messages.fetch(team.messageId).catch(() => null);
        if (message) await message.delete().catch(() => {});
      }
      await roleManager.removeRoleFromMany(guild, team.members);
      await Team.deleteOne({ _id: team._id });
      return { success: true };
    } catch (err) {
      console.error("[TeamUp] DeleteTeam error:", err.message);
      return { success: false, message: err.message };
    }
  }

  async leaveTeam(client, guild, userId) {
    const team = await this.isInTeam(userId);
    if (!team) return { success: false, message: "You are not in a team!" };

    // If they are the leader
    if (team.leaderId === userId) {
      // If they are the only member, delete the team
      if (team.members.length === 1) {
        return await this.deleteTeam(client, guild, team);
      } else {
        // Transfer leadership
        const newMembers = team.members.filter(m => m !== userId);
        team.members = newMembers;
        team.leaderId = newMembers[0]; // New leader is the next person
        await team.save();
        
        await roleManager.removeRole(guild, userId);
        await this.updateTeamEmbed(client, guild, team);

        const channel = guild.channels.cache.get(team.channelId);
        if (channel) {
          channel.send(`🏃 <@${userId}> has left the team. Leadership transferred to <@${team.leaderId}>.`);
        }
        return { success: true, message: "Left team and transferred leadership." };
      }
    } else {
      // Just a member
      team.members = team.members.filter(m => m !== userId);
      await team.save();

      await roleManager.removeRole(guild, userId);
      await this.updateTeamEmbed(client, guild, team);

      const channel = guild.channels.cache.get(team.channelId);
      if (channel) {
        channel.send(`🏃 <@${userId}> has left the team.`);
      }
      return { success: true, message: "Left team successfully." };
    }
  }
}

module.exports = new TeamService();
