/**
 * plugins/seasonal-synergy/handlers/panelHandler.js
 *
 * Manages the Synergy Leaderboard Automation Panel in the moderation channel.
 */

'use strict';

const { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
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
  const container = new ContainerBuilder();

  // 1. Header
  container.addSectionComponents(
    new SectionBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent('⚡ **SYNERGY AUTOMATION PANEL**')
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  // 2. Instructions
  const instructions = new SectionBuilder();
  instructions.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      '**Automate leaderboard entry using screenshots.**\n\n' +
      '1. Click **"Collect Screenshots"** to start.\n' +
      '2. Upload screenshots of the in-game clan leaderboard.\n' +
      '3. Click **"Process & Finalize"** to run OCR.\n\n' +
      '> *Note: Jack will update both Weekly and Season energy.*'
    )
  );
  container.addSectionComponents(instructions);

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
  return { 
    content: "", 
    embeds: [], 
    components: [container, row], 
    flags: MessageFlags.IsComponentsV2 
  };
}

async function ensurePanel(client) {
  try {
    const channel = await client.channels.fetch(MOD_CHANNEL_ID).catch(() => null);
    if (!channel) return logger.warn("SynergyPanel", `Mod channel ${MOD_CHANNEL_ID} not found.`);

    const messages = await channel.messages.fetch({ limit: 50 });
    // Check for V2 panel (looking for specific component structure or just checking the author)
    const existing = messages.find(m => m.author.id === client.user.id && (m.components?.[0]?.type === 20 || m.embeds?.[0]?.title === '⚡ SYNERGY AUTOMATION PANEL'));

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
      content: '✅ **Session Started!** Please upload your screenshots now. When finished, click **"Process & Finalize"** on the panel.', 
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
      return interaction.reply({ content: '❌ No screenshots collected.', flags: [MessageFlags.Ephemeral] });
    }

    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply('⏳ **Jack is analyzing screenshots...**');

    try {
      const extractedData = await visionService.extractLeaderboardData(session.imageUrls);
      if (extractedData.length === 0) {
        return interaction.editReply('❌ Failed to extract any data.');
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

      const results = await synergyService.bulkUpdateEnergy(updates);
      
      if (unmatched.length > 0) {
        session.unmatched = unmatched;
        session.updatedPlayerIds = updates.map(u => u.player._id.toString());
        
        let unmatchedMsg = `✅ Updated **${results.success}** players.\n⚠️ **Unmatched (${unmatched.length}):** Resolve below:`;
        await interaction.editReply(unmatchedMsg);

        for (let i = 0; i < unmatched.length; i++) {
          await sendManualResolutionPrompt(interaction.channel, unmatched[i], i);
        }
      } else {
        await interaction.editReply(`✅ **Success!** Updated **${results.success}** players.`);
        sessionService.endSession(user.id);
      }

      const season = await synergyService.getActiveSeason(guild.id);
      if (season) await synergyService.refreshLeaderboard(client, season);

    } catch (err) {
      logger.error("SynergyPanel", `Processing error: ${err.message}`);
      await interaction.editReply(`❌ Error: ${err.message}`);
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

  if (customId.startsWith('synergy_resolve_')) {
    const session = sessionService.getSession(user.id);
    if (!session) return interaction.reply({ content: '❌ Session expired.', flags: [MessageFlags.Ephemeral] });

    const index = parseInt(customId.split('_')[2]);
    const targetUserId = interaction.values[0];
    const unmatchedEntry = session.unmatched[index];
    if (!unmatchedEntry) return interaction.reply({ content: '❌ Entry not found.', flags: [MessageFlags.Ephemeral] });

    const { name, weekly, season } = unmatchedEntry;
    const player = await Player.findById(targetUserId);
    if (!player) return interaction.reply({ content: '❌ Player not found.', flags: [MessageFlags.Ephemeral] });

    player.weeklySynergy = parseInt(weekly);
    player.seasonSynergy = parseInt(season);
    player.lastWeeklySubmission = new Date().toISOString().split('T')[0];
    await player.save();

    session.updatedPlayerIds.push(targetUserId);

    await interaction.update({ 
      content: `✅ Linked \`${name}\` to **${player.ign || targetUserId}**.`, 
      components: [], 
      embeds: [] 
    });

    const activeSeason = await synergyService.getActiveSeason(guild.id);
    if (activeSeason) await synergyService.refreshLeaderboard(client, activeSeason);
  }
}

async function sendManualResolutionPrompt(channel, unmatchedEntry, index) {
  const { name, weekly, season } = unmatchedEntry;
  const container = new ContainerBuilder();

  container.addSectionComponents(
    new SectionBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `🔍 **Manual Resolution Required**\nMatch fail for \`${name}\`.\n**Weekly:** ${weekly} | **Season:** ${season}`
      )
    )
  );
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`synergy_ignore_btn_${index}`).setLabel('Ignore').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`synergy_link_btn_${index}`).setLabel(`Link "${name}"`).setStyle(ButtonStyle.Success)
  );

  await channel.send({
    content: "",
    components: [container, row],
    flags: MessageFlags.IsComponentsV2
  });
}

async function showPlayerSelectMenu(interaction, index, session) {
  const unmatchedEntry = session.unmatched[index];
  const { name } = unmatchedEntry;

  const players = await Player.find({ 
    _id: { $nin: session.updatedPlayerIds },
    isClanMember: true,
    serialNumber: /^JCM/
  }).sort({ serialNumber: 1 }).limit(25);
  
  if (players.length === 0) {
    return interaction.reply({ content: '❌ No available members left.', flags: [MessageFlags.Ephemeral] });
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

  await interaction.update({
    content: `Select the target player for **${name}**:`,
    components: [new ActionRowBuilder().addComponents(select)],
    embeds: []
  });
}

module.exports = {
  ensurePanel,
  handleInteraction,
  MOD_CHANNEL_ID
};
