/**
 * fs.js — Foster Synergy Point Submission
 * 
 * Users must submit their "Team-up points earned" from the All Data card.
 * /fs submit <type> <points> <screenshot>
 */

const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const fosterService = require('../services/fosterService');
const configManager = require('../../../bot/utils/configManager');

module.exports = {
  name: 'fs',
  category: 'foster-program',
  description: 'Submit foster synergy points with screenshot verification',
  usage: '/fs submit <initial/final> <points> (with screenshot attached)',
  
  data: new SlashCommandBuilder()
    .setName('fs')
    .setDescription('Submit foster synergy points')
    .addSubcommand(sub => 
      sub.setName('submit')
        .setDescription('Submit your stats card for verification')
        .addStringOption(o => 
          o.setName('type')
            .setDescription('Submission type: Initial (Baseline) or Final (End of Cycle)')
            .setRequired(true)
            .addChoices(
              { name: 'Initial (Day 1)', value: 'initial' },
              { name: 'Final (Day 5)', value: 'final' }
            )
        )
        .addIntegerOption(o => 
          o.setName('points')
            .setDescription('The "Team-up points earned" value from your card')
            .setRequired(true)
            .setMinValue(0)
        )
        .addAttachmentOption(o => 
          o.setName('screenshot')
            .setDescription('Screenshot of your "All Data" stats card')
            .setRequired(true)
        )
    ),

  async run(ctx) {
    try {
      const isInteraction = ctx.isInteraction;
      const guild = ctx.guild;
      const user = ctx.user;

      // 1. Parse Inputs
      let type, points, screenshotUrl;

      if (isInteraction) {
        type = ctx.options.getString('type');
        points = ctx.options.getInteger('points');
        const attachment = ctx.options.getAttachment('screenshot');
        screenshotUrl = attachment?.url;
      } else {
        // Prefix command support (j fs submit <type> <points>)
        const sub = ctx.args?.[0]?.toLowerCase();
        if (sub !== 'submit') return ctx.reply('❌ **Jack:** Use `/fs submit` or `j fs submit`.');
        
        type = ctx.args?.[1]?.toLowerCase();
        points = parseInt(ctx.args?.[2]);
        const attachment = ctx.message?.attachments?.first();
        screenshotUrl = attachment?.url;

        if (!['initial', 'final'].includes(type) || isNaN(points) || !screenshotUrl) {
          return ctx.reply('❌ **Jack:** Invalid usage. `j fs submit <initial/final> <points>` (attach screenshot).');
        }
      }

      // 2. Initial Checks
      const program = await fosterService.getActiveProgram(guild.id);
      if (!program || program.status !== 'ACTIVE') {
        return ctx.reply({ content: '❌ **Jack:** There is no active foster program running right now.', ephemeral: true });
      }

      // 3. Process via Service
      const result = await fosterService.submitSynergyCard(user.id, points, type, screenshotUrl, program);

      if (!result.success) {
        return ctx.reply({ content: `❌ **Jack:** ${result.error}`, ephemeral: true });
      }

      // 4. Respond
      if (result.matched) {
        const embed = new EmbedBuilder()
          .setTitle('✅ Synergy Verified!')
          .setColor('#00FFCC')
          .setTimestamp();

        if (type === 'initial') {
          embed.setDescription(`**Success!** Both partners have submitted their initial baseline of **${points}** points. \n\nJack will use this to calculate your growth on Day 5.`);
        } else {
          embed.setDescription(`**Cycle Complete!** Both partners matched their final stats.\n\n` +
            `▫️ **Total Pair Points:** ${result.points}\n` +
            `▫️ **Your Individual Split (50%):** ${result.split}\n\n` +
            `The Global Rankings have been updated.`);
            
          // Refresh leaderboard in channel
          await fosterService.refreshLeaderboard(ctx.client, program);
        }

        return ctx.reply({ embeds: [embed] });
      } else {
        // Waiting for partner
        return ctx.reply({ 
          content: `⏳ **Jack:** Recorded your **${type}** submission of **${points}** points. \n\nWaiting for your partner (<@${result.waitingFor}>) to submit the same value with their screenshot within 15 minutes.`,
          ephemeral: false // Better for thread visibility
        });
      }

    } catch (err) {
      console.error('[FosterProgram] fs command error:', err);
      await ctx.reply({ content: '❌ **Jack:** Something went wrong during submission.', ephemeral: true }).catch(() => {});
    }
  }
};
