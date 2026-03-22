const CONFIG = {
  CHANNEL_ID: '1478790421369983179'
};

let lastNumber = 0;
let lastUserId = null;

module.exports = {
  load(client) {
    console.log('[Counting] Counting plugin loaded.');

    client.on('messageCreate', async (message) => {
      // Basic checks
      if (message.author.bot) return;
      if (message.channelId !== CONFIG.CHANNEL_ID) return;
      
      // Rule 6: Ignore non-text messages (e.g. attachments only)
      if (!message.content || message.content.length === 0) return;

      const content = message.content.trim();
      
      // Rule 2: Message must be a valid integer (no text, emojis, spaces)
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
      
      // Successfully updated state (in-memory only as per constraints)
      console.log(`[Counting] Correct number: ${lastNumber} by ${message.author.username}`);
    });
  }
};
