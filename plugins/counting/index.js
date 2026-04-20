const fs = require('fs');
const path = require('path');
const configManager = require('../../bot/utils/configManager');
const { addLog } = require('../../utils/logger');

const CONFIG = {
  DATA_PATH: path.join(__dirname, 'data.json')
};

// Guild-keyed states: { guildId: { lastNumber, lastUserId } }
let guildStates = {};

function saveState() {
  try {
    fs.writeFileSync(CONFIG.DATA_PATH, JSON.stringify(guildStates, null, 2));
  } catch (err) {
    console.error('[Counting] Error saving state:', err);
  }
}

function loadState() {
  try {
    if (fs.existsSync(CONFIG.DATA_PATH)) {
      const stored = JSON.parse(fs.readFileSync(CONFIG.DATA_PATH, 'utf8'));
      // Handle legacy format (single guild) or new format (multi-guild)
      if (stored.lastNumber !== undefined) {
        // Migration: assign legacy state to the primary guild from env
        const primaryGuild = process.env.GUILD_ID;
        if (primaryGuild) {
          guildStates[primaryGuild] = { 
            lastNumber: stored.lastNumber || 0, 
            lastUserId: stored.lastUserId || null 
          };
        }
      } else {
        guildStates = stored;
      }
    }
  } catch (err) {
    console.error('[Counting] Error loading state:', err);
  }
}

async function verifyState(client, guildId) {
  try {
    if (!guildId) return;
    const config = await configManager.getGuildConfig(guildId);
    const channelId = config?.settings?.countingChannelId;
    if (!channelId) return;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    const messages = await channel.messages.fetch({ limit: 50 });
    
    // Ensure guild state exists
    if (!guildStates[guildId]) {
      guildStates[guildId] = { lastNumber: 0, lastUserId: null };
    }

    // Find the very latest message that is a number
    for (const msg of messages.values()) {
        const content = msg.content.trim();
        if (/^\d+$/.test(content)) {
            const num = parseInt(content);
            if (!isNaN(num)) {
                if (num > guildStates[guildId].lastNumber) {
                    guildStates[guildId].lastNumber = num;
                    guildStates[guildId].lastUserId = msg.author.id;
                    addLog("Counting", `Synced G:${guildId} to #${num} in <#${channelId}>`);
                    saveState();
                    break;
                }
            }
        }
    }
  } catch (err) {
    console.error(`[Counting] Error during startup recovery for guild ${guildId}:`, err);
  }
}

async function getWebhook(channel) {
  try {
    const webhooks = await channel.fetchWebhooks();
    let countingWebhook = webhooks.find(wh => wh.name === 'Jack-Counting');
    
    if (!countingWebhook) {
      countingWebhook = await channel.createWebhook({
        name: 'Jack-Counting',
        avatar: channel.guild.iconURL(),
        reason: 'Counting Plugin Message Replacement'
      });
    }
    return countingWebhook;
  } catch (err) {
    console.error('[Counting] Error getting/creating webhook:', err);
    return null;
  }
}

module.exports = {
  async load(client) {
    loadState();
    
    const runRecovery = async () => {
        const guildIds = client.guilds.cache.map(g => g.id);
        for (const gid of guildIds) {
            await verifyState(client, gid);
        }
    };

    if (client.isReady()) {
      runRecovery();
    } else {
      client.once('clientReady', () => runRecovery());
    }

    client.on('messageCreate', async (message) => {
      try {
        if (message.author.bot) return;
        if (!message.guild) return;

        const guildId = message.guild.id;
        const config = await configManager.getGuildConfig(guildId);
        const CHANNEL_ID = config?.settings?.countingChannelId;

        if (!CHANNEL_ID || message.channelId !== CHANNEL_ID) return;
        if (!message.content || message.content.length === 0) return;

        const content = message.content.trim();
        
        // Rule: Message must be a valid integer
        if (!/^\d+$/.test(content)) {
          try { await message.delete(); } catch (e) {}
          return;
        }

        const currentNumber = parseInt(content);
        
        // Initialize state if missing
        if (!guildStates[guildId]) {
            guildStates[guildId] = { lastNumber: 0, lastUserId: null };
        }

        const state = guildStates[guildId];

        // Rule: Prevent same user twice in a row
        if (message.author.id === state.lastUserId) {
          try { await message.delete(); } catch (e) {}
          return;
        }

        // Rule: Number must be exactly +1
        if (currentNumber !== state.lastNumber + 1) {
          try { await message.delete(); } catch (e) {}
          return;
        }

        // Valid count
        state.lastNumber = currentNumber;
        state.lastUserId = message.author.id;
        
        // Persist state immediately
        saveState();
        
        try {
          await message.delete().catch(() => {});
          const webhook = await getWebhook(message.channel);
          if (webhook) {
            await webhook.send({
              content: content,
              username: message.member?.displayName || message.author.username,
              avatarURL: message.author.displayAvatarURL({ forceStatic: true })
            });
          }
        } catch (err) {
          console.error('[Counting] Webhook replacement error:', err);
        }
      } catch (err) {
        console.error('[Counting] Runtime error:', err);
      }
    });
  }
};

