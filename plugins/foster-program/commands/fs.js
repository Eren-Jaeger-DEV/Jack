/**
 * fs.js — Foster Synergy Point Submission
 *
 * 2-Step Flow (mirrors Player Profile system):
 *  Step 1 → /fs submit <type> <points>  (or: j fs submit <type> <points>)
 *  Step 2 → Jack prompts user to drop screenshot in thread; waits 3 min for attachment.
 */

const {
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');

const fosterService  = require('../services/fosterService');
const configManager  = require('../../../bot/utils/configManager');

// In-memory map: userId → { type, points, channelId, timestamp }
const pendingScreenshots = new Map();
const SCREENSHOT_WAIT_MS = 3 * 60 * 1000; // 3 minutes

module.exports = {
  name: 'fs',
  category: 'foster-program',
  description: 'Submit foster synergy points — Jack will ask for the screenshot separately',
  usage: '/fs submit <initial/final> <points>   |   j fs submit <initial/final> <points>',
  aliases: ['fstats'],

  data: new SlashCommandBuilder()
    .setName('fs')
    .setDescription('Foster synergy point submission')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
    .addSubcommand(sub =>
      sub.setName('submit')
        .setDescription('Submit your Team-up points for this cycle')
        .addStringOption(o =>
          o.setName('type')
            .setDescription('Initial (Day 1 baseline) or Final (Day 5 result)')
            .setRequired(true)
            .addChoices(
              { name: 'Initial (Day 1)', value: 'initial' },
              { name: 'Final (Day 5)',   value: 'final'   }
            )
        )
        .addIntegerOption(o =>
          o.setName('points')
            .setDescription('The "Team-up points earned" number from your All Data card')
            .setRequired(true)
            .setMinValue(0)
        )
    ),

  /* ────────────────────────────────────────────── */
  /*  Expose the pending map so the message handler */
  /*  in the plugin index can resolve screenshots.  */
  /* ────────────────────────────────────────────── */
  pendingScreenshots,

  async run(ctx) {
    try {
      const user  = ctx.user;
      const guild = ctx.guild;

      /* ── Parse subcommand & args ── */
      let type, points;

      if (ctx.isInteraction) {
        const sub = ctx.options.getSubcommand(false);
        if (sub !== 'submit') {
          return ctx.reply({ content: '❌ Use `/fs submit`', ephemeral: true });
        }
        type   = ctx.options.getString('type');
        points = ctx.options.getInteger('points');
      } else {
        // Prefix: j fs submit <type> <points>
        //         j fstats submit <type> <points>
        const args = ctx.args || [];
        const sub  = args[0]?.toLowerCase();
        if (sub !== 'submit') {
          return ctx.reply('❌ Usage: `j fs submit <initial/final> <points>`');
        }
        type   = args[1]?.toLowerCase();
        points = parseInt(args[2], 10);
        if (!['initial', 'final'].includes(type) || isNaN(points)) {
          return ctx.reply('❌ Usage: `j fs submit <initial/final> <points>`');
        }
      }

      /* ── Program guard ── */
      const program = await fosterService.getActiveProgram(guild.id);
      if (!program || program.status !== 'ACTIVE') {
        return ctx.reply({ content: '❌ **Jack:** No active foster program right now.', ephemeral: true });
      }

      /* ── Verify this user is a participant ── */
      const pix = program.pairs.findIndex(p => p.mentorId === user.id || p.partnerId === user.id);
      if (pix === -1) {
        return ctx.reply({ content: '❌ **Jack:** You are not in an active pair.', ephemeral: true });
      }

      /* ── Step 1 acknowledgement ── */
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('📸 Screenshot Required')
        .setDescription(
          `Got it <@${user.id}>!\n\n` +
          `**Type:** \`${type === 'initial' ? 'Initial (Day 1)' : 'Final (Day 5)'}\`\n` +
          `**Team-up Points:** \`${points}\`\n\n` +
          `Now **drop your "All Data" stats card screenshot** in this thread.\n` +
          `Jack will capture and verify it.\n\n` +
          `⏱️ You have **3 minutes** to send the screenshot.`
        )
        .setFooter({ text: 'Make sure the "Team-up points earned" is clearly visible.' })
        .setTimestamp();

      // Reply publicly so the user knows exactly where to upload the screenshot (Bug 5 fix)
      await ctx.reply({ embeds: [embed], ephemeral: false });

      /* ── Register pending screenshot state ── */
      // Resolve channelId reliably for both slash and prefix (Bug 6 fix)
      const channelId = ctx.channel?.id ?? ctx.message?.channel?.id;
      if (!channelId) {
        console.warn('[FosterProgram] Could not resolve channelId for user', user.id);
        return;
      }

      pendingScreenshots.set(user.id, {
        type,
        points,
        channelId,
        guildId:   guild.id,
        pairIndex: pix,
        timestamp: Date.now()
      });

      // Auto-expire after SCREENSHOT_WAIT_MS
      setTimeout(() => {
        const entry = pendingScreenshots.get(user.id);
        if (entry && Date.now() - entry.timestamp >= SCREENSHOT_WAIT_MS - 5000) {
          pendingScreenshots.delete(user.id);
        }
      }, SCREENSHOT_WAIT_MS);

    } catch (err) {
      console.error('[FosterProgram] fs command error:', err);
      await ctx.reply({ content: '❌ **Jack:** Something went wrong.', ephemeral: true }).catch(() => {});
    }
  }
};
