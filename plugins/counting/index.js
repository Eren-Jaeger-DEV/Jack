const fs = require('fs');
const path = require('path');
const { addLog } = require('../../utils/logger');
const GuildConfig = require('../../bot/database/models/GuildConfig');

const CONFIG = {
  DEFAULT_CHANNEL_ID: '1478790421369983179',
  DATA_PATH: path.join(__dirname, 'data.json')
};

let lastNumber = 0;
let lastUserId = null;
let countingWebhook = null;

function saveState() {
  try {
    fs.writeFileSync(CONFIG.DATA_PATH, JSON.stringify({ lastNumber, lastUserId }, null, 2));
  } catch (err) {
    console.error('[Counting] Error saving state:', err);
  }
}

function loadState() {
  try {
    if (fs.existsSync(CONFIG.DATA_PATH)) {
      const stored = JSON.parse(fs.readFileSync(CONFIG.DATA_PATH, 'utf8'));
      lastNumber = stored.lastNumber || 0;
      lastUserId = stored.lastUserId || null;
    }
  } catch (err) {
    console.error('[Counting] Error loading state:', err);
  }
}

async function verifyState(client) {
  try {
    // For now, we sync with the default channel or the first one found in configs
    let channelId = CONFIG.DEFAULT_CHANNEL_ID;
    const config = await GuildConfig.findOne({ "channels.counting": { $exists: true, $ne: "" } });
    if (config?.channels?.counting) channelId = config.channels.counting;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    const messages = await channel.messages.fetch({ limit: 50 });
    
    // Find the very latest message that is a number
    for (const msg of messages.values()) {
        const content = msg.content.trim();
        if (/^\d+$/.test(content)) {
            const num = parseInt(content);
            if (!isNaN(num)) {
                if (num > 0) {
                    lastNumber = num;
                    addLog("Counting", `Synced to #${lastNumber} in <#${channelId}>`);
                    break;
                }
            }
        }
    }
  } catch (err) {
    console.error('[Counting] Error during startup recovery:', err);
  }
}

async function getWebhook(channel) {
  if (countingWebhook) return countingWebhook;
  
  try {
    const webhooks = await channel.fetchWebhooks();
    countingWebhook = webhooks.find(wh => wh.name === 'Jack-Counting');
    
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
  load(client) {
    loadState();
    
    if (client.isReady()) {
      verifyState(client);
    } else {
      client.once('ready', () => verifyState(client));
    }

    client.on('messageCreate', async (message) => {
      if (message.author.bot) return;
      if (!message.guild) return;

      const config = await GuildConfig.findOne({ guildId: message.guild.id }).catch(() => null);
      const CHANNEL_ID = config?.channels?.counting || CONFIG.DEFAULT_CHANNEL_ID;

      if (message.channelId !== CHANNEL_ID) return;
      if (!message.content || message.content.length === 0) return;

      const content = message.content.trim();
      
      // Rule: Message must be a valid integer
      if (!/^\d+$/.test(content)) {
        try { await message.delete(); } catch (e) {}
        return;
      }

      const currentNumber = parseInt(content);

      // Rule: Prevent same user twice in a row
      if (message.author.id === lastUserId) {
        try { await message.delete(); } catch (e) {}
        return;
      }

      // Rule: Number must be exactly +1
      if (currentNumber !== lastNumber + 1) {
        try { await message.delete(); } catch (e) {}
        return;
      }

      // Valid count
      lastNumber = currentNumber;
      lastUserId = message.author.id;
      
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
    });
  }
};
