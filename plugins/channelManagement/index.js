const { PermissionFlagsBits } = require('discord.js');

const CONFIG = {
  GENERAL_CHAT_ID: '1341978656096129065',
  MEDIA_CHANNEL_ID: '1341978656096129067',
  LINKS_CHANNEL_ID: '1429740389731930162',
  BOT_COMMANDS_CHANNEL_ID: '1399825266360057917'
};

const COMMAND_PREFIXES = ['j', 'J', 'jack', 'Jack', '!', 'A', '/'];
const URL_REGEX = /https?:\/\/[^\s$.?#].[^\s]*/i;

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
      
      // 4. PRIORITY FEATURE: Strict Bot Command Detection
      if (content) {
        const lowerContent = content.toLowerCase();
        const isCommand = COMMAND_PREFIXES.some(prefix => {
          const p = prefix.toLowerCase();
          // Precise prefix checking
          return lowerContent === p || 
                 lowerContent.startsWith(p + ' ') || 
                 (p.length === 1 && lowerContent.startsWith(p)); // For !, A, /
        });

        if (isCommand) {
          await message.delete().catch(() => {});
          return sendWarning(message, `Use bot commands in <#${CONFIG.BOT_COMMANDS_CHANNEL_ID}>`);
        }
      }

      // 5. FEATURE: Media Restriction
      if (message.attachments.size > 0) {
        await message.delete().catch(() => {});
        return sendWarning(message, `Send media in <#${CONFIG.MEDIA_CHANNEL_ID}>`);
      }

      // 6. FEATURE: Link Restriction
      if (content && URL_REGEX.test(content)) {
        await message.delete().catch(() => {});
        return sendWarning(message, `Send links in <#${CONFIG.LINKS_CHANNEL_ID}>`);
      }
    });
  }
};
