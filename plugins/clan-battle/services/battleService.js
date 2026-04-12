/**
 * battleService.js — Core business logic for the Clan Battle system
 *
 * ALL database operations and leaderboard rendering go through here.
 * Commands and events call these functions — they never touch the DB directly.
 */

const Battle = require('../models/Battle');
const Player = require('../../../bot/database/models/Player');
const { generateContributionImage } = require('../utils/contributionCanvas');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const configManager = require('../../../bot/utils/configManager');
const { resolveDisplayName } = require('../../../bot/utils/nameResolver');
const logger = require('../../../utils/logger');

const PLAYERS_PER_PAGE       = 10;
const MAX_POINTS             = 100;

/* ═══════════════════════════════════════════
 *  BATTLE LIFECYCLE
 * ═══════════════════════════════════════════ */

/**
 * Create a new battle session.
 */
async function createBattle(guildId, channelId) {
  return Battle.create({ guildId, channelId, active: true, players: [] });
}

/**
 * Get the currently active battle for a guild.
 */
async function getActiveBattle(guildId) {
  return Battle.findOne({ guildId, active: true });
}

/**
 * End the active battle. Returns the final document.
 */
async function endBattle(guildId) {
  return Battle.findOneAndUpdate(
    { guildId, active: true },
    { active: false },
    { returnDocument: 'after' }
  );
}

/* ═══════════════════════════════════════════
 *  POINTS
 * ═══════════════════════════════════════════ */

/**
 * Add daily points for a player. Prevents duplicate daily entries.
 *
 * @returns {{ success: boolean, error?: string }}
 */
async function addPoints(guildId, userId, ign, points) {
  if (points <= 0 || points > MAX_POINTS) {
    return { success: false, error: `Points must be between 1 and ${MAX_POINTS}.` };
  }

  const battle = await getActiveBattle(guildId);
  if (!battle) return { success: false, error: 'No active clan battle.' };

  const today = getTodayString();
  const existing = battle.players.find(p => p.userId === userId);

  if (existing) {
    if (existing.lastSubmittedDate === today) {
      return { success: false, error: 'You have already submitted your points today.' };
    }
    existing.todayPoints = points;
    existing.totalPoints += points;
    existing.lastSubmittedDate = today;
  } else {
    battle.players.push({
      userId,
      ign,
      todayPoints: points,
      totalPoints: points,
      lastSubmittedDate: today
    });
  }

  await battle.save();
  return { success: true };
}

const { resolvePlayer } = require('../../../bot/utils/playerResolver');

/**
 * Admin: overwrite today's points for a user.
 */
async function editTodayPoints(guildId, target, newPoints) {
  const battle = await getActiveBattle(guildId);
  if (!battle) return { success: false, error: 'No active clan battle.' };

  const { player: globalPlayer, error } = await resolvePlayer(target);
  if (error || !globalPlayer || !globalPlayer.ign) {
    return { success: false, error: error || 'Player not found in the registration database.' };
  }

  const identifier = globalPlayer.discordId || globalPlayer.uid;
  let player = battle.players.find(p => p.userId === identifier);

  // If player not in battle, add them
  if (!player) {
    player = {
      userId: identifier,
      ign: globalPlayer.ign,
      todayPoints: 0,
      totalPoints: 0,
      lastSubmittedDate: ''
    };
    battle.players.push(player);
    player = battle.players[battle.players.length - 1];
  }

  const diff = newPoints - player.todayPoints;
  player.todayPoints = newPoints;
  player.totalPoints += diff;

  await battle.save();
  return { success: true, player };
}

/**
 * Admin: overwrite total points for a user.
 */
