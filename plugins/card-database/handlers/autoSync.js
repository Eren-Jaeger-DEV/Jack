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

const DB_CHANNEL_ID = '1486990546672291911';
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
function isDbThreadMessage(message) {
  if (!message.guild) return false;
  if (!message.channel.isThread()) return false;
  // Check that the thread's parent is the DB channel
  return message.channel.parentId === DB_CHANNEL_ID;
}

/**
 * Register all auto-sync event listeners on the client.
 * @param {import('discord.js').Client} client
 */
function registerAutoSync(client) {
  // 1. New thread created in DB channel → new category
  client.on('threadCreate', thread => {
    if (thread.parentId !== DB_CHANNEL_ID) return;
    scheduleSyncDebounced(client, `threadCreate: "${thread.name}"`);
  });

  // 2. New message in a DB thread → new card (handled after image upload finishes)
  //    We only react to non-bot messages to avoid reacting to our own card posts.
  //    The card message IS posted by the bot — so we DO include bot messages here
  //    because those are the actual card entries.
  client.on('messageCreate', message => {
    if (!message.guild) return;
    if (message.system) return;
    if (!isDbThreadMessage(message)) return;

    // Schedule sync for both admin uploads and the bot's own card messages
    scheduleSyncDebounced(client, `messageCreate in "${message.channel.name}"`);
  });

  // 3. Message edited in a DB thread → card updated
  client.on('messageUpdate', (_, newMessage) => {
    if (!newMessage.guild) return;
    if (newMessage.system) return;
    if (!isDbThreadMessage(newMessage)) return;

    scheduleSyncDebounced(client, `messageUpdate in "${newMessage.channel.name}"`);
  });

  // 4. Message deleted in a DB thread → card removed
  client.on('messageDelete', message => {
    if (!message.guild) return;
    // Partial messages don't have channel info — we check parentId via channel cache
    const channel = message.channel;
    if (!channel?.isThread()) return;
    if (channel.parentId !== DB_CHANNEL_ID) return;

    scheduleSyncDebounced(client, `messageDelete in "${channel.name}"`);
  });

  console.log('[CardDB] Auto-sync event listeners registered.');
}

module.exports = { registerAutoSync };
