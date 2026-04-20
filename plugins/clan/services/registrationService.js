/**
 * plugins/clan/services/registrationService.js
 * 
 * Handles the logic for the persistent registration panel, role verification,
 * and managing registration sessions for screenshot collection.
 */

const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder,
  MessageFlags
} = require('discord.js');
const logger = require('../../../utils/logger');

// Constants
const PANEL_CHANNEL_ID = '1495460903628308752';
const DB_CHANNEL_ID = '1479697157840830524';

// Active sessions for screenshot collection: userId -> { type, timestamp, metadata }
const activeSessions = new Map();

/**
 * Build the main registration panel embed and buttons.
 */
function buildPanel() {
  const embed = new EmbedBuilder()
    .setTitle('🏆 CLAN REGISTRATION CENTER')
    .setDescription(
      'Welcome to the official Clan Registration Panel. Please use the buttons below to manage your profile.\n\n' +
      '✅ **Register:** New members click here to join the roster.\n' +
      '📝 **Edit:** Update your existing IGN, UID, or Level.\n' +
      '❌ **Delete:** Remove your profile from the database.\n\n' +
      '> **Note:** Registration requires a screenshot of your **BGMI Basic Info** stats card.'
    )
    .setColor('#00FFCC')
    .setThumbnail('https://cdn.discordapp.com/attachments/1353964404378701916/1423456789123456789/jack_clan.png') // Placeholder
    .setFooter({ text: 'Jack Management Systems' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('clan_reg_start')
      .setLabel('Register')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
    new ButtonBuilder()
      .setCustomId('clan_reg_edit')
      .setLabel('Edit Profile')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📝'),
    new ButtonBuilder()
      .setCustomId('clan_reg_delete')
      .setLabel('Delete')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🗑️')
  );

  return { embeds: [embed], components: [row] };
}

/**
 * Build the role selection dropdown for registration.
 */
function buildRoleSelection() {
  const select = new StringSelectMenuBuilder()
    .setCustomId('clan_reg_role_select')
    .setPlaceholder('Select your membership type...')
    .addOptions([
      {
        label: 'Clan Member',
        description: 'You are a part of the in-game clan.',
        value: 'clan',
        emoji: '🛡️'
      },
      {
        label: 'Discord Member',
        description: 'You are a community member.',
        value: 'guest',
        emoji: '👥'
      }
    ]);

  const row = new ActionRowBuilder().addComponents(select);
  return { content: 'Please select how you want to register:', components: [row], flags: [MessageFlags.Ephemeral] };
}

/**
 * Verify if the user has the required roles for their selection.
 */
async function verifyRole(member, selection, clanRoleId) {
  const hasClanRole = member.roles.cache.has(clanRoleId);
  
  if (selection === 'clan' && !hasClanRole) {
    return { 
      success: false, 
      error: '❌ You do not have the **Clan Member** role. Please register as a Guest or contact an admin.' 
    };
  }
  
  return { success: true, isClan: selection === 'clan' };
}

/**
 * Start a registration session to wait for a screenshot.
 */
function startSession(userId, metadata) {
  activeSessions.set(userId, {
    ...metadata,
    timestamp: Date.now()
  });
  
  // Auto-expire after 10 minutes
  setTimeout(() => {
    if (activeSessions.has(userId)) {
      activeSessions.delete(userId);
      logger.info('Registration', `Session expired for ${userId}`);
    }
  }, 10 * 60 * 1000);
}

function getSession(userId) {
  return activeSessions.get(userId);
}

function endSession(userId) {
  activeSessions.delete(userId);
}

module.exports = {
  PANEL_CHANNEL_ID,
  DB_CHANNEL_ID,
  buildPanel,
  buildRoleSelection,
  verifyRole,
  startSession,
  getSession,
  endSession
};
