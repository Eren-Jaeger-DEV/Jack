const discordTranscripts = require("discord-html-transcripts");

/**
 * Generates an HTML transcript for a specific channel.
 * @param {import('discord.js').TextChannel} channel
 * @returns {Promise<import('discord.js').AttachmentBuilder>}
 */
async function generateTranscript(channel) {
  try {
    const attachment = await discordTranscripts.createTranscript(channel, {
      limit: -1,
      returnType: "attachment",
      fileName: `${channel.name}-transcript.html`,
      saveImages: true,
      poweredBy: false
    });
    return attachment;
  } catch (error) {
    console.error("Transcript Error:", error);
    return null;
  }
}

module.exports = { generateTranscript };
