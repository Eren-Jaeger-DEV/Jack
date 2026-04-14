/**
 * plugins/seasonal-synergy/handlers/panelHandler.js
 *
 * Manages the Synergy Leaderboard Automation Panel in the moderation channel.
 */

'use strict';

const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder,
  MessageFlags
} = require('discord.js');
const configManager = require('../../../bot/utils/configManager');
const synergyService = require('../services/synergyService');
const sessionService = require('../services/sessionService');
const aiService = require('../../../bot/utils/aiService');
const Player = require('../../../bot/database/models/Player');
const logger = require('../../../utils/logger');

const MOD_CHANNEL_ID = '1479492977305981220';

function buildPanel() {
  const embed = new EmbedBuilder()
    .setTitle('⚡ SYNERGY AUTOMATION PANEL')
    .setDescription(
      '**Automate leaderboard entry using screenshots.**\n\n' +
      '1. Click **"Collect Screenshots"** to start.\n' +
      '2. Upload one or more screenshots of the in-game clan leaderboard.\n' +
      '3. Click **"Process & Finalize"** to run OCR and update the database.\n\n' +
      '> **Note:** Jack will update both Weekly and Season energy.'
    )
    .setColor(0xFFA500)
    .setThumbnail('https://cdn.discordapp.com/attachments/1353964404378701916/1423456789123456789/jack_automation.png')
    .setFooter({ text: 'Clan Management Operations' })
    .setTimestamp();

  const startBtn = new ButtonBuilder()
    .setCustomId('synergy_start_upload')
    .setLabel('Collect Screenshots')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('📸');

  const processBtn = new ButtonBuilder()
    .setCustomId('synergy_process_all')
    .setLabel('Process & Finalize')
    .setStyle(ButtonStyle.Success)
    .setEmoji('⚙️');

  const cancelBtn = new ButtonBuilder()
    .setCustomId('synergy_cancel_session')
    .setLabel('Cancel Session')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(startBtn, processBtn, cancelBtn);
  return { embeds: [embed], components: [row] };
}

async function ensurePanel(client) {
  try {
    const channel = await client.channels.fetch(MOD_CHANNEL_ID).catch(() => null);
    if (!channel) return logger.warn("SynergyPanel", `Mod channel ${MOD_CHANNEL_ID} not found.`);

    const messages = await channel.messages.fetch({ limit: 50 });
    const existing = messages.find(m => m.author.id === client.user.id && m.embeds?.[0]?.title === '⚡ SYNERGY AUTOMATION PANEL');

    if (existing) {
      logger.info("SynergyPanel", "Automation panel found.");
    } else {
      await channel.send(buildPanel());
      logger.info("SynergyPanel", "Automation panel created.");
    }
  } catch (err) {
    logger.error("SynergyPanel", `ensurePanel error: ${err.message}`);
  }
}

