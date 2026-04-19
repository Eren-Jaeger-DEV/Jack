/**
 * plugins/games/handlers/tictactoe.js
 *
 * Core TicTacToe engine for the Jack bot.
 *
 * Responsibilities:
 *  • Maintain an in-memory game state Map (keyed by channelId)
 *  • Render the 3×3 button grid from board state
 *  • Detect wins / draws
 *  • Handle all ttt_* button interactions
 *  • Export startGame() so the slash command can start a session
 *
 * Scalability note:
 *  This file is intentionally self-contained. To add a new game
 *  (e.g. Connect Four) create a separate handler and wire it in
 *  plugins/games/index.js — this file does NOT need to change.
 */

'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags
} = require('discord.js');
const TicTacToeStats = require('../../../bot/database/models/TicTacToeStats');

/* ══════════════════════════════════════════════════════════════════════════
 *  CONSTANTS
 * ══════════════════════════════════════════════════════════════════════════ */

// All 8 winning line combinations (indices into the 9-cell board array)
const WIN_LINES = [
  [0, 1, 2], // top row
  [3, 4, 5], // mid row
  [6, 7, 8], // bot row
  [0, 3, 6], // left col
  [1, 4, 7], // mid col
  [2, 5, 8], // right col
  [0, 4, 8], // diagonal ↘
  [2, 4, 6]  // diagonal ↙
];

// Symbols used on the board
const SYMBOLS = ['❌', '⭕'];

// Button prefix — must be unique across all plugins to avoid routing conflicts
const BTN_PREFIX = 'ttt_';

// Roasts and GIFs for winners
const ROASTS = [
  "You play like your internet is powered by a hamster wheel.",
  "I've seen better moves in a game of Solitaire.",
  "My AI brain just lost a few neurons watching that.",
  "You're living proof that even a broken clock is right twice a day.",
  "Is your monitor even turned on?",
  "I would roast you, but my mom told me not to burn trash.",
  "You're the reason the gene pool needs a lifeguard.",
  "If I wanted to kill myself, I'd climb your ego and jump to your IQ.",
  "I'm not saying you're bad, but I've seen better moves in a cemetery.",
  "Your gameplay is like a Windows update: slow, annoying, and nobody asked for it."
];

const WIN_GIFS = []; // Legacy, replaced by dynamic fetching

/* ══════════════════════════════════════════════════════════════════════════
 *  IN-MEMORY STATE
 *  Map<channelId, GameState>
 *
 *  GameState shape:
 *  {
 *    players : [userId, userId],   // [0] = X, [1] = O
 *    turn    : 0 | 1,              // index into players[]
 *    board   : Array(9),           // null | "X" | "O"
 *    active  : boolean,
 *    timeout : NodeJS.Timeout | null,
 *    messageId : string | null      // to re-fetch and disable buttons on timeout
 *  }
 * ══════════════════════════════════════════════════════════════════════════ */

/** @type {Map<string, object>} */
const games = new Map();

/* ══════════════════════════════════════════════════════════════════════════
 *  HELPERS
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * Check board for a winner.
 * @param {Array<null|"X"|"O">} board
 * @returns {"X"|"O"|null} the winning mark, or null
 */
function checkWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // "X" or "O"
    }
  }
  return null;
}

/**
 * Returns true when all 9 cells are filled (used after ruling out a winner).
 * @param {Array<null|"X"|"O">} board
 * @returns {boolean}
 */
function isBoardFull(board) {
  return board.every(cell => cell !== null);
}

/**
 * Build the 3×3 Discord button grid (three ActionRows of three buttons each).
 *
 * Button customId format: ttt_<channelId>_<cellIndex>
 *   → The channelId scopes the button to its game session so we can always
 *     look up the correct state even after a bot restart that cleared the Map
 *     (the interaction will simply fail gracefully).
 *
 * @param {string} channelId
 * @param {Array<null|"X"|"O">} board
 * @param {boolean} disabled — force-disable every cell (game over)
 * @returns {ActionRowBuilder[]}
 */
