const perms = require('../../bot/utils/permissionUtils');
const configManager = require('../../bot/utils/configManager');

// Precise regex for links, including common TLDs and discord.gg
const LINK_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.gg\/[^\s]+)|([^\s]+\.(com|net|org|io|me|xyz)([^\s]*)?)/i;
// Regex for GIF links from Tenor, Giphy, and direct .gif extensions
const GIF_REGEX = /(tenor\.com\/[^\s]+)|([^\s]+\.gif(\?[^\s]*)?)|(giphy\.com\/gifs\/[^\s]+)|(media\.giphy\.com\/media\/[^\s]+)|(giphy\.com\/media\/[^\s]+)/i;

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
    client.on('messageCreate', async (message) => {
      // 1. SAFETY: Ignore messages from Jack itself
      if (message.author.id === client.user.id) return;
      if (!message.guild || !message.member) return;

      // 2. PERMISSION: RBAC Bypass (Admins, Contributors, Managers, PapaPlayer, and Clan Boosters)
      // Boosters and Staff can bypass all chat restrictions in General.
      if (perms.hasExtraPerks(message.member)) {
        return;
      }

      // Fetch dynamic configuration
      const config = await configManager.getGuildConfig(message.guild.id);
      if (!config) return;

      const {
        generalChannelId,
        mediaChannelId,
        linksChannelId,
        botCommandsChannelId
      } = config.settings || {};
      
      // Target check: General Chat only
      if (message.channelId !== generalChannelId) return;

      // 3. FEATURE: Delete other bot responses
      if (message.author.bot) {
        return message.delete().catch(() => {});
      }

      const content = message.content.trim();
      
      // 4. PRIORITY SYSTEM: Commands > Links > Media (Attachments + GIF links)
      
      if (content) {
        const lowerContent = content.toLowerCase();
        
        // FEATURE 1: Bot Command Detection (Priority 1)
        const isStrictPrefix = lowerContent.startsWith('!') || lowerContent.startsWith('/');
        const isWordCommand = ['j', 'jack', 'a'].some(p => lowerContent === p || lowerContent.startsWith(p + ' '));

        if (isStrictPrefix || isWordCommand) {
          await message.delete().catch(() => {});
          return sendWarning(message, `Use bot commands in <#${botCommandsChannelId}>`);
        }

        // FEATURE 2: Link Detection (Priority 2)
        if (LINK_REGEX.test(content)) {
          if (!GIF_REGEX.test(content)) {
            await message.delete().catch(() => {});
            return sendWarning(message, `Send links in <#${linksChannelId}>`);
          }
        }
      }

      // FEATURE 3: Media Restriction (Priority 3)
      if (message.attachments.size > 0) {
        const hasNonGif = message.attachments.some(a => !a.contentType || !a.contentType.includes('gif'));
        if (hasNonGif) {
          await message.delete().catch(() => {});
          return sendWarning(message, `Send media in <#${mediaChannelId}>`);
        }
      }
    });
  }
};
