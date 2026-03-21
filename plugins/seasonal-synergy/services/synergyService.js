/**
 * synergyService.js — Core business logic for the Seasonal Synergy system
 *
 * ALL database operations and leaderboard rendering go through here.
 * Commands and events call these functions — they never touch the DB directly.
 */

const Season = require('../models/Season');
const Player = require('../../../bot/database/models/Player');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { generateLeaderboardImage } = require('../../../utils/leaderboardCanvas');
const { resolveDisplayName } = require('../../../bot/utils/nameResolver');

/* ── Constants ── */
const SYNERGY_CHANNEL_ID = '1477984930909786134';
const CLAN_ROLE_ID = '1477856665817714699';
const WEEKLY_MVP_ROLE_ID = '1479876704901009508';
const SEASON_WINNER_ROLE_ID = '1477872708925788201';
const MAX_WEEKLY_ENERGY = 15000;
const PLAYERS_PER_PAGE = 15;

/* ═══════════════════════════════════════════
 *  SEASON LIFECYCLE
 * ═══════════════════════════════════════════ */

async function createSeason(guildId, channelId) {
  return Season.create({ guildId, channelId, active: true });
}

async function getActiveSeason(guildId) {
  return Season.findOne({ guildId, active: true });
}

async function endSeason(guildId) {
  return Season.findOneAndUpdate(
    { guildId, active: true },
    { active: false },
    { new: true }
  );
}

/* ═══════════════════════════════════════════
 *  WEEKLY ENERGY
 * ═══════════════════════════════════════════ */

/**
 * Check if today is a weekend (Saturday or Sunday) in IST.
 */