function buildGrid(channelId, board, disabled = false) {
  const rows = [];

  for (let row = 0; row < 3; row++) {
    const actionRow = new ActionRowBuilder();

    for (let col = 0; col < 3; col++) {
      const index = row * 3 + col;
      const mark  = board[index]; // null | "X" | "O"

      const btn = new ButtonBuilder()
        .setCustomId(`${BTN_PREFIX}${channelId}_${index}`)
        // Empty cells show a zero-width space so Discord renders the button
        // without requiring a visible label
        .setLabel(mark === 'X' ? '❌' : mark === 'O' ? '⭕' : '\u200b')
        .setStyle(
          mark === 'X' ? ButtonStyle.Danger    // red for X
          : mark === 'O' ? ButtonStyle.Primary  // blue for O
          : ButtonStyle.Secondary               // grey for empty
        )
        // Disable if: forced (game over) OR cell already occupied
        .setDisabled(disabled || mark !== null);

      actionRow.addComponents(btn);
    }

    rows.push(actionRow);
  }

  return rows;
}

/**
 * Build the game embed displaying current status.
 *
 * @param {object} game       — game state object
 * @param {"playing"|"win"|"draw"|"timedout"} status
 * @param {string} [winnerId] — Discord user ID of winner (if status === "win")
 * @param {string} [gifUrl]   — Dynamic GIF from nekos.best
 * @returns {EmbedBuilder}
 */
function buildEmbed(game, status, winnerId = null, gifUrl = null) {
  const [p1Id, p2Id] = game.players;

  let description;

  if (status === 'win') {
    const winSymbol = game.players.indexOf(winnerId) === 0 ? SYMBOLS[0] : SYMBOLS[1];
    const roast = ROASTS[Math.floor(Math.random() * ROASTS.length)];

    description = `🏆 **<@${winnerId}> wins!** ${winSymbol}\n\n> *"${roast}"*\n\n<@${p1Id}> ❌  vs  ⭕ <@${p2Id}>`;
    
    const embed = new EmbedBuilder()
      .setTitle('🎮 TicTacToe: Game Over!')
      .setDescription(description)
      .setColor(0x57F287) // green
      .setFooter({ text: 'Better luck next time!' });
    
    if (gifUrl) embed.setImage(gifUrl);
    
    return embed;
  } else if (status === 'draw') {
    description = `🤝 **It's a draw!**\n\n<@${p1Id}> ❌  vs  ⭕ <@${p2Id}>`;
  } else {
    // Currently playing
    const currentId     = game.players[game.turn];
    const currentSymbol = SYMBOLS[game.turn];
    description = `${currentSymbol} **<@${currentId}>'s turn**\n\n<@${p1Id}> ❌  vs  ⭕ <@${p2Id}>`;
  }

  return new EmbedBuilder()
    .setTitle('🎮 TicTacToe')
    .setDescription(description)
    .setColor(
      status === 'win'  ? 0x57F287 :  // green
      status === 'draw' ? 0x95A5A6 :  // grey
      status === 'timedout' ? 0xED4245 : // red
                          0x5865F2     // blurple (playing)
    )
    .setFooter({ text: status === 'timedout' ? 'This game has expired due to inactivity.' : 'Use the buttons below to make your move!' });
}

/**
 * Update player statistics in the database.
 * Only records games between two human players.
 *
 * @param {string[]} playerIds - [p1Id, p2Id]
 * @param {string|null} winnerId - ID of the winner, or null for draw
 * @param {import('discord.js').Client} client - Discord client to identify bots
 */
