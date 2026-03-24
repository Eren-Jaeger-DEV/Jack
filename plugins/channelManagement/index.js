const { PermissionFlagsBits } = require('discord.js');
const GuildConfig = require('../../bot/database/models/GuildConfig');

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
    // Silenced

    client.on('messageCreate', async (message) => {
      // 1. SAFETY: Ignore messages from Jack itself
      if (message.author.id === client.user.id) return;
      if (!message.guild) return;

      // Fetch dynamic configuration
      const config = await GuildConfig.findOne({ guildId: message.guild.id }).catch(() => null);
      const CHANNELS = config?.channels || {};
      
      const GENERAL_CHAT_ID = CHANNELS.general || '1341978656096129065';
      const MEDIA_CHANNEL_ID = CHANNELS.media || '1341978656096129067';
      const LINKS_CHANNEL_ID = CHANNELS.links || '1429740389731930162';
      const BOT_COMMANDS_CHANNEL_ID = CHANNELS.commands || '1399825266360057917';
      
      // Target check: General Chat only
      if (message.channelId !== GENERAL_CHAT_ID) return;

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
          return sendWarning(message, `Use bot commands in <#${BOT_COMMANDS_CHANNEL_ID}>`);
        }

        // FEATURE 2: Link Detection (Priority 2)
        // Check for links, but whitelist GIFs
        if (LINK_REGEX.test(content)) {
          // If it's a GIF link, allow it
          if (GIF_REGEX.test(content)) {
             // Allow GIFs
          } else {
            await message.delete().catch(() => {});
            return sendWarning(message, `Send links in <#${LINKS_CHANNEL_ID}>`);
          }
        }
      }

      // FEATURE 3: Media Restriction (Priority 3)
      if (message.attachments.size > 0) {
        // Check if all attachments are GIFs
        const hasNonGif = message.attachments.some(a => !a.contentType || !a.contentType.includes('gif'));
        
        if (hasNonGif) {
          await message.delete().catch(() => {});
          return sendWarning(message, `Send media in <#${MEDIA_CHANNEL_ID}>`);
        }
        // If they are all GIFs, allow it.
      }
    });
  }
};