function isWeekend() {
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ist.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Get today's date as a string (YYYY-MM-DD) in IST.
 */
function getTodayString() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Add weekly energy for a player.
 * - Validates weekend, daily limit, points range.
 * - Also adds to seasonEnergy.
 *
 * @param {string} userId
 * @param {number} points
 * @param {boolean} isAdmin — if true, bypass weekend + daily restrictions
 * @returns {{ success: boolean, error?: string }}
 */
async function addWeeklyEnergy(userId, points, isAdmin = false) {
  if (points <= 0 || points > MAX_WEEKLY_ENERGY) {
    return { success: false, error: `Points must be between 1 and ${MAX_WEEKLY_ENERGY}.` };
  }

  if (!isAdmin && !isWeekend()) {
    return { success: false, error: 'You can only submit weekly energy on Saturday and Sunday.' };
  }

  const player = await Player.findOne({ discordId: userId });
  if (!player) {
    return { success: false, error: 'Player not found in database.' };
  }

  const today = getTodayString();

  if (!isAdmin && player.lastWeeklySubmission === today) {
    return { success: false, error: 'You have already submitted your energy today.' };
  }

  player.weeklySynergy = (player.weeklySynergy || 0) + points;
  player.seasonSynergy = (player.seasonSynergy || 0) + points;
  player.lastWeeklySubmission = today;
  await player.save();

  return { success: true, player };
}

/**
 * Admin: directly set season energy for a player.
 */
async function setSeasonEnergy(userId, points) {
  const player = await Player.findOne({ discordId: userId });
  if (!player) return { success: false, error: 'Player not found in database.' };

  player.seasonSynergy = points;
  await player.save();

  return { success: true, player };
}

/**
 * Reset weekly energy for ALL registered players.
 * Returns the top 3 players (by weekly energy) before resetting.
 */
async function resetWeeklyEnergy() {
  const players = await Player.find({ weeklySynergy: { $gt: 0 } }).sort({ weeklySynergy: -1 });
  const top3 = players.slice(0, 3);

  // Get names for logging before reset
  const topNames = [];
  for (const p of top3) {
    const name = p.ign || p.discordId; // Basic log fallback
    topNames.push(name);
  }

  // Reset all
  await Player.updateMany(
    {},
    { $set: { weeklySynergy: 0, lastWeeklySubmission: '' } }
  );

  console.log(`[SeasonalSynergy] Weekly energy reset. Top 3: ${topNames.join(', ')}`);
  return top3;
}

/**
 * Full season reset: zero weekly + season energy, clear submissions.
 */
async function resetAllEnergy() {
  await Player.updateMany(
    {},
    { $set: { weeklySynergy: 0, seasonSynergy: 0, lastWeeklySubmission: '' } }
  );
  console.log('[SeasonalSynergy] All energy reset (season end).');
}

/**
 * Get top N players by season energy.
 */
async function getTopPlayers(field = 'seasonSynergy', limit = 3) {
  return Player.find({ [field]: { $gt: 0 } }).sort({ [field]: -1 }).limit(limit);
}

/* ═══════════════════════════════════════════
 *  LEADERBOARD
 * ═══════════════════════════════════════════ */

/**
 * Build leaderboard embed for a specific page.
 */
async function getLeaderboardPage(guild, page = 0) {
  const allPlayers = await Player.find({
    $or: [
      { weeklySynergy: { $gt: 0 } },
      { seasonSynergy: { $gt: 0 } },
      { ign: { $exists: true, $ne: '' } }
    ]
  }).sort({ seasonSynergy: -1 });

  const totalPages = Math.max(1, Math.ceil(allPlayers.length / PLAYERS_PER_PAGE));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));

  const start = safePage * PLAYERS_PER_PAGE;
  const slice = allPlayers.slice(start, start + PLAYERS_PER_PAGE);

  const playersArray = [];

  for (let i = 0; i < slice.length; i++) {
    const p = slice[i];

    const displayName = await resolveDisplayName(guild, p.discordId, p.ign);
    const name = displayName;

    let avatarURL = 'https://cdn.discordapp.com/embed/avatars/0.png';
    if (guild) {
      try {
        const member = await guild.members.fetch(p.discordId).catch(() => null);
        if (member) {
          avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 128 });
        }
      } catch (e) { }
    }

    playersArray.push({
      name,
      weekly: p.weeklySynergy || 0,
      season: p.seasonSynergy || 0,
      avatarURL
    });
  }

  let embed = null;
  if (playersArray.length === 0) {
    embed = new EmbedBuilder()
      .setTitle('🔥 SEASON RANKINGS')
      .setDescription('No players registered yet.')
      .setColor('#FF4500');
  }

  return { embed, page: safePage, totalPages, playersArray };
}

/**
 * Build pagination buttons.
 */
function buildButtons(page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`synergy_lb_prev_${page}`)
      .setLabel('◀ Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(`synergy_lb_next_${page}`)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1)
  );
}

/**
 * Delete old leaderboard message and send a new one.
 * ALWAYS sends to SYNERGY_CHANNEL_ID.
 */
async function refreshLeaderboard(client, season, page = 0) {
  try {
    const channel = await client.channels.fetch(SYNERGY_CHANNEL_ID).catch(() => null);
    if (!channel) return null;

    // Delete old message
    await deleteOldLeaderboardMessage(client, season);

    // Fetch guild for display names
    const guild = await client.guilds.fetch(season.guildId).catch(() => null);

    // Build & send
    const lb = await getLeaderboardPage(guild, page);
    const components = lb.totalPages > 1 ? [buildButtons(lb.page, lb.totalPages)] : [];

    const files = [];
    if (lb.playersArray && lb.playersArray.length > 0) {
      const buffer = await generateLeaderboardImage(lb.playersArray, lb.page);
      const attachment = new AttachmentBuilder(buffer, { name: 'leaderboard.png' });
      files.push(attachment);
    }

    const payload = { components, files };
    if (lb.embed) {
      payload.embeds = [lb.embed];
    }

    const msg = await channel.send(payload);

    // Save new message ID
    season.leaderboardMessageId = msg.id;
    await season.save();

    return msg;
  } catch (err) {
    console.error('[SeasonalSynergy] Failed to refresh leaderboard:', err.message);
    return null;
  }
}