async function recordResult(playerIds, winnerId, client) {
  const [p1Id, p2Id] = playerIds;

  // Skip if either player is a bot
  const p1 = await client.users.fetch(p1Id).catch(() => null);
  const p2 = await client.users.fetch(p2Id).catch(() => null);
  if (p1?.bot || p2?.bot) return;

  if (winnerId) {
    const loserId = p1Id === winnerId ? p2Id : p1Id;

    // Update winner
    await TicTacToeStats.findOneAndUpdate(
      { userId: winnerId },
      { $inc: { wins: 1 } },
      { upsert: true, new: true }
    );

    // Update loser
    await TicTacToeStats.findOneAndUpdate(
      { userId: loserId },
      { $inc: { losses: 1 } },
      { upsert: true, new: true }
    );
  } else {
    // Update both for draw
    for (const id of playerIds) {
      await TicTacToeStats.findOneAndUpdate(
        { userId: id },
        { $inc: { draws: 1 } },
        { upsert: true, new: true }
      );
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════════
 *  AI LOGIC (MINIMAX)
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * Minimax algorithm to find the best move.
 * @param {Array<null|"X"|"O">} board
 * @param {number} depth
 * @param {boolean} isMax
 * @param {"X"|"O"} aiMark
 * @param {"X"|"O"} playerMark
 * @returns {number}
 */
function minimax(board, depth, isMax, aiMark, playerMark) {
  const winner = checkWinner(board);
  if (winner === aiMark) return 10 - depth;
  if (winner === playerMark) return depth - 10;
  if (isBoardFull(board)) return 0;

  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = aiMark;
        best = Math.max(best, minimax(board, depth + 1, false, aiMark, playerMark));
        board[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = playerMark;
        best = Math.min(best, minimax(board, depth + 1, true, aiMark, playerMark));
        board[i] = null;
      }
    }
    return best;
  }
}

/**
 * Finds the optimal move for the AI.
 * @param {Array<null|"X"|"O">} board
 * @param {number} aiTurn — 0 or 1
 * @returns {number} index [0-8]
 */
function getBestMove(board, aiTurn) {
  const aiMark = aiTurn === 0 ? 'X' : 'O';
  const playerMark = aiTurn === 0 ? 'O' : 'X';
  let bestVal = -Infinity;
  let move = -1;

  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = aiMark;
      const moveVal = minimax(board, 0, false, aiMark, playerMark);
      board[i] = null;
      if (moveVal > bestVal) {
        move = i;
        bestVal = moveVal;
      }
    }
  }
  return move;
}

/**
 * Executes a move for the AI.
 * @param {string} channelId
 * @param {import('discord.js').Client} client
 */
