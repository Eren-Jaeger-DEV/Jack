const CONFIG = {
  CHANNEL_ID: '1478790421369983179'
};

let lastNumber = 0;
let lastUserId = null;
let countingWebhook = null;

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
    console.log('[Counting] Counting plugin loaded.');

    client.on('messageCreate', async (message) => {
      // Basic checks
      if (message.author.bot) return;
      if (message.channelId !== CONFIG.CHANNEL_ID) return;
      
      // Rule 6: Ignore non-text messages
      if (!message.content || message.content.length === 0) return;

      const content = message.content.trim();
      
      // Rule 2: Message must be a valid integer
      if (!/^\d+$/.test(content)) {
        try { await message.delete(); } catch (e) {}
        return;
      }

      const currentNumber = parseInt(content);

      // Rule 4: Prevent same user from counting twice in a row
      if (message.author.id === lastUserId) {
        try { await message.delete(); } catch (e) {}
        return;
      }

      // Rule 2 & 3: Number must be exactly +1 from previous number
      if (currentNumber !== lastNumber + 1) {
        try { await message.delete(); } catch (e) {}
        return;
      }

      // If we reach here, the number is correct
      lastNumber = currentNumber;
      lastUserId = message.author.id;
      
      // NEW BEHAVIOR: Webhook Message Replacement
      try {
        // Delete user message first to avoid confusion
        await message.delete().catch(() => {});
        
        // Get or create webhook for this channel
        const webhook = await getWebhook(message.channel);
        if (webhook) {
          await webhook.send({
            content: content,
            username: message.member?.displayName || message.author.username,
            avatarURL: message.author.displayAvatarURL({ forceStatic: true })
          });
        } else {
          // Fallback if webhook fails: notify channel maybe? 
          // For now, fail silently as per requirements.
        }
      } catch (err) {
        console.error('[Counting] Webhook replacement error:', err);
      }
      
      console.log(`[Counting] Correct number: ${lastNumber} by ${message.author.username} (Webhook Replacement)`);
    });
  }
};
