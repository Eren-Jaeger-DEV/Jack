const Trigger = require('../../bot/database/models/Trigger');

module.exports = {
  name: "triggers",
  load(client) {
    client.on('messageCreate', async (message) => {
      if (message.author.bot || !message.guild) return;

      try {
        const triggers = await Trigger.find({ 
          guildId: message.guild.id, 
          enabled: true 
        }).lean();

        for (const trig of triggers) {
          if (shouldTrigger(message, trig)) {
            // Check filters
            if (!isAllowed(message, trig)) continue;

            // Execute Actions
            await executeActions(message, trig);
          }
        }
      } catch (err) {
        console.error('[Trigger Plugin Error]:', err);
      }
    });
  }
};

function shouldTrigger(message, trig) {
  const content = message.content;
  const pattern = trig.trigger;

  switch (trig.matchType) {
    case 'exact':
      return content === pattern;
    case 'startswith':
      return content.startsWith(pattern);
    case 'endswith':
      return content.endsWith(pattern);
    case 'strict':
      // Strict in Carl-bot often means "anywhere as a whole word" 
      // but here we'll implement it as substring for now, or use word boundaries
      return new RegExp(`\\b${escapeRegExp(pattern)}\\b`, 'i').test(content);
    case 'substring':
      return content.toLowerCase().includes(pattern.toLowerCase());
    case 'regex':
      try {
        return new RegExp(pattern).test(content);
      } catch (e) {
        return false;
      }
    default:
      return false;
  }
}

function isAllowed(message, trig) {
  const { filters } = trig;
  if (!filters) return true;

  // Channel filters
  if (filters.allowedChannels?.length > 0 && !filters.allowedChannels.includes(message.channel.id)) return false;
  if (filters.ignoredChannels?.includes(message.channel.id)) return false;

  // Role filters
  const memberRoles = message.member.roles.cache.map(r => r.id);
  if (filters.allowedRoles?.length > 0 && !filters.allowedRoles.some(r => memberRoles.includes(r))) return false;
  if (filters.ignoredRoles?.some(r => memberRoles.includes(r))) return false;

  return true;
}

async function executeActions(message, trig) {
  const { actions, response } = trig;

  // 1. Delete message if requested
  if (actions?.deleteTriggeringMessage) {
    await message.delete().catch(() => {});
  }

  // 2. Parse and send response
  if (response) {
    const parsedResponse = parseVariables(response, message);
    if (actions?.dmResponse) {
      await message.author.send(parsedResponse).catch(() => {});
    } else {
      await message.reply(parsedResponse).catch(() => {});
    }
  }

  // 3. Role Actions
  if (actions?.addRoles?.length > 0) {
    for (const roleId of actions.addRoles) {
      await message.member.roles.add(roleId).catch(() => {});
    }
  }
  if (actions?.removeRoles?.length > 0) {
    for (const roleId of actions.removeRoles) {
      await message.member.roles.remove(roleId).catch(() => {});
    }
  }
}

function parseVariables(text, message) {
  return text
    .replace(/{user}/g, message.author.username)
    .replace(/{user.id}/g, message.author.id)
    .replace(/{user.mention}/g, `<@${message.author.id}>`)
    .replace(/{channel}/g, `<#${message.channel.id}>`)
    .replace(/{server}/g, message.guild.name)
    .replace(/{server.id}/g, message.guild.id);
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
