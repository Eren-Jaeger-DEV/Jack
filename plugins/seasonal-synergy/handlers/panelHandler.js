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
const visionService = require('../../../bot/utils/visionService');
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
      const extractedData = await visionService.extractLeaderboardData(session.imageUrls);
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
        session.updatedPlayerIds = updates.map(u => u.player._id.toString()); // Track who was updated (using DB ID)
        
        let unmatchedMsg = `✅ Updated **${results.success}** players.\n\n⚠️ **Unmatched Players Found (${unmatched.length}):**\n`;
        unmatchedMsg += unmatched.map(u => `- \`${u.name}\` (W: ${u.weekly}, S: ${u.season})`).join('\n');
        unmatchedMsg += '\n\nPlease resolve these manually using the buttons below.';

        await interaction.editReply(unmatchedMsg);

        // Send manual resolution prompts for each unmatched player
        for (let i = 0; i < unmatched.length; i++) {
          await sendManualResolutionPrompt(interaction.channel, unmatched[i], i);
        }
      } else {
        await interaction.editReply(`✅ **Success!** Updated **${results.success}** players. All members from screenshots matched perfectly.`);
        sessionService.endSession(user.id);
      }

      // Refresh real leaderboard
      const season = await synergyService.getActiveSeason(guild.id);
      if (season) await synergyService.refreshLeaderboard(client, season);

    } catch (err) {
      logger.error("SynergyPanel", `Processing error: ${err.message}`);
      await interaction.editReply(`❌ An error occurred during processing: ${err.message}`);
    }
  }

  // Handle manual resolution buttons
  if (customId.startsWith('synergy_ignore_btn_')) {
    const index = customId.split('_')[3];
    return interaction.update({ content: `✅ Ignored entry index **${index}**.`, components: [], embeds: [] });
  }

  if (customId.startsWith('synergy_link_btn_')) {
    const index = parseInt(customId.split('_')[3]);
    const session = sessionService.getSession(user.id);
    if (!session) return interaction.reply({ content: '❌ Session expired.', flags: [MessageFlags.Ephemeral] });

    return showPlayerSelectMenu(interaction, index, session);
  }

  // Handle manual resolution select menu
  if (customId.startsWith('synergy_resolve_')) {
    const session = sessionService.getSession(user.id);
    if (!session) return interaction.reply({ content: '❌ Session expired. Please process again.', flags: [MessageFlags.Ephemeral] });

    const index = parseInt(customId.split('_')[2]);
    const unmatchedEntry = session.unmatched[index];
    if (!unmatchedEntry) return interaction.reply({ content: '❌ Entry not found.', flags: [MessageFlags.Ephemeral] });

    const { name, weekly, season } = unmatchedEntry;
    const player = await Player.findById(targetUserId);
    if (!player) return interaction.reply({ content: '❌ Player not found in bot database.', flags: [MessageFlags.Ephemeral] });

    player.weeklySynergy = parseInt(weekly);
    player.seasonSynergy = parseInt(season);
    player.lastWeeklySubmission = new Date().toISOString().split('T')[0];
    await player.save();

    // Track that this player was updated so they don't show up in next dropdowns
    session.updatedPlayerIds.push(targetUserId);

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

async function sendManualResolutionPrompt(channel, unmatchedEntry, index) {
  const { name, weekly, season } = unmatchedEntry;
  
  const ignoreBtn = new ButtonBuilder()
    .setCustomId(`synergy_ignore_btn_${index}`)
    .setLabel('Ignore')
    .setStyle(ButtonStyle.Danger);

  const linkBtn = new ButtonBuilder()
    .setCustomId(`synergy_link_btn_${index}`)
    .setLabel(`Link "${name}" to a player`)
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder().addComponents(ignoreBtn, linkBtn);

  await channel.send({
    content: `🔍 **Manual Resolution Required**\nCould not find a match for \`${name}\` from the screenshot.\n**Values:** Weekly: ${weekly}, Season: ${season}`,
    components: [row]
  });
}

async function showPlayerSelectMenu(interaction, index, session) {
  const unmatchedEntry = session.unmatched[index];
  const { name } = unmatchedEntry;

  // Get all active clan members (JCM) to populate select menu, excluding those already updated
  const players = await Player.find({ 
    _id: { $nin: session.updatedPlayerIds },
    isClanMember: true,
    serialNumber: /^JCM/
  }).sort({ serialNumber: 1 }).limit(25);
  
  if (players.length === 0) {
    return interaction.reply({ content: '❌ No available clan members (JCM) left to link.', flags: [MessageFlags.Ephemeral] });
  }

  const options = players.map(p => ({
    label: `${p.serialNumber} - ${p.ign || 'Unknown'}`,
    description: `UID: ${p.uid || 'N/A'}`,
    value: p._id.toString()
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId(`synergy_resolve_${index}`)
    .setPlaceholder(`Select database player for "${name}"...`)
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(select);

  await interaction.update({
    content: `Select the target player for **${name}**:`,
    components: [row],
    embeds: []
  });
}

module.exports = {
  ensurePanel,
  handleInteraction,
  MOD_CHANNEL_ID
};
