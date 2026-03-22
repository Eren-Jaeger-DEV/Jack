const { PermissionFlagsBits } = require('discord.js');

const CONFIG = {
  GENERAL_CHAT_ID: '1341978656096129065',
  MEDIA_CHANNEL_ID: '1341978656096129067',
  LINKS_CHANNEL_ID: '1429740389731930162',
  BOT_COMMANDS_CHANNEL_ID: '1399825266360057917'
};

const COMMAND_PREFIXES = ['j', 'J', 'jack', 'Jack', '/'];
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
      // Basic checks
      if (message.author.bot) return;
      if (message.channelId !== CONFIG.GENERAL_CHAT_ID) return;
      if (!message.guild) return;

      // Permission check: Ignore Admins and Server Owner
      if (message.member.permissions.has(PermissionFlagsBits.Administrator) || message.guild.ownerId === message.author.id) {
        return;
      }

      // Feature 2: Media Restriction
      if (message.attachments.size > 0) {
        await message.delete().catch(() => {});
        return sendWarning(message, `Send media in <#${CONFIG.MEDIA_CHANNEL_ID}>`);
      }

      const content = message.content.trim();
      if (!content) return;

      // Feature 3: Link Restriction
      if (URL_REGEX.test(content)) {
        await message.delete().catch(() => {});
        return sendWarning(message, `Send links in <#${CONFIG.LINKS_CHANNEL_ID}>`);
      }

      // Feature 4: Bot Command Restriction
      const lowerContent = content.toLowerCase();
      const isCommand = COMMAND_PREFIXES.some(prefix => {
        const p = prefix.toLowerCase();
        return lowerContent === p || lowerContent.startsWith(p + ' ') || (p === '/' && lowerContent.startsWith('/'));
      });

      if (isCommand) {
        await message.delete().catch(() => {});
        return sendWarning(message, `Use bot commands in <#${CONFIG.BOT_COMMANDS_CHANNEL_ID}>`);
      }
    });
  }
};
