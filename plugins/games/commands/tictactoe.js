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
  usage: '/tictactoe [user]  |  j tictactoe [user]',
  details: 'Starts a TicTacToe match. If a user is specified, it challenges them. If not, you play against an intelligent AI.',

  data: new SlashCommandBuilder()
    .setName('tictactoe')
    .setDescription('Challenge someone to a game of TicTacToe!')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Optional: The opponent (leave empty to play vs AI)')
        .setRequired(false)
    ),

  async run(ctx) {
    let opponent;

    if (ctx.type === 'slash') {
      opponent = ctx.options.getUser('user');
    } else {
      // Prefix support
      opponent = ctx.message.mentions.users.first();
      
      // If no mention, try to resolve from ID/mention in first argument
      if (!opponent && ctx.args[0]) {
        try {
          const id = ctx.args[0].replace(/[<@!>]/g, '');
          opponent = await ctx.client.users.fetch(id).catch(() => null);
        } catch {
          opponent = null;
        }
      }
    }

    // Default to bot if no opponent provided (Single Player)
    if (!opponent) {
      opponent = ctx.client.user;
    }

    const challenger = ctx.user;

    // ── Validation ──────────────────────────────────────────────────────────

    // Prevent self-challenge (non-bot)
    if (opponent.id === challenger.id) {
      return ctx.reply({
        content: '❌ You cannot challenge yourself!',
        flags: MessageFlags.Ephemeral
      });
    }

    // Bots cannot play (unless it is THIS bot for single player)
    if (opponent.bot && opponent.id !== ctx.client.user.id) {
      return ctx.reply({
        content: `❌ You cannot challenge other bots! Challenge a human or play vs me by leaving the user field empty.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // Delegate game creation to the shared handler (which owns the state Map)
    await startGame(ctx, opponent);
  }
};
