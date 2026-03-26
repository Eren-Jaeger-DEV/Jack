/**
 * plugins/games/index.js — Games Plugin Entry Point
 *
 * This is the main loader for the games plugin.
 * It boots all game-specific interaction handlers so they
 * can self-manage their own state without polluting the
 * global interactionCreate event file.
 *
 * To add a new game:
 *  1. Create plugins/games/commands/<game>.js  (slash command)
 *  2. Register its button handler here via require('./handlers/<game>')
 */

const tictactoeHandler = require('./handlers/tictactoe');

module.exports = {
  name: 'games',

  load(client) {
    // Register all game button interaction handlers
    tictactoeHandler(client);
  }
};
