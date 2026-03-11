const { AttachmentBuilder } = require("discord.js");

/**
 * Generates a plain text transcript for a specific channel.
 * @param {import('discord.js').TextChannel} channel
 * @returns {Promise<import('discord.js').AttachmentBuilder>}
 */
async function generateTranscript(channel) {
  try {
    let messages = [];
    let lastId = null;

    // Fetch all messages in chunks of 100
    while (true) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;

      const fetched = await channel.messages.fetch(options);
      if (fetched.size === 0) break;

      messages.push(...Array.from(fetched.values()));
      
      if (fetched.size < 100) break;
      lastId = fetched.last().id;
    }

    // Sort chronologically (oldest first)
    messages.reverse();

    let transcriptText = `--- Transcript for #${channel.name} ---\n`;
    transcriptText += `Generated at: ${new Date().toUTCString()}\n\n`;

    for (const msg of messages) {
      const type = msg.author.bot ? "[BOT]" : "[USER]";
      // Replace any potential line breaks in content to keep format clean, 
      // or just keep them raw by rendering them with correct indentation
      const content = msg.content ? msg.content.replace(/\n/g, "\n    ") : "";
      
      transcriptText += `[${msg.createdAt.toLocaleString()}] ${type} ${msg.author.username}: ${content}\n`;
      
      if (msg.embeds.length > 0) {
        transcriptText += `    [Embed Attached]\n`;
      }
      
      if (msg.attachments.size > 0) {
        const urls = msg.attachments.map(a => a.url).join(", ");
        transcriptText += `    [Attachments: ${urls}]\n`;
      }
    }

    const buffer = Buffer.from(transcriptText, "utf-8");
    return new AttachmentBuilder(buffer, { name: `${channel.name}-transcript.txt` });

  } catch (error) {
    console.error("Transcript Error:", error);
    return null;
  }
}

module.exports = { generateTranscript };
