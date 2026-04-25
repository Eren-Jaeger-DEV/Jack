/**
 * plugins/clan-battle/handlers/panelHandler.js
 *
 * Manages the Clan Battle Automation Panel in the moderation channel.
 */

'use strict';

const { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder
} = require('discord.js');
const battleService = require('../services/battleService');
const sessionService = require('../services/sessionService');
const visionService = require('../../../bot/utils/visionService');
const Player = require('../../../bot/database/models/Player');
const logger = require('../../../utils/logger');

const MOD_CHANNEL_ID = '1479492977305981220';

/**
 * Build the V2 Automation Panel.
 */
function buildPanel() {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('🏆 **CLAN BATTLE AUTOMATION**')
  );


  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      '**Automate battle points entry using screenshots.**\n\n' +
      '1. Click **"Collect Screenshots"** to start.\n' +
      '2. Upload screenshots of the **"Contribution Point Rankings"** list.\n' +
      '3. Click **"Process & Finalize"** to run AI extraction.\n\n' +
      '> **Note:** Jack will update both Today\'s points and Total points.\n\n' +
      '*Clan Management Operations*'
    )
  );

  const startBtn = new ButtonBuilder()
    .setCustomId('battle_start_upload')
    .setLabel('Collect Screenshots')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('📸');

  const processBtn = new ButtonBuilder()
    .setCustomId('battle_process_all')
    .setLabel('Process & Finalize')
    .setStyle(ButtonStyle.Success)
    .setEmoji('⚙️');

  const cancelBtn = new ButtonBuilder()
    .setCustomId('battle_cancel_session')
    .setLabel('Cancel Session')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(startBtn, processBtn, cancelBtn);

  return { 
    components: [container, row],
    flags: MessageFlags.IsComponentsV2
  };
}

async function ensurePanel(client) {
  try {
    const channel = await client.channels.fetch(MOD_CHANNEL_ID).catch(() => null);
    if (!channel) return logger.warn("ClanBattle", `Mod channel ${MOD_CHANNEL_ID} not found.`);

    const messages = await channel.messages.fetch({ limit: 50 });
    
    // 1. Check for the NEW V2 panel (type 20 is Container)
    const v2Panel = messages.find(m => 
      m.author.id === client.user.id && 
      m.components?.[0]?.type === 20
    );

    if (v2Panel) {
      logger.info("ClanBattle", "V2 Automation panel found.");
      return;
    }

    // 2. Check for an OLD legacy panel and delete it to make room
    const oldPanel = messages.find(m => 
      m.author.id === client.user.id && 
      (m.embeds?.[0]?.title?.includes('CLAN BATTLE') || m.components?.[0]?.components?.[0]?.customId === 'battle_start_upload')
    );

    if (oldPanel) {
      logger.info("ClanBattle", "Old panel detected, purging for upgrade...");
      await oldPanel.delete().catch(() => {});
    }

    await channel.send(buildPanel());
    logger.info("ClanBattle", "Automation panel created.");
  } catch (err) {
    logger.error("ClanBattle", `ensurePanel error: ${err.message}`);
  }
}

