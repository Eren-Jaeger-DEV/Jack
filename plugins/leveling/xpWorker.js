const { EmbedBuilder } = require("discord.js");
const Level = require("../../bot/database/models/Level");
const xpCache = require("./xpCache");
const getLevelFromXP = require("./utils/getLevelFromXP");
const configManager = require("../../bot/utils/configManager");

module.exports = function xpWorker(client) {
  // Run every 5 minutes (300,000 ms)
  setInterval(async () => {
    const cacheData = Array.from(xpCache.getAll().values());
    xpCache.clear();

    if (cacheData.length === 0) return;

    for (const data of cacheData) {
      const { guildId, userId, xp, weeklyXp, lastMessage } = data;

      try {
        let profile = await Level.findOne({ guildId, userId });

        if (!profile) {
          profile = new Level({ 
            guildId, 
            userId, 
            xp: 0, 
            weeklyXp: 0, 
            level: 0, 
            lastMessage: data.lastMessage 
          });
        }

        profile.xp += xp;
        profile.weeklyXp += weeklyXp;
        profile.lastMessage = lastMessage;

        const oldLevel = profile.level;
        const newLevel = getLevelFromXP(profile.xp);

        if (newLevel > oldLevel) {
          profile.level = newLevel;
          await handleLevelUp(client, profile, guildId, userId, newLevel);
        }

        await profile.save();

      } catch (err) {
        console.error("Error in xpWorker update loop:", err);
      }
    }
  }, 300000);
};

async function handleLevelUp(client, profile, guildId, userId, newLevel) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;

  // Handle Roles
  const config = await configManager.getGuildConfig(guildId);
  const levelingRolesMap = config?.settings?.levelRoles || new Map();
  const targetRoleID = getRoleForLevel(newLevel, levelingRolesMap);
  const allRankRoles = Array.from(levelingRolesMap.values());

  if (targetRoleID) {
    const rolesToRemove = allRankRoles.filter(id => member.roles.cache.has(id) && id !== targetRoleID);
    
    // Remove old matching rank roles
    if (rolesToRemove.length > 0) {
      await member.roles.remove(rolesToRemove).catch(() => null);
    }
    
    // Add new role
    if (!member.roles.cache.has(targetRoleID)) {
      await member.roles.add(targetRoleID).catch(() => null);
    }
  }

  // Handle Announcement
  const announcementChannelId = config?.settings?.logChannelId || config?.settings?.modLogChannelId; // Fallback or specific
  const channel = announcementChannelId ? guild.channels.cache.get(announcementChannelId) : null;
  if (channel && channel.isTextBased()) {
    const embed = new EmbedBuilder()
      .setColor("#FFD700") // Gold highlight
      .setAuthor({ name: `${member.displayName} leveled up!`, iconURL: member.user.displayAvatarURL() })
      .setDescription(`**CONGRATS**\nYou are now level ${newLevel}!!`)
      .setFooter({ text: "JACK × XZEEMO" });

    await channel.send({ content: `<@${userId}>`, embeds: [embed] }).catch(() => null);
  }
}

function getRoleForLevel(level, levelingRolesMap) {
  if (!levelingRolesMap) return null;
  const levels = Array.from(levelingRolesMap.keys()).map(Number).sort((a, b) => b - a);
  for (const threshold of levels) {
    if (level >= threshold) {
      return levelingRolesMap.get(String(threshold));
    }
  }
  return null;
}
