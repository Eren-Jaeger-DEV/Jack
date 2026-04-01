const fosterService = require('../services/fosterService');

/**
 * messageCreate.js — Hub for thread-based registrations.
 * Listens for IGN inputs in the Mentor, Neophyte, and Veteran threads.
 */
module.exports = async (client, message) => {
  if (message.author.bot || !message.guild) return;

  // 1. Fetch active program to see if we are in REGISTRATION phase
  const program = await fosterService.getActiveProgram(message.guild.id);
  if (!program || program.status !== 'REGISTRATION') return;

  const threadId = message.channel.id;
  const reg = program.registration;

  // 2. Determine which category the thread belongs to
  let roleType = null;
  if (threadId === reg.mentorThreadId) roleType = 'MENTOR';
  else if (threadId === reg.neophyteThreadId) roleType = 'NEOPHYTE';
  else if (threadId === reg.veteranThreadId) roleType = 'VETERAN';

  if (!roleType) return;

  // 3. Process the registration
  try {
    await fosterService.processThreadRegistration(message, roleType);
  } catch (err) {
    console.error('[FosterProgram] Thread registration error:', err.message);
  }
};
