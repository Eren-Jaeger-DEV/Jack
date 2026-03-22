const { PermissionFlagsBits } = require('discord.js');

const CONFIG = {
  GENERAL_CHAT_ID: '1341978656096129065',
  MEDIA_CHANNEL_ID: '1341978656096129067',
  LINKS_CHANNEL_ID: '1429740389731930162',
  BOT_COMMANDS_CHANNEL_ID: '1399825266360057917'
};

// Precise regex for links, including common TLDs and discord.gg
const LINK_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.gg\/[^\s]+)|([^\s]+\.(com|net|org|io|me|xyz)([^\s]*)?)/i;
// Regex for GIF links from Tenor and Giphy
const GIF_REGEX = /(tenor\.com\/view\/|giphy\.com\/gifs\/|media\.giphy\.com\/media\/)/i;

async function sendWarning(message, text) {
  try {
    const warning = await message.channel.send({ content: `${message.author}, ${text}` });
    setTimeout(() => {
      warning.delete().catch(() => {});
    }, 7000); // Delete after 7 seconds
  } catch (err) {
    // Fail silently
  }
}

module.exports = {
  load(client) {
    console.log('[ChannelManagement] Channel Management plugin loaded.');

    client.on('messageCreate', async (message) => {
      // 1. SAFETY: Ignore messages from Jack itself
      if (message.author.id === client.user.id) return;
      
      // Target check: General Chat only
      if (message.channelId !== CONFIG.GENERAL_CHAT_ID) return;
      if (!message.guild) return;

      // 2. FEATURE: Delete other bot responses
      if (message.author.bot) {
        return message.delete().catch(() => {});
      }

      // 3. PERMISSION: Admins and Owner bypass all remaining restrictions
      if (message.member.permissions.has(PermissionFlagsBits.Administrator) || message.guild.ownerId === message.author.id) {
        return;
      }

      const content = message.content.trim();
      
      // 4. PRIORITY SYSTEM: Commands > Links > Media (Attachments + GIF links)
      
      if (content) {
        const lowerContent = content.toLowerCase();
        
        // FEATURE 1: Bot Command Detection (Priority 1)
        // Strict prefixes (!, /) vs Word prefixes (j, jack, a)
        const isStrictPrefix = lowerContent.startsWith('!') || lowerContent.startsWith('/');
        const isWordCommand = ['j', 'jack', 'a'].some(p => lowerContent === p || lowerContent.startsWith(p + ' '));

        if (isStrictPrefix || isWordCommand) {
          await message.delete().catch(() => {});
          return sendWarning(message, `Use bot commands in <#${CONFIG.BOT_COMMANDS_CHANNEL_ID}>`);
        }

        // FEATURE 2: Link Detection (Priority 2)
        if (LINK_REGEX.test(content)) {
          await message.delete().catch(() => {});
          return sendWarning(message, `Send links in <#${CONFIG.LINKS_CHANNEL_ID}>`);
        }

        // FEATURE 3.1: GIF Link Detection (Priority 3.1)
        if (GIF_REGEX.test(content)) {
          await message.delete().catch(() => {});
          return sendWarning(message, `Send media in <#${CONFIG.MEDIA_CHANNEL_ID}>`);
        }
      }

      // FEATURE 3.2: Media Restriction (Priority 3.2)
      if (message.attachments.size > 0) {
        await message.delete().catch(() => {});
        return sendWarning(message, `Send media in <#${CONFIG.MEDIA_CHANNEL_ID}>`);
      }
    });
  }
};