async function editTotalPoints(guildId, target, newTotal) {
  const battle = await getActiveBattle(guildId);
  if (!battle) return { success: false, error: 'No active clan battle.' };

  const { player: globalPlayer, error } = await resolvePlayer(target);
  if (error || !globalPlayer || !globalPlayer.ign) {
    return { success: false, error: error || 'Player not found in the registration database.' };
  }

  const identifier = globalPlayer.discordId || globalPlayer.uid;
  let player = battle.players.find(p => p.userId === identifier);

  // If player not in battle, add them
  if (!player) {
    player = {
      userId: identifier,
      ign: globalPlayer.ign,
      todayPoints: 0,
      totalPoints: 0,
      lastSubmittedDate: ''
    };
    battle.players.push(player);
    player = battle.players[battle.players.length - 1];
  }

  player.totalPoints = newTotal;
  await battle.save();
  return { success: true, player };
}

/**
 * Reset todayPoints for ALL players in the active battle.
 * Called by the midnight scheduler.
 */
async function resetDailyPoints(guildId) {
  const battle = await getActiveBattle(guildId);
  if (!battle) return;

  for (const p of battle.players) {
    p.todayPoints = 0;
  }
  await battle.save();
  logger.info("ClanBattle", `Daily points reset for guild ${guildId}`);
}

/* ═══════════════════════════════════════════
 *  LEADERBOARD
 * ═══════════════════════════════════════════ */


/**
 * Build pagination buttons.
 */
function buildButtons(page, totalPages) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`battle_lb_prev_${page}`)
      .setLabel('◀ Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(`battle_lb_next_${page}`)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1)
  );
  return row;
}

/**
 * Delete old leaderboard message and send a new one.
 * Returns the new message ID.
 */
async function refreshLeaderboard(client, battle, page = 0, interaction = null) {
  try {
    const config = await configManager.getGuildConfig(battle.guildId);
    const clanBattleChannelId = config?.settings?.clanBattleChannelId;
    if (!clanBattleChannelId) return null;

    const channel = await client.channels.fetch(clanBattleChannelId).catch(() => null);
    if (!channel) {
      logger.error("ClanBattle", `Leaderboard channel not found: ${clanBattleChannelId}`);
      return null;
    }

    const guild = await client.guilds.fetch(battle.guildId).catch(() => null);
    if (!guild) {
      logger.error("ClanBattle", `Guild not found for battle: ${battle.guildId}`);
      return null;
    }

    // 1. Prepare data (10 per page)
    const sorted = [...battle.players].sort((a, b) => b.totalPoints - a.totalPoints);
    const totalPages = Math.max(1, Math.ceil(sorted.length / 10));
    const safePage = Math.max(0, Math.min(page, totalPages - 1));
    const start = safePage * 10;
    const slice = sorted.slice(start, start + 10);

    const canvasPlayers = await Promise.all(slice.map(async (p) => {
      const user = await client.users.fetch(p.userId).catch(() => null);
      const displayName = await resolveDisplayName(guild, p.userId, p.ign);
      
      return {
        name: displayName,
        today: p.todayPoints,
        total: p.totalPoints,
        avatarURL: user ? user.displayAvatarURL({ extension: 'png', size: 128 }) : 'https://cdn.discordapp.com/embed/avatars/0.png'
      };
    }));

    // 2. Generate Canvas Image
    const buffer = await generateContributionImage(canvasPlayers, safePage);
    const attachment = new AttachmentBuilder(buffer, { name: 'contribution-leaderboard.png' });

    // 3. Components
    const components = totalPages > 1 ? [buildButtons(safePage, totalPages)] : [];

    // 4. Update or Send
    let msg;
    if (interaction && (interaction.isButton() || interaction.isStringSelectMenu())) {
      // Use editReply() because deferUpdate() was called to prevent timeouts
      await interaction.editReply({
        content: '',
        embeds: [],
        files: [attachment],
        components
      }).catch(err => {
        logger.error("ClanBattle", `Leaderboard editReply error: ${err.message}`);
        throw err; // Re-throw to be caught by the outer try-catch
      });
    } else {
      // Standard refresh: Delete old and send new
      await deleteOldLeaderboardMessage(client, battle);
      
      msg = await channel.send({
        files: [attachment],
        components
      });

      // Save new message ID
      battle.leaderboardMessageId = msg.id;
      await battle.save();
    }

    return msg;
  } catch (err) {
    logger.error("ClanBattle", `Failed to refresh leaderboard: ${err.message}`);
    return null;
  }
}

