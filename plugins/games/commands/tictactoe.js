/**
 * plugins/games/commands/tictactoe.js
 *
 * Slash command: /tictactoe
 * Challenges another user to a TicTacToe game in the current channel.
 *
 * Game state is stored in a channel-keyed Map inside the shared
 * tictactoeHandler so the button handler and this command share state.
 */

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { startGame } = require('../handlers/tictactoe');

module.exports = {
  name: 'tictactoe',
  category: 'games',
  description: 'Challenge another user to a game of TicTacToe',
  usage: '/tictactoe <user>',
  details: 'Starts an interactive button-based TicTacToe match against a chosen opponent in this channel.',

  data: new SlashCommandBuilder()
    .setName('tictactoe')
    .setDescription('Challenge someone to a game of TicTacToe!')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The opponent you want to challenge')
        .setRequired(true)
    ),

  async run(ctx) {
    // Only slash invocations are supported (buttons require interaction IDs)
    if (ctx.type !== 'slash') return;

    const interaction = ctx.interaction;
    const challenger  = interaction.user;
    const opponent    = interaction.options.getUser('user');

    // ── Validation ──────────────────────────────────────────────────────────

    // Prevent self-challenge
    if (opponent.id === challenger.id) {
      return interaction.reply({
        content: '❌ You cannot challenge yourself!',
        flags: MessageFlags.Ephemeral
      });
    }

    // Bots cannot play
    if (opponent.bot) {
      return interaction.reply({
        content: '❌ You cannot challenge a bot!',
        flags: MessageFlags.Ephemeral
      });
    }

    // Delegate game creation to the shared handler (which owns the state Map)
    await startGame(interaction, challenger, opponent, ctx.client);
  }
};
