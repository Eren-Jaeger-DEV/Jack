/**
 * plugins/games/index.js
 * 
 * Entry point for the Games plugin.
 * Wires up interaction handlers for TicTacToe and other mini-games.
 */

const tictactoeHandler = require('./handlers/tictactoe');

module.exports = {
  load: async (client) => {
    // Register the TicTacToe button interaction listener
    tictactoeHandler(client);
    
    console.log('[Games] TicTacToe interaction handler registered.');
  }
};
