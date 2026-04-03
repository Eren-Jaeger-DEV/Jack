const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fosterService = require('../services/fosterService');
const FosterProgram = require('../models/FosterProgram');
const Player = require('../../../bot/database/models/Player');

module.exports = {
  name: 'fs-pairremove',
  category: 'foster-program',
  description: 'Remove a pair from the active Foster Program',
  aliases: ['pairremove', 'foster-pairremove', 'removepair'],
  usage: 'j pairremove',

  data: new SlashCommandBuilder()
    .setName('fs-pairremove')
    .setDescription('Remove a pair from the active Foster Program')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {
    try {
      if (!ctx.isInteraction && !ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return ctx.reply('❌ **Jack:** Admin-only command, noob.');
      }

      await ctx.reply('⚡ **Jack:** Fetching active pairs...');

      const guild = ctx.guild;
      const program = await fosterService.getActiveProgram(guild.id);

      if (!program) {
        return ctx.reply('❌ No active Foster Program found.');
      }

      if (program.status !== 'ACTIVE') {
        return ctx.reply(`❌ The Foster Program is currently in **${program.status}** status.`);
      }

      if (!program.pairs || program.pairs.length === 0) {
        return ctx.reply('❌ No ongoing pairs found in the active program.');
      }

      await guild.members.fetch().catch(() => {});

      const pairOptions = [];
      for (let i = 0; i < program.pairs.length; i++) {
        const pair = program.pairs[i];
        
        const mMember = guild.members.cache.get(pair.mentorId);
        const pMember = guild.members.cache.get(pair.partnerId);

        const mPlayer = await Player.findOne({ discordId: pair.mentorId });
        const pPlayer = await Player.findOne({ discordId: pair.partnerId });

        const mName = mPlayer?.ign || mMember?.displayName || 'Unknown Mentor';
        const pName = pPlayer?.ign || pMember?.displayName || 'Unknown Newbie';

        pairOptions.push({
          label: `${mName} & ${pName}`,
          description: `Mentor: ${mName} | Newbie: ${pName}`,
          value: i.toString()
        });
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('fs-pairremove-select')
        .setPlaceholder('Select a pair to remove')
        .addOptions(pairOptions);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const msg = await ctx.reply({
        content: 'Select a pair to completely remove from the current Foster Program:',
        components: [row],
        fetchReply: true
      });

      // We need `msg` to be a Discord Message for the collector to work
      const messageObj = msg;

      const authorId = ctx.isInteraction ? ctx.interaction.user.id : ctx.message.author.id;
      const filter = i => i.customId === 'fs-pairremove-select' && i.user.id === authorId;
      const collector = messageObj.createMessageComponentCollector({ filter, time: 60000 });

      collector.on('collect', async interaction => {
        try {
          const pairIndex = parseInt(interaction.values[0], 10);
          
          // Re-fetch the program to ensure we have the latest state
          const currentProgram = await fosterService.getActiveProgram(guild.id);
          if (!currentProgram || currentProgram.status !== 'ACTIVE') {
            await interaction.update({ content: '❌ The Foster Program is no longer active.', components: [] });
            return;
          }

          if (pairIndex < 0 || pairIndex >= currentProgram.pairs.length) {
            await interaction.update({ content: '❌ Invalid pair selected.', components: [] });
            return;
          }

          const pairToRemove = currentProgram.pairs[pairIndex];
          const mentorId = pairToRemove.mentorId;
          const neophyteId = pairToRemove.partnerId;

          // Remove roles
          const mentorMember = guild.members.cache.get(mentorId);
          if (mentorMember) {
            await mentorMember.roles.remove(fosterService.ROLES.ADEPT).catch(() => {});
          }

          const newbieMember = guild.members.cache.get(neophyteId);
          if (newbieMember) {
            await newbieMember.roles.remove(fosterService.ROLES.NEOPHYTE).catch(() => {});
          }

          // Clean up program object
          currentProgram.pairs.splice(pairIndex, 1);
          
          currentProgram.mentorPoints.delete(mentorId);
          currentProgram.newbiePoints.delete(neophyteId);

          // Clean up any pending submissions from either user
          currentProgram.pendingSubmissions = currentProgram.pendingSubmissions.filter(
            s => s.userId !== mentorId && s.userId !== neophyteId
          );

          // Remove them from submittedThisCycle
          currentProgram.submittedThisCycle = currentProgram.submittedThisCycle.filter(
            id => id !== mentorId && id !== neophyteId
          );

          // Need to shift pairIndex for submissions that come after the deleted pair?
          // Actually, our pendingSubmissions rely on `pairIndex`. If we shift the array, all indices after `pairIndex` are now shifted by -1.
          currentProgram.pendingSubmissions.forEach(sub => {
            if (sub.pairIndex > pairIndex) {
              sub.pairIndex -= 1;
            }
          });

          currentProgram.markModified('pairs');
          currentProgram.markModified('mentorPoints');
          currentProgram.markModified('newbiePoints');
          currentProgram.markModified('pendingSubmissions');
          currentProgram.markModified('submittedThisCycle');
          await currentProgram.save();

          await interaction.update({ content: '✅ Pair removed successfully. Refreshing pairing board and leaderboard...', components: [] });

          // Refresh the board and leaderboards
          await fosterService.postOrientation(ctx.client, currentProgram);
          await fosterService.refreshLeaderboard(ctx.client, currentProgram);

          collector.stop('removed');
        } catch (err) {
          console.error('[FosterProgram] fs-pairremove interaction error:', err);
          if (!interaction.replied && !interaction.deferred) {
             await interaction.update({ content: '❌ Something went wrong during removal.', components: [] });
          }
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          messageObj.edit({ content: '❌ Selection timed out.', components: [] }).catch(() => {});
        }
      });

    } catch (err) {
      console.error('[FosterProgram] fs-pairremove error:', err);
      if (ctx.reply) {
        await ctx.reply('❌ Something went wrong.');
      }
    }
  }
};
