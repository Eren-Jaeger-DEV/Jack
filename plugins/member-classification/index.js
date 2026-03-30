/**
 * index.js — Member Classification Plugin Entry Point
 *
 * Responsibilities:
 *  1. Button handler — processes "Join Clan" / "Discord Member" clicks
 *  2. Startup scan — checks for expired Newbie timers on boot
 *  3. Periodic checker — every 60s, scans for newly expired timers
 */

const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const classificationService = require('./services/classificationService');
const { addLog } = require('../../utils/logger');

module.exports = {
  load(client) {
    // Startup logs moved to centralized logger

    /* ═══════════════════════════════════════════
     *  STARTUP SCAN — Check expired newbie timers
     * ═══════════════════════════════════════════ */
    setTimeout(async () => {
      try {
        addLog("Member System", "Newbie scan complete");
        await classificationService.checkExpiredNewbies(client);
      } catch (err) {
        console.error('[MemberClassification] Startup scan error:', err.message);
      }
    }, 5000); // Wait 5s after load for client to be ready

    /* ═══════════════════════════════════════════
     *  PERIODIC CHECKER — Every 60 seconds
     * ═══════════════════════════════════════════ */
    setInterval(async () => {
      try {
        await classificationService.checkExpiredNewbies(client);
      } catch (err) {
        // Silently ignore
      }
    }, 60 * 1000);
    
    /* ═══════════════════════════════════════════
     *  REMINDER CHECKER — Every 30 minutes
     * ═══════════════════════════════════════════ */
    setInterval(async () => {
      try {
        await classificationService.sendClassificationReminders(client);
      } catch (err) {
        // Silently ignore
      }
    }, 30 * 60 * 1000);

    /* ═══════════════════════════════════════════
     *  BUTTON HANDLER — Classification buttons
     * ═══════════════════════════════════════════ */
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;
      if (!interaction.customId.startsWith('classify_')) return;

      try {
        // Permission check — ManageGuild only
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.reply({ content: '❌ You are not allowed to use this.', flags: [MessageFlags.Ephemeral] });
        }

        const parts = interaction.customId.split('_');
        // classify_clan_<userId> or classify_discord_<userId>
        const type = parts[1]; // 'clan' or 'discord'
        const targetUserId = parts[2];

        if (!targetUserId) return;

        const guild = interaction.guild;

        // ── Join Clan ──
        if (type === 'clan') {
          const result = await classificationService.classifyAsClanMember(guild, targetUserId);

          if (!result.success) {
            return interaction.reply({ content: `❌ ${result.error}`, flags: [MessageFlags.Ephemeral] });
          }

          // Send welcome in same channel
          await interaction.channel.send(
            `Welcome to the clan, <@${targetUserId}> 🔥\nGet ready to participate in clan activities.`
          ).catch(() => {});

          // Disable buttons and update message
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`classify_clan_${targetUserId}_done`)
              .setLabel('Join Clan')
              .setStyle(ButtonStyle.Success)
              .setEmoji('⚔️')
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId(`classify_discord_${targetUserId}_done`)
              .setLabel('Discord Member')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('👋')
              .setDisabled(true)
          );

          await interaction.update({
            content: `✅ User <@${targetUserId}> classified as: **Clan Member**`,
            embeds: [],
            components: [disabledRow]
          });

          console.log(`[MemberClassification] ${interaction.user.tag} classified ${targetUserId} as Clan Member`);
        }

        // ── Discord Member ──
        if (type === 'discord') {
          const result = await classificationService.classifyAsDiscordMember(guild, targetUserId);

          if (!result.success) {
            return interaction.reply({ content: `❌ ${result.error}`, flags: [MessageFlags.Ephemeral] });
          }

          await interaction.channel.send(
            `Welcome to the server, <@${targetUserId}>\nEnjoy your stay.`
          ).catch(() => {});

          // Disable buttons and update message
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`classify_clan_${targetUserId}_done`)
              .setLabel('Join Clan')
              .setStyle(ButtonStyle.Success)
              .setEmoji('⚔️')
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId(`classify_discord_${targetUserId}_done`)
              .setLabel('Discord Member')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('👋')
              .setDisabled(true)
          );

          await interaction.update({
            content: `✅ User <@${targetUserId}> classified as: **Discord Member**`,
            embeds: [],
            components: [disabledRow]
          });

          console.log(`[MemberClassification] ${interaction.user.tag} classified ${targetUserId} as Discord Member`);
        }

      } catch (err) {
        if (err?.code === 10062) return; // Unknown interaction
        console.error('[MemberClassification] Button handler error:', err);
      }
    });
  }
};
