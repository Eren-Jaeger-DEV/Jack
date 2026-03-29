const { EmbedBuilder } = require("discord.js");
const configManager = require("../../../bot/utils/configManager");

/**
 * Handles role assignment and announcements when a user levels up.
 * @param {Client} client Discord Client
 * @param {string} guildId Guild ID
 * @param {string} userId User ID
 * @param {number} newLevel The level reached
 */
async function handleLevelUp(client, guildId, userId, newLevel) {
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
  // User requested: 1478710940378857483 for guild 1341978655437619250
  let announcementChannelId = config?.settings?.logChannelId || config?.settings?.modLogChannelId;
  if (guildId === "1341978655437619250") {
    announcementChannelId = "1478710940378857483";
  }

  const channel = announcementChannelId ? guild.channels.cache.get(announcementChannelId) : null;
  if (channel && (channel.isTextBased() || channel.type === 0)) {
    const embed = new EmbedBuilder()
      .setColor("#FFD700") // Gold highlight
      .setAuthor({ name: `${member.displayName} leveled up!`, iconURL: member.user.displayAvatarURL() })
      .setDescription(`**CONGRATS**\nYou are now level ${newLevel}!!`)
      .setFooter({ text: "JACK × XZEEMO" });

    await channel.send({ content: `<@${userId}>`, embeds: [embed] }).catch(() => null);
  }
}

/**
 * Identify the highest eligible role for a given level.
 */
function getRoleForLevel(level, levelingRolesMap) {
  if (!levelingRolesMap) return null;
  
  // Convert from Map/Object to sorted array of levels
  const levels = Array.from(levelingRolesMap.keys())
    .map(Number)
    .sort((a, b) => b - a);

  for (const threshold of levels) {
    if (level >= threshold) {
      return levelingRolesMap.get(String(threshold));
    }
  }
  return null;
}

module.exports = { handleLevelUp, getRoleForLevel };