async function handleAIMove(channelId, client) {
  const game = games.get(channelId);
  if (!game || !game.active) return;

  // Small delay to simulate "thinking"
  await new Promise(resolve => setTimeout(resolve, 1200));

  // Re-fetch to ensure game state hasn't changed (e.g. timeout or manual end)
  const freshGame = games.get(channelId);
  if (!freshGame || !freshGame.active) return;

  const aiMove = getBestMove(freshGame.board, freshGame.turn);
  if (aiMove === -1) return;

  const mark = freshGame.turn === 0 ? 'X' : 'O';
  freshGame.board[aiMove] = mark;

  const winner = checkWinner(freshGame.board);
  const isDraw = !winner && isBoardFull(freshGame.board);

  let status = 'playing';
  let winnerId = null;
  let gifUrl = null;

  if (winner || isDraw) {
    freshGame.active = false;
    if (freshGame.timeout) clearTimeout(freshGame.timeout);
    games.delete(channelId);
    status = winner ? 'win' : 'draw';
    winnerId = winner ? freshGame.players[freshGame.turn] : null;

    // Fetch dynamic GIF from nekos.best for winner
    if (status === 'win') {
      try {
        const categories = ['smug', 'happy', 'laugh', 'dance'];
        const cat = categories[Math.floor(Math.random() * categories.length)];
        const res = await fetch(`https://nekos.best/api/v2/${cat}`);
        const data = await res.json();
        gifUrl = data?.results?.[0]?.url;
      } catch {}
    }
  } else {
    freshGame.turn = freshGame.turn === 0 ? 1 : 0;
    setGameTimeout(channelId, client);
  }

  // Update the message
  try {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    const message = freshGame.messageId 
      ? await channel.messages.fetch(freshGame.messageId).catch(() => null)
      : null;

    if (message && message.editable) {
      await message.edit({
        embeds: [buildEmbed(freshGame, status, winnerId, gifUrl)],
        components: buildGrid(channelId, freshGame.board, !freshGame.active)
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[TicTacToe] AI update error:', err.message);
  }
}

/**
 * Handle game expiration after 5 minutes of inactivity.
 * @param {string} channelId
 * @param {import('discord.js').Client} client
 */
async function setGameTimeout(channelId, client) {
  const game = games.get(channelId);
  if (!game) return;

  // Clear existing timeout if any
  if (game.timeout) clearTimeout(game.timeout);

  // Set new timeout for 5 minutes
  game.timeout = setTimeout(async () => {
    const freshGame = games.get(channelId);
    if (!freshGame || !freshGame.active) return;

    freshGame.active = false;
    games.delete(channelId);

    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) return;

      const message = freshGame.messageId 
        ? await channel.messages.fetch(freshGame.messageId).catch(() => null)
        : null;

      const timeoutEmbed = buildEmbed(freshGame, 'timedout');
      const disabledGrid = buildGrid(channelId, freshGame.board, true);

      if (message && message.editable) {
        await message.edit({
          content: '⏰ **Game Timed Out**',
          embeds: [timeoutEmbed],
          components: disabledGrid
        }).catch(() => {});
      }
    } catch (err) {
      console.error('[TicTacToe] Timeout cleanup error:', err.message);
    }
  }, 5 * 60 * 1000); // 5 minutes
}

/* ══════════════════════════════════════════════════════════════════════════
 *  PUBLIC: startGame
 *  Called by the slash command handler to kick off a new session.
 * ══════════════════════════════════════════════════════════════════════════ */
/**
 * @param {object} ctx — The command context (slash or prefix)
 * @param {import('discord.js').User} opponent   — Player 2 (O)
 */
async function startGame(ctx, opponent) {
  const channelId = ctx.channel.id;

  // ── Concurrency guard ──────────────────────────────────────────────────
  if (games.has(channelId)) {
    return ctx.reply({
      content: '❌ A game is already running in this channel. Finish it first!',
      flags: MessageFlags.Ephemeral
    });
  }

  // ── Initialise state ───────────────────────────────────────────────────
  /** @type {object} */
  const game = {
    players : [ctx.user.id, opponent.id], // [0]=X, [1]=O
    turn    : 0,
    board   : Array(9).fill(null),
    active  : true,
    timeout : null,
    messageId : null
  };

  games.set(channelId, game);
  setGameTimeout(channelId, ctx.client);

  // ── Send initial board ─────────────────────────────────────────────────
  try {
    const msg = await ctx.reply({
      embeds     : [buildEmbed(game, 'playing')],
      components : buildGrid(channelId, game.board),
      fetchReply : true
    });
    if (msg) game.messageId = msg.id;

    // ── Trigger AI Move if it's the bot's turn (e.g. if bot starts first) ──
    if (game.active && game.players[game.turn] === ctx.client.user.id) {
      handleAIMove(channelId, ctx.client);
    }
  } catch (err) {
    // If the initial reply fails, clean up so the channel isn't stuck
    games.delete(channelId);
    console.error('[TicTacToe] Failed to send game board:', err.message);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
 *  PUBLIC: default export — registers the button interaction listener
 *  Called from plugins/games/index.js during plugin boot.
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * Attach the TicTacToe button handler to the Discord client.
 * @param {import('discord.js').Client} client
 */
function registerHandler(client) {
  client.on('interactionCreate', async (interaction) => {
    // Only handle TicTacToe buttons
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith(BTN_PREFIX)) return;

    // ── Parse customId: ttt_<channelId>_<cellIndex> ──────────────────────
    // customId example: "ttt_123456789012345678_4"
    // We split from the right so channelId (which may contain underscores in
    // future-proofed scenarios) is never accidentally truncated.
    const raw   = interaction.customId.slice(BTN_PREFIX.length); // "<channelId>_<index>"
    const lastUnderscore = raw.lastIndexOf('_');

    if (lastUnderscore === -1) return; // malformed — ignore

    const channelId = raw.slice(0, lastUnderscore);
    const cellIndex = parseInt(raw.slice(lastUnderscore + 1), 10);

    if (isNaN(cellIndex) || cellIndex < 0 || cellIndex > 8) return;

    // ── Look up game state ────────────────────────────────────────────────
    const game = games.get(channelId);

    // No game found (e.g. bot restarted, or orphaned button)
    if (!game) {
      return interaction.reply({
        content: '❌ This game session no longer exists. Start a new one with `/tictactoe`!',
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }

    // Game already finished (should not happen — buttons are disabled — but
    // handled defensively in case of race conditions)
    if (!game.active) {
      return interaction.reply({
        content: '❌ This game has already ended.',
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }

    // ── Validate player turn ──────────────────────────────────────────────
    const currentPlayerId = game.players[game.turn];

    if (interaction.user.id !== currentPlayerId) {
      const symbol = SYMBOLS[game.turn];
      return interaction.reply({
        content: `⏳ It's not your turn! Waiting for ${symbol} <@${currentPlayerId}>.`,
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }

    // ── Validate cell availability ────────────────────────────────────────
    // (Buttons are disabled client-side too, but we guard server-side as well)
    if (game.board[cellIndex] !== null) {
      return interaction.reply({
        content: '❌ That cell is already taken! Pick an empty one.',
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }

    // ── Apply move ────────────────────────────────────────────────────────
    const mark   = game.turn === 0 ? 'X' : 'O';
    game.board[cellIndex] = mark;

    // ── Check for win ─────────────────────────────────────────────────────
    const winner = checkWinner(game.board);

    if (winner) {
      // Determine the winning user ID
      const winnerId = game.players[game.turn]; // the player who just moved

      game.active = false;
      if (game.timeout) clearTimeout(game.timeout);
      games.delete(channelId); // clean up after game ends

      // Fetch dynamic GIF from nekos.best for winner
      let gifUrl = null;
      try {
        const categories = ['smug', 'happy', 'laugh', 'dance'];
        const cat = categories[Math.floor(Math.random() * categories.length)];
        const res = await fetch(`https://nekos.best/api/v2/${cat}`);
        const data = await res.json();
        gifUrl = data?.results?.[0]?.url;
      } catch {}

      // Record result (PvP only)
      recordResult(game.players, winnerId, interaction.client);

      return interaction.update({
        embeds     : [buildEmbed(game, 'win', winnerId, gifUrl)],
        components : buildGrid(channelId, game.board, true) // all disabled
      }).catch(err => {
        if (err?.code !== 10062) console.error('[TicTacToe] Update error (win):', err.message);
      });
    }

    // ── Check for draw ────────────────────────────────────────────────────
    if (isBoardFull(game.board)) {
      game.active = false;
      if (game.timeout) clearTimeout(game.timeout);
      games.delete(channelId);

      // Record result (PvP only)
      recordResult(game.players, null, interaction.client);

      return interaction.update({
        embeds     : [buildEmbed(game, 'draw')],
        components : buildGrid(channelId, game.board, true)
      }).catch(err => {
        if (err?.code !== 10062) console.error('[TicTacToe] Update error (draw):', err.message);
      });
    }

    // ── Advance turn ──────────────────────────────────────────────────────
    game.turn = game.turn === 0 ? 1 : 0;

    // ── Refresh Timeout ───────────────────────────────────────────────────
    setGameTimeout(channelId, interaction.client);

    // ── Update board message ──────────────────────────────────────────────
    await interaction.update({
      embeds     : [buildEmbed(game, 'playing')],
      components : buildGrid(channelId, game.board)
    }).catch(err => {
      if (err?.code !== 10062) console.error('[TicTacToe] Update error (move):', err.message);
    });

    // ── Trigger AI Move if it's the bot's turn ──────────────────────────────
    if (game.active && game.players[game.turn] === interaction.client.user.id) {
      handleAIMove(channelId, interaction.client);
    }
  });
}

/* ══════════════════════════════════════════════════════════════════════════
 *  EXPORTS
 * ══════════════════════════════════════════════════════════════════════════ */

module.exports              = registerHandler; // default: call to attach listener
module.exports.startGame    = startGame;       // used by the slash command
module.exports.games        = games;           // exposed for testing / inspection
