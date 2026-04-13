const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const perms = require('../../../bot/utils/permissionUtils');
const fosterService = require('../services/fosterService');
const FosterProgram = require('../models/FosterProgram');

module.exports = {
  name: 'fs-replace',
  category: 'foster-program',
  description: 'Replace a mentor or newbie in an active Foster Program pair',
  aliases: ['fosterreplace', 'foster-replace'],
  usage: 'j fs-replace <mentor|newbie> @oldUser @newUser',

  data: new SlashCommandBuilder()
    .setName('fs-replace')
    .setDescription('Replace a mentor or newbie in an active Foster Program pair')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt =>
      opt.setName('role')
        .setDescription('Which role to replace: mentor or newbie')
        .setRequired(true)
        .addChoices(
          { name: 'Mentor (Adept)', value: 'mentor' },
          { name: 'Newbie (Neophyte)', value: 'newbie' }
        )
    )
    .addUserOption(opt =>
      opt.setName('old_user')
        .setDescription('The current participant to remove')
        .setRequired(true)
    )
    .addUserOption(opt =>
      opt.setName('new_user')
        .setDescription('The replacement participant to add')
        .setRequired(true)
    ),

  async run(ctx) {
    try {
      if (!perms.isManagement(ctx.member)) {
        return ctx.reply('❌ **Jack:** Strategic reassignment is restricted to command personnel only.');
      }

      /* ── Parse arguments ── */
      let role, oldUser, newUser;

      if (ctx.isInteraction) {
        role    = ctx.interaction.options.getString('role');
        oldUser = ctx.interaction.options.getUser('old_user');
        newUser = ctx.interaction.options.getUser('new_user');
      } else {
        // Prefix: j fs-replace mentor @old @new
        const args = ctx.args || [];
        role = args[0]?.toLowerCase();

        if (!['mentor', 'newbie'].includes(role)) {
          return ctx.reply('❌ **Usage:** `j fs-replace <mentor|newbie> @oldUser @newUser`');
        }

        const mentions = [...ctx.message.mentions.users.values()];
        if (mentions.length < 2) {
          return ctx.reply('❌ You must mention both **@oldUser** and **@newUser**.');
        }
        oldUser = mentions[0];
        newUser = mentions[1];
      }

      if (!role || !oldUser || !newUser) {
        return ctx.reply('❌ **Usage:** `/fs-replace <mentor|newbie> @oldUser @newUser`');
      }

      if (oldUser.id === newUser.id) {
        return ctx.reply('❌ The old and new user cannot be the same person.');
      }

      await ctx.reply('⚡ **Jack:** Processing replacement...');

      /* ── Fetch active program ── */
      const program = await fosterService.getActiveProgram(ctx.guild.id);
      if (!program) {
        return ctx.reply('❌ No active Foster Program found.');
      }
      if (program.status !== 'ACTIVE') {
        return ctx.reply(`❌ The Foster Program is currently in **${program.status}** status. Replacement only works during an active program.`);
      }

      const oldId = oldUser.id;
      const newId = newUser.id;
      const isMentor = role === 'mentor';

      /* ── Find the pair containing oldUser ── */
      const pairIdx = program.pairs.findIndex(p =>
        isMentor ? p.mentorId === oldId : p.partnerId === oldId
      );

      if (pairIdx === -1) {
        return ctx.reply(`❌ **${oldUser.username}** is not found as a ${role} in any active pair.`);
      }

      /* ── Ensure newUser isn't already in a pair ── */
      const alreadyIn = program.pairs.some(p => p.mentorId === newId || p.partnerId === newId);
      if (alreadyIn) {
        return ctx.reply(`❌ **${newUser.username}** is already participating in an active pair.`);
      }

      /* ── Perform the swap ── */
      const pair = program.pairs[pairIdx];

      if (isMentor) {
        // Transfer any accumulated points to new mentor
        const oldPoints = program.mentorPoints.get(oldId) || 0;
        program.mentorPoints.delete(oldId);
        program.mentorPoints.set(newId, oldPoints);
        pair.mentorId = newId;
      } else {
        // Transfer any accumulated points to new newbie
        const oldPoints = program.newbiePoints.get(oldId) || 0;
        program.newbiePoints.delete(oldId);
        program.newbiePoints.set(newId, oldPoints);
        pair.partnerId = newId;
      }

      /* ── Clean up any pending submissions from old user in this pair ── */
      program.pendingSubmissions = program.pendingSubmissions.filter(
        s => !(s.pairIndex === pairIdx && s.userId === oldId)
      );

      /* ── Remove old user from submittedThisCycle if present ── */
      program.submittedThisCycle = program.submittedThisCycle.filter(id => id !== oldId);

      program.markModified('mentorPoints');
      program.markModified('newbiePoints');
      program.markModified('pairs');
      program.markModified('pendingSubmissions');
      program.markModified('submittedThisCycle');
      await program.save();

      /* ── Update Discord roles ── */
      const guild = ctx.guild;
      await guild.members.fetch().catch(() => {});

      // Remove roles from old user
      const oldMember = guild.members.cache.get(oldId);
      if (oldMember) {
        const roleToRemove = isMentor ? fosterService.ROLES.ADEPT : fosterService.ROLES.NEOPHYTE;
        await oldMember.roles.remove(roleToRemove).catch(() => {});
      }

      // Add roles to new user
      const newMember = guild.members.cache.get(newId);
      if (newMember) {
        const roleToAdd = isMentor ? fosterService.ROLES.ADEPT : fosterService.ROLES.NEOPHYTE;
        await newMember.roles.add(roleToAdd).catch(() => {});
        if (!isMentor) {
          // Also remove NEWCOMER role from the newbie replacement
          await newMember.roles.remove(fosterService.ROLES.NEWCOMER).catch(() => {});
        }
      }

      /* ── Re-post pairing board + refresh leaderboard ── */
      await fosterService.postOrientation(ctx.client, program);
      await fosterService.refreshLeaderboard(ctx.client, program);

      await ctx.reply(
        `✅ **Replacement complete!**\n` +
        `> 🔄 **${oldUser.username}** → **${newUser.username}** (as ${role})\n` +
        `> 🃏 Pairing board and leaderboard have been refreshed.`
      );

    } catch (err) {
      console.error('[FosterProgram] fs-replace error:', err);
      await ctx.reply('❌ Something went wrong during the replacement.');
    }
  }
};