/**
 * Delete old leaderboard message safely.
 * Clears stored messageId if message is missing.
 */
async function deleteOldLeaderboardMessage(client, season) {
  if (!season.leaderboardMessageId) return;
  try {
    const channel = await client.channels.fetch(SYNERGY_CHANNEL_ID).catch(() => null);
    if (!channel) return;

    const oldMsg = await channel.messages.fetch(season.leaderboardMessageId).catch(() => null);
    if (oldMsg) {
      await oldMsg.delete().catch(() => { });
    } else {
      // Message was manually deleted — clear stored ID
      season.leaderboardMessageId = null;
      await season.save();
    }
  } catch (err) {
    // Message gone — clear stored ID
    season.leaderboardMessageId = null;
    await season.save().catch(() => { });
  }
}

/**
 * Build final season results for top 3.
 */
async function buildFinalResults(guild) {
  const top3 = await getTopPlayers('seasonSynergy', 3);

  let results = '```\n🏆 Season Final Results\n\n';
  results += padRight('', 4) + padRight('Name', 20) + 'Season Energy\n';
  results += '─'.repeat(40) + '\n';

  for (let i = 0; i < top3.length; i++) {
    const p = top3[i];
    const displayName = await resolveDisplayName(guild, p.discordId, p.ign);
    results += padRight(String(i + 1), 4) +
      padRight(truncate(displayName.toUpperCase(), 18), 20) +
      String(p.seasonSynergy || 0) + '\n';
  }

  results += '```';
  return { results, top3 };
}

/* ═══════════════════════════════════════════
 *  HELPERS
 * ═══════════════════════════════════════════ */

function padRight(str, len) {
  return str.length >= len ? str.substring(0, len) : str + ' '.repeat(len - str.length);
}

function padLeft(str, len) {
  return str.length >= len ? str.substring(0, len) : ' '.repeat(len - str.length) + str;
}

function truncate(str, max) {
  if (!str) return 'Unknown';
  return str.length > max ? str.substring(0, max - 1) + '…' : str;
}

/**
 * Get a player's current synergy and rank.
 */
async function getPlayerSynergy(userId) {
  const player = await Player.findOne({ discordId: userId });
  if (!player) return null;

  const seasonList = await Player.find({ seasonSynergy: { $gt: 0 } }).sort({ seasonSynergy: -1 });
  const seasonRank = seasonList.findIndex(p => p.discordId === userId) + 1;

  const weeklyList = await Player.find({ weeklySynergy: { $gt: 0 } }).sort({ weeklySynergy: -1 });
  const weeklyRank = weeklyList.findIndex(p => p.discordId === userId) + 1;

  return {
    seasonSynergy: player.seasonSynergy || 0,
    weeklySynergy: player.weeklySynergy || 0,
    seasonRank: seasonRank > 0 ? seasonRank : 0,
    weeklyRank: weeklyRank > 0 ? weeklyRank : 0
  };
}

/* ═══════════════════════════════════════════
 *  EXPORTS
 * ═══════════════════════════════════════════ */

module.exports = {
  createSeason,
  getActiveSeason,
  endSeason,
  addWeeklyEnergy,
  setSeasonEnergy,
  resetWeeklyEnergy,
  resetAllEnergy,
  getTopPlayers,
  getPlayerSynergy,
  getLeaderboardPage,
  buildButtons,
  refreshLeaderboard,
  deleteOldLeaderboardMessage,
  buildFinalResults,
  isWeekend,
  MAX_WEEKLY_ENERGY,
  SYNERGY_CHANNEL_ID,
  CLAN_ROLE_ID,
  WEEKLY_MVP_ROLE_ID,
  SEASON_WINNER_ROLE_ID
};
