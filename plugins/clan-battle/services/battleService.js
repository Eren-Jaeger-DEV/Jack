/**
 * battleService.js — Core business logic for the Clan Battle system
 *
 * ALL database operations and leaderboard rendering go through here.
 * Commands and events call these functions — they never touch the DB directly.
 */

const Battle = require('../models/Battle');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const PLAYERS_PER_PAGE       = 10;
const MAX_POINTS             = 100;
const CLAN_BATTLE_CHANNEL_ID = '1379098755592093787';

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
    { new: true }
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

/**
 * Admin: overwrite today's points for a user.
 */
async function editTodayPoints(guildId, userId, newPoints) {
  const battle = await getActiveBattle(guildId);
  if (!battle) return { success: false, error: 'No active clan battle.' };

  const player = battle.players.find(p => p.userId === userId);
  if (!player) return { success: false, error: 'Player not found in this battle.' };

  const diff = newPoints - player.todayPoints;
  player.todayPoints = newPoints;
  player.totalPoints += diff;

  await battle.save();
  return { success: true, player };
}

/**
 * Admin: overwrite total points for a user.
 */
async function editTotalPoints(guildId, userId, newTotal) {
  const battle = await getActiveBattle(guildId);
  if (!battle) return { success: false, error: 'No active clan battle.' };

  const player = battle.players.find(p => p.userId === userId);
  if (!player) return { success: false, error: 'Player not found in this battle.' };

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
  console.log(`[ClanBattle] Daily points reset for guild ${guildId}`);
}

/* ═══════════════════════════════════════════
 *  LEADERBOARD
 * ═══════════════════════════════════════════ */

/**
 * Build a leaderboard string for a specific page.
 */
function getLeaderboardPage(battle, page = 0) {
  const sorted = [...battle.players].sort((a, b) => b.totalPoints - a.totalPoints);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PLAYERS_PER_PAGE));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));

  const start = safePage * PLAYERS_PER_PAGE;
  const slice = sorted.slice(start, start + PLAYERS_PER_PAGE);

  let board = '```md\n';
  board += padRight('Member', 20) + padRight('Today', 8) + 'Total\n';
  board += '─'.repeat(35) + '\n';

  if (slice.length === 0) {
    board += 'No players registered yet.\n';
  } else {
    for (let i = 0; i < slice.length; i++) {
      const rank = start + i + 1;
      const p = slice[i];
      // Format: "1 PlayerA" in the 20-char column
      const memberStr = `${rank} ${truncate(p.ign, 16)}`;
      board += padRight(memberStr, 20) +
               padRight(String(p.todayPoints), 8) +
               String(p.totalPoints) + '\n';
    }
  }

  board += '```';

  const embed = new EmbedBuilder()
    .setTitle('🏆 Contribution Point Rankings')
    .setDescription(board)
    .setFooter({ text: `Page ${safePage + 1} / ${totalPages}` })
    .setColor('#FFD700');

  return { embed, page: safePage, totalPages };
}

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
async function refreshLeaderboard(client, battle, page = 0) {
  try {
    const channel = await client.channels.fetch(CLAN_BATTLE_CHANNEL_ID).catch(() => null);
    if (!channel) return null;

    // 1. Delete old message
    await deleteOldLeaderboardMessage(client, battle);

    // 2. Build & send new one
    const lb = getLeaderboardPage(battle, page);
    const components = lb.totalPages > 1 ? [buildButtons(lb.page, lb.totalPages)] : [];

    const msg = await channel.send({ embeds: [lb.embed], components });

    // 3. Save new message ID
    battle.leaderboardMessageId = msg.id;
    await battle.save();

    return msg;
  } catch (err) {
    console.error(`[ClanBattle] Failed to refresh leaderboard:`, err.message);
    return null;
  }
}

/**
 * Delete the old leaderboard message safely.
 */
async function deleteOldLeaderboardMessage(client, battle) {
  if (!battle.leaderboardMessageId) return;
  try {
    const channel = await client.channels.fetch(CLAN_BATTLE_CHANNEL_ID).catch(() => null);
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
function buildFinalResults(battle) {
  const sorted = [...battle.players].sort((a, b) => b.totalPoints - a.totalPoints);
  const top6 = sorted.slice(0, 6);

  let results = '```\n🏆 Clan Battle Results\n\n';
  results += padRight('', 4) + padRight('Member', 20) + 'Total\n';
  results += '─'.repeat(35) + '\n';

  for (let i = 0; i < top6.length; i++) {
    results += padRight(String(i + 1), 4) +
               padRight(truncate(top6[i].ign, 18), 20) +
               String(top6[i].totalPoints) + '\n';
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

module.exports = {
  createBattle,
  getActiveBattle,
  endBattle,
  addPoints,
  editTodayPoints,
  editTotalPoints,
  resetDailyPoints,
  getLeaderboardPage,
  buildButtons,
  refreshLeaderboard,
  deleteOldLeaderboardMessage,
  buildFinalResults,
  MAX_POINTS
};