async function handleInteraction(interaction) {
  const { customId, user, guild, client } = interaction;

  if (customId === 'battle_start_upload') {
    sessionService.startSession(user.id, guild.id, interaction.channelId);
    return interaction.reply({ 
      content: '✅ **Battle Session Started!** Please upload screenshots of the "Contribution Point Rankings". When finished, click **"Process & Finalize"** on the panel.', 
      flags: [MessageFlags.Ephemeral] 
    });
  }

  if (customId === 'battle_cancel_session') {
    sessionService.endSession(user.id);
    return interaction.reply({ content: '❌ Battle session cancelled.', flags: [MessageFlags.Ephemeral] });
  }

  if (customId === 'battle_process_all') {
    const session = sessionService.getSession(user.id);
    if (!session || session.imageUrls.length === 0) {
      return interaction.reply({ content: '❌ No screenshots collected. Click **"Collect Screenshots"** first.', flags: [MessageFlags.Ephemeral] });
    }

    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply('⏳ **Jack is analyzing battle rankings...**');

    try {
      const extractedData = await visionService.extractClanBattleData(session.imageUrls);
      if (extractedData.length === 0) {
        return interaction.editReply('❌ Failed to extract any data. Check screenshot quality.');
      }

      const updates = [];
      const unmatched = [];

      for (const data of extractedData) {
        const player = await battleService.resolveMemberByName(guild, data.name);
        if (player) {
          updates.push({ player, today: data.today, total: data.total });
        } else {
          unmatched.push(data);
        }
      }

      const results = await battleService.bulkUpdateBattlePoints(guild.id, updates);
      
      if (unmatched.length > 0) {
        session.unmatched = unmatched;
        session.updatedPlayerIds = updates.map(u => u.player._id.toString());
        
        let unmatchedMsg = `✅ Updated **${results.success}** players.\n\n⚠️ **Unmatched Players Found (${unmatched.length}):**\n`;
        unmatchedMsg += unmatched.map(u => `- \`${u.name}\` (Today: ${u.today}, Total: ${u.total})`).join('\n');
        unmatchedMsg += '\n\nPlease resolve these manually.';

        await interaction.editReply(unmatchedMsg);

        for (let i = 0; i < unmatched.length; i++) {
          await sendManualResolutionPrompt(interaction.channel, unmatched[i], i);
        }
      } else {
        await interaction.editReply(`✅ **Success!** Updated **${results.success}** players. Perfectly matched.`);
        sessionService.endSession(user.id);
      }

      // Refresh real leaderboard
      const battle = await battleService.getActiveBattle(guild.id);
      if (battle) await battleService.refreshLeaderboard(client, battle);

    } catch (err) {
      logger.error("ClanBattle", `Processing error: ${err.message}`);
      await interaction.editReply(`❌ Error: ${err.message}`);
    }
  }

  // Handle manual resolution buttons
  if (customId.startsWith('battle_ignore_btn_')) {
    const index = customId.split('_')[3];
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`✅ Ignored battle entry index **${index}**.`));
    return interaction.update({ content: "", components: [container], flags: MessageFlags.IsComponentsV2, embeds: [] });
  }

  if (customId.startsWith('battle_link_btn_')) {
    const index = parseInt(customId.split('_')[3]);
    const session = sessionService.getSession(user.id);
    if (!session) return interaction.reply({ content: '❌ Session expired.', flags: [MessageFlags.Ephemeral] });

    return showPlayerSelectMenu(interaction, index, session);
  }

  // Handle manual resolution select menu
  if (customId.startsWith('battle_resolve_')) {
    const session = sessionService.getSession(user.id);
    if (!session) return interaction.reply({ content: '❌ Session expired.', flags: [MessageFlags.Ephemeral] });

    const index = parseInt(customId.split('_')[2]);
    const unmatchedEntry = session.unmatched[index];
    if (!unmatchedEntry) return interaction.reply({ content: '❌ Entry not found.', flags: [MessageFlags.Ephemeral] });

    const targetUserId = interaction.values[0];
    const { name, today, total } = unmatchedEntry;
    const player = await Player.findById(targetUserId);
    if (!player) return interaction.reply({ content: '❌ Player not found.', flags: [MessageFlags.Ephemeral] });

    // Update in battle
    const battleResults = await battleService.bulkUpdateBattlePoints(guild.id, [{ player, today, total }]);

    session.updatedPlayerIds.push(targetUserId);

    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`✅ Linked \`${name}\` to **${player.ign || targetUserId}**. Points updated!`));

    await interaction.update({ 
      content: "", 
      components: [container], 
      flags: MessageFlags.IsComponentsV2,
      embeds: [] 
    });

    // Refresh leaderboard
    const battle = await battleService.getActiveBattle(guild.id);
    if (battle) await battleService.refreshLeaderboard(client, battle);
  }
}

async function sendManualResolutionPrompt(channel, unmatchedEntry, index) {
  const { name, today, total } = unmatchedEntry;
  
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `🔍 **Manual Resolution Required (Clan Battle)**\n` +
      `Could not find a match for \`${name}\`.\n` +
      `**Values:** Today: ${today}, Total: ${total}`
    )
  );

  const ignoreBtn = new ButtonBuilder()
    .setCustomId(`battle_ignore_btn_${index}`)
    .setLabel('Ignore')
    .setStyle(ButtonStyle.Danger);

  const linkBtn = new ButtonBuilder()
    .setCustomId(`battle_link_btn_${index}`)
    .setLabel(`Link "${name}"`)
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder().addComponents(ignoreBtn, linkBtn);

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
    return interaction.reply({ content: '❌ No clan members (JCM) left to link.', flags: [MessageFlags.Ephemeral] });
  }

  const options = players.map(p => ({
    label: `${p.serialNumber} - ${p.ign || 'Unknown'}`,
    description: `UID: ${p.uid || 'N/A'}`,
    value: p._id.toString()
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId(`battle_resolve_${index}`)
    .setPlaceholder(`Select database player for "${name}"...`)
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(select);

  const container = new ContainerBuilder();
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`Select target player for **${name}**:`));

  await interaction.update({
    content: "",
    components: [container, row],
    flags: MessageFlags.IsComponentsV2,
    embeds: []
  });
}

module.exports = {
  ensurePanel,
  handleInteraction,
  MOD_CHANNEL_ID
};