/**
 * Delete the old leaderboard message safely.
 */
async function deleteOldLeaderboardMessage(client, battle) {
  if (!battle.leaderboardMessageId) return;
  try {
    const config = await configManager.getGuildConfig(battle.guildId);
    const clanBattleChannelId = config?.settings?.clanBattleChannelId;
    if (!clanBattleChannelId) return;

    const channel = await client.channels.fetch(clanBattleChannelId).catch(() => null);
    if (!channel) return;

    const oldMsg = await channel.messages.fetch(battle.leaderboardMessageId).catch(() => null);
    if (oldMsg) await oldMsg.delete().catch(() => {});
  } catch (err) {
    // Ignore — message may already be deleted
  }
}

/**
 * Build the final results embed for top 6 winners.
 */
async function buildFinalResults(guild, battle) {
  const sorted = [...battle.players].sort((a, b) => b.totalPoints - a.totalPoints);
  const top6 = sorted.slice(0, 6);

  let results = '```\n🏆 Clan Battle Results\n\n';
  results += padRight('', 4) + padRight('Member', 20) + 'Total\n';
  results += '─'.repeat(35) + '\n';

  for (let i = 0; i < top6.length; i++) {
    const p = top6[i];
    const displayName = await resolveDisplayName(guild, p.userId, p.ign);
    results += padRight(String(i + 1), 4) +
               padRight(truncate(displayName, 18), 20) +
               String(p.totalPoints) + '\n';
  }

  results += '```';
  return { results, top6 };
}

/* ═══════════════════════════════════════════
 *  HELPERS
 * ═══════════════════════════════════════════ */

function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function padRight(str, len) {
  return str.length >= len ? str.substring(0, len) : str + ' '.repeat(len - str.length);
}

function truncate(str, max) {
  return str.length > max ? str.substring(0, max - 1) + '…' : str;
}

/**
 * Build all leaderboard pages as images for archival.
 */
async function getAllLeaderboardImages(client, battle) {
  const sorted = [...battle.players].sort((a, b) => b.totalPoints - a.totalPoints);
  const totalPages = Math.max(1, Math.ceil(sorted.length / 10));
  const attachments = [];

  const guild = await client.guilds.fetch(battle.guildId).catch(() => null);

  for (let page = 0; page < totalPages; page++) {
    const start = page * 10;
    const slice = sorted.slice(start, start + 10);

    const canvasPlayers = await Promise.all(slice.map(async (p) => {
      const user = await client.users.fetch(p.userId).catch(() => null);
      const displayName = await resolveDisplayName(guild, p.userId, p.ign);
      
      return {
        name: displayName,
        today: p.todayPoints,
        total: p.totalPoints,
        avatarURL: user ? user.displayAvatarURL({ extension: 'png', size: 128 }) : 'https://cdn.discordapp.com/embed/avatars/0.png'
      };
    }));

    if (canvasPlayers.length > 0) {
      const buffer = await generateContributionImage(canvasPlayers, page);
      const attachment = new AttachmentBuilder(buffer, { name: `clan-battle-archive-page-${page + 1}.png` });
      attachments.push(attachment);
    }
  }

  return attachments;
}

module.exports = {
  createBattle,
  getActiveBattle,
  endBattle,
  addPoints,
  editTodayPoints,
  editTotalPoints,
  resetDailyPoints,
  buildButtons,
  refreshLeaderboard,
  deleteOldLeaderboardMessage,
  buildFinalResults,
  getAllLeaderboardImages,
  MAX_POINTS
};
