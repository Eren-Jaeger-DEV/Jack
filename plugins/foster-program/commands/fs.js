/**
 * fs.js — Foster Synergy Point Submission
 *
 * Hybrid: /fs <points> or j fs <points>
 * Must include a screenshot attachment.
 * Both pair members must submit same value within 10 minutes.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fosterService = require('../services/fosterService');
const configManager = require('../../../bot/utils/configManager');


module.exports = {
  name: 'fs',
  category: 'foster-program',
  description: 'Submit foster synergy points with screenshot',
  aliases: ['fostersynergy'],
  usage: '/fs <points>  |  j fs <points> (with screenshot)',
  details: 'Submit points for your foster pair. Both members must submit the same value with a screenshot within 10 minutes.',

  data: new SlashCommandBuilder()
    .setName('fs')
    .setDescription('Submit foster synergy points')
    .addIntegerOption(o =>
      o.setName('points')
        .setDescription('Synergy points to submit')
        .setRequired(true)
        .setMinValue(1)
    ),

  async run(ctx) {
    try {
      const isEphemeral = ctx.isInteraction;

      // Parse points (Now Optional)
      let pointsInput;
      if (ctx.isInteraction) {
        pointsInput = ctx.options.getInteger('points');
      } else {
        pointsInput = parseInt(ctx.args?.[0]);
      }

      // Screenshot check
      let screenshotUrl = null;
      if (ctx.isInteraction) {
        screenshotUrl = 'slash-command-submission'; // Slash commands have an attachment option, but for now we fallback
      } else {
        const attachment = ctx.message?.attachments?.first();
        if (!attachment) {
          return ctx.reply({ content: '❌ **Jack:** You must attach a screenshot with your submission, noob.', ephemeral: isEphemeral });
        }
        screenshotUrl = attachment.url;
      }

      let finalPoints = pointsInput;

      // AI VISION VERIFICATION
      if (screenshotUrl && screenshotUrl !== 'slash-command-submission') {
        const statusMsg = await ctx.reply({ content: '📸 **Jack is verifying your synergy screenshot...**', ephemeral: isEphemeral });
        
        const aiPoints = await aiService.extractSynergyPoints(screenshotUrl);
        
        if (aiPoints === 0) {
          if (!finalPoints || isNaN(finalPoints)) {
             return ctx.editReply({ content: '❌ **Jack:** I couldn\'t find any synergy points in that image and you didn\'t provide any. Provide valid points or a clearer screenshot.' });
          }
          // If user provided points but AI failed, we can either trust user or reject.
          // For now, let's trust if user input exists but warn.
          await ctx.editReply({ content: '⚠️ **Jack:** I couldn\'t read the points from the image, but I\'ll trust your input for now...' });
        } else {
          // If user didn't provide points, use the AI points!
          if (!finalPoints || isNaN(finalPoints)) {
            finalPoints = aiPoints;
            await ctx.editReply({ content: `✅ **Jack:** Detected **${aiPoints}** points from your screenshot. Processing...` });
          } else {
            // Both provided - Verify!
            if (Math.abs(aiPoints - finalPoints) > 5) {
              return ctx.editReply({ content: `❌ **Jack:** That screenshot shows **${aiPoints}** points, but you claimed **${finalPoints}**. Don't try to lie to me.` });
            }
            await ctx.editReply({ content: `✅ **Jack:** Screenshot verified (**${aiPoints}** points detected). Processing...` });
          }
        }
      }

      if (isNaN(finalPoints) || finalPoints <= 0) {
        return ctx.reply({ content: '❌ **Jack:** I need a number of points to record. Either type them or upload a clearer screenshot.', ephemeral: isEphemeral });
      }

      const points = finalPoints;

      // Clan member check
      const config = await configManager.getGuildConfig(ctx.guild.id);
      const clanMemberRoleId = config?.settings?.clanMemberRoleId;

      if (clanMemberRoleId && !ctx.member.roles.cache.has(clanMemberRoleId)) {
        return ctx.reply({ content: '❌ You must be a clan member to participate.', ephemeral: isEphemeral });
      }

      // Active program check
      const program = await fosterService.getActiveProgram(ctx.guild.id);
      if (!program) {
        return ctx.reply({ content: '❌ No active foster program.', ephemeral: isEphemeral });
      }

      // PATCH 6: Check for duplicate submission before processing
      const pairIndex = program.pairs.findIndex(
        p => p.mentorId === ctx.user.id || p.partnerId === ctx.user.id
      );
      if (pairIndex >= 0) {
        const existingSub = program.pendingSubmissions.find(
          s => s.userId === ctx.user.id && s.pairIndex === pairIndex
        );
        if (existingSub) {
          return ctx.reply({ content: '❌ You have already submitted for this cycle. Wait for your partner.', ephemeral: isEphemeral });
        }
      }

      // Submit
      const result = await fosterService.submitPoints(ctx.user.id, points, screenshotUrl, program);

      if (!result.success) {
        return ctx.reply({ content: `❌ ${result.error}`, ephemeral: isEphemeral });
      }

      if (result.matched) {
        await ctx.reply({
          content: `✅ **${result.points}** foster points awarded to your pair! Both submissions matched.`,
          ephemeral: isEphemeral
        });

        // Refresh leaderboard
        const freshProgram = await fosterService.getActiveProgram(ctx.guild.id);
        if (freshProgram) {
          await fosterService.refreshLeaderboard(ctx.client, freshProgram);
        }
      } else {
        await ctx.reply({
          content: `⏳ Your submission of **${points}** points is recorded. Waiting for your partner (<@${result.waitingFor}>) to submit the same value within 10 minutes.`,
          ephemeral: isEphemeral
        });
      }

    } catch (err) {
      console.error('[FosterProgram] fs command error:', err);
      await ctx.reply({ content: '❌ Something went wrong.', ephemeral: true }).catch(() => {});
    }
  }
};
