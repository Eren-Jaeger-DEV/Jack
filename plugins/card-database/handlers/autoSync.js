/**
 * plugins/card-database/handlers/autoSync.js
 *
 * Debounced auto-sync system.
 *
 * Listens for Discord events that indicate card data has changed:
 *  - threadCreate   → new category thread
 *  - messageCreate  → new card message in a DB thread
 *  - messageUpdate  → card message edited
 *  - messageDelete  → card message deleted
 *
 * Debounce: coalesces rapid changes into a single sync after DEBOUNCE_MS.
 * This prevents hammering the Discord API when multiple messages arrive at once.
 */

'use strict';

const { ChannelType } = require('discord.js');
const { runSilentSync } = require('./syncHandler');

const configManager = require('../../../bot/utils/configManager');
const DEBOUNCE_MS   = 7000; // 7 seconds — coalesces bursts


let debounceTimer = null;

/**
 * Schedule a silent sync. Resets timer if called again within DEBOUNCE_MS.
 * @param {import('discord.js').Client} client
 * @param {string} reason — for logging only
 */
function scheduleSyncDebounced(client, reason) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  console.log(`[CardDB] Auto-sync scheduled (${reason}), debouncing for ${DEBOUNCE_MS / 1000}s...`);

  debounceTimer = setTimeout(async () => {
    debounceTimer = null;
    await runSilentSync(client);
  }, DEBOUNCE_MS);
}

/**
 * Determine if a message belongs to a DB channel thread.
 * @param {import('discord.js').Message} message
 */
async function isDbThreadMessage(message) {
  if (!message.guild) return false;
  if (!message.channel.isThread()) return false;
  
  const config = await configManager.getGuildConfig(message.guild.id);
  const dbChannelId = config?.settings?.cardDatabaseChannelId;
  if (!dbChannelId) return false;

  // Check that the thread's parent is the DB channel
  return message.channel.parentId === dbChannelId;
}

/**
 * Register all auto-sync event listeners on the client.
 * @param {import('discord.js').Client} client
 */
function registerAutoSync(client) {
  // 1. New thread created in DB channel → new category
  client.on('threadCreate', async thread => {
    const config = await configManager.getGuildConfig(thread.guildId);
    const dbChannelId = config?.settings?.cardDatabaseChannelId;
    if (!dbChannelId || thread.parentId !== dbChannelId) return;
    scheduleSyncDebounced(client, `threadCreate: "${thread.name}"`);
  });

  // 2. New message in a DB thread → new card (handled after image upload finishes)
  //    We only react to non-bot messages to avoid reacting to our own card posts.
  //    The card message IS posted by the bot — so we DO include bot messages here
  //    because those are the actual card entries.
  client.on('messageCreate', async message => {
    if (!message.guild) return;
    if (message.system) return;
    if (!(await isDbThreadMessage(message))) return;

    // Schedule sync for both admin uploads and the bot's own card messages
    scheduleSyncDebounced(client, `messageCreate in "${message.channel.name}"`);
  });

  // 3. Message edited in a DB thread → card updated
  client.on('messageUpdate', async (_, newMessage) => {
    if (!newMessage.guild) return;
    if (newMessage.system) return;
    if (!(await isDbThreadMessage(newMessage))) return;

    scheduleSyncDebounced(client, `messageUpdate in "${newMessage.channel.name}"`);
  });

  // 4. Message deleted in a DB thread → card removed
  client.on('messageDelete', async message => {
    if (!message.guild) return;
    // Partial messages don't have channel info — we check parentId via channel cache
    const channel = message.channel;
    if (!channel?.isThread()) return;

    const config = await configManager.getGuildConfig(message.guild.id);
    const dbChannelId = config?.settings?.cardDatabaseChannelId;
    if (!dbChannelId || channel.parentId !== dbChannelId) return;

    scheduleSyncDebounced(client, `messageDelete in "${channel.name}"`);
  });

  // 5. Thread deleted in DB channel → category removed
  client.on('threadDelete', async thread => {
    const config = await configManager.getGuildConfig(thread.guildId);
    const dbChannelId = config?.settings?.cardDatabaseChannelId;
    if (!dbChannelId || thread.parentId !== dbChannelId) return;
    scheduleSyncDebounced(client, `threadDelete: "${thread.name}"`);
  });

  console.log('[CardDB] Auto-sync event listeners registered.');
}

module.exports = { registerAutoSync };