async function handleInteraction(interaction) {
  const { customId, user, guild, client } = interaction;

  if (customId === 'synergy_start_upload') {
    sessionService.startSession(user.id, guild.id, interaction.channelId);
    return interaction.reply({ 
      content: '✅ **Session Started!** Please upload your screenshots now. You can upload multiple images. When finished, click **"Process & Finalize"** on the panel.', 
      flags: [MessageFlags.Ephemeral] 
    });
  }

  if (customId === 'synergy_cancel_session') {
    sessionService.endSession(user.id);
    return interaction.reply({ content: '❌ Session cancelled.', flags: [MessageFlags.Ephemeral] });
  }

  if (customId === 'synergy_process_all') {
    const session = sessionService.getSession(user.id);
    if (!session || session.imageUrls.length === 0) {
      return interaction.reply({ content: '❌ No screenshots collected. Click **"Collect Screenshots"** first and upload images.', flags: [MessageFlags.Ephemeral] });
    }

    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply('⏳ **Jack is analyzing screenshots...** (This may take a moment)');

    try {
      const extractedData = await aiService.extractLeaderboardData(session.imageUrls);
      if (extractedData.length === 0) {
        return interaction.editReply('❌ Failed to extract any data. Please make sure the screenshots are clear.');
      }

      const updates = [];
      const unmatched = [];

      for (const data of extractedData) {
        const player = await synergyService.resolveMemberByName(guild, data.name);
        if (player) {
          updates.push({ player, weekly: data.weekly, season: data.season });
        } else {
          unmatched.push(data);
        }
      }

      // Step 1: Bulk update matched players
      const results = await synergyService.bulkUpdateEnergy(updates);
      
      // Step 2: Handle unmatched players
      if (unmatched.length > 0) {
        session.unmatched = unmatched; // Store for resolution
        
        let unmatchedMsg = `✅ Updated **${results.success}** players.\n\n⚠️ **Unmatched Players Found (${unmatched.length}):**\n`;
        unmatchedMsg += unmatched.map(u => `- \`${u.name}\` (W: ${u.weekly}, S: ${u.season})`).join('\n');
        unmatchedMsg += '\n\nPlease resolve these manually using the menus below.';

        await interaction.editReply(unmatchedMsg);

        // Send manual resolution prompts for each unmatched player
        for (let i = 0; i < unmatched.length; i++) {
          await sendManualResolutionPrompt(interaction.channel, unmatched[i], i, user.id);
        }
      } else {
        await interaction.editReply(`✅ **Success!** Updated **${results.success}** players. All members from screenshots matched perfectly.`);
        sessionService.endSession(user.id);
      }

    } catch (err) {

      // Refresh real leaderboard
      const season = await synergyService.getActiveSeason(guild.id);
      if (season) await synergyService.refreshLeaderboard(client, season);

    } catch (err) {
      logger.error("SynergyPanel", `Processing error: ${err.message}`);
      await interaction.editReply(`❌ An error occurred during processing: ${err.message}`);
    }
  }

  // Handle manual resolution select menu
  if (customId.startsWith('synergy_resolve_')) {
    const session = sessionService.getSession(user.id);
    if (!session) return interaction.reply({ content: '❌ Session expired. Please process again.', flags: [MessageFlags.Ephemeral] });

    const index = parseInt(customId.split('_')[2]);
    const unmatchedEntry = session.unmatched[index];
    if (!unmatchedEntry) return interaction.reply({ content: '❌ Entry not found.', flags: [MessageFlags.Ephemeral] });

    const { name, weekly, season } = unmatchedEntry;
    const targetUserId = interaction.values[0];

    if (targetUserId === 'ignore') {
      return interaction.update({ content: `✅ Ignored entry for \`${name}\`.`, components: [], embeds: [] });
    }

    const player = await Player.findOne({ discordId: targetUserId });
    if (!player) return interaction.reply({ content: '❌ Player not found in bot database.', flags: [MessageFlags.Ephemeral] });

    player.weeklySynergy = parseInt(weekly);
    player.seasonSynergy = parseInt(season);
    player.lastWeeklySubmission = new Date().toISOString().split('T')[0]; // Simple YYYY-MM-DD
    await player.save();

    await interaction.update({ 
      content: `✅ Linked \`${name}\` to **${player.ign || targetUserId}**. Values updated!`, 
      components: [], 
      embeds: [] 
    });

    // Refresh leaderboard
    const activeSeason = await synergyService.getActiveSeason(guild.id);
    if (activeSeason) await synergyService.refreshLeaderboard(client, activeSeason);
  }
}

async function sendManualResolutionPrompt(channel, unmatchedEntry, index, moderatorId) {
  const { name, weekly, season } = unmatchedEntry;
  
  // Get all clan members from DB to populate select menu
  const players = await Player.find({ isClanMember: true }).sort({ ign: 1 }).limit(24);
  
  const options = players.map(p => ({
    label: p.ign || 'Unknown IGN',
    description: `UID: ${p.uid || 'N/A'}`,
    value: p.discordId
  }));

  options.push({ label: 'Ignore this entry', value: 'ignore' });

  const select = new StringSelectMenuBuilder()
    .setCustomId(`synergy_resolve_${index}`)
    .setPlaceholder(`Link "${name}" to a player...`)
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(select);

  await channel.send({
    content: `🔍 **Manual Resolution Required**\nCould not find a match for \`${name}\` from the screenshot.\n**Values:** Weekly: ${weekly}, Season: ${season}`,
    components: [row]
  });
}

module.exports = {
  ensurePanel,
  handleInteraction,
  MOD_CHANNEL_ID
};
