/**
 * plugins/clan/events/messageCreate.js
 * 
 * Listens for messages in the registration panel channel to capture and process
 * player stat card screenshots.
 */

const regService = require('../services/registrationService');
const Player = require('../../../bot/database/models/Player');
const logger = require('../../../utils/logger');
const { EmbedBuilder } = require('discord.js');

module.exports = async (client, message) => {
  if (message.author.bot || !message.guild) return;

  // Check if message is in the panel channel
  if (message.channel.id !== regService.PANEL_CHANNEL_ID) return;

  // Check if the user has an active registration session
  const session = regService.getSession(message.author.id);
  if (!session) return;

  // Look for image attachments
  const attachment = message.attachments.find(a => 
    a.contentType?.startsWith('image/') || 
    /\.(png|jpg|jpeg|webp)$/i.test(a.name || '')
  );

  if (!attachment) return;

  try {
    logger.info('Registration', `Processing screenshot for ${message.author.tag} (${session.ign})`);

    // 1. Forward to Player DB Channel
    const dbChannel = await client.channels.fetch(regService.DB_CHANNEL_ID).catch(() => null);
    if (!dbChannel) {
      logger.error('Registration', `DB Channel ${regService.DB_CHANNEL_ID} not found.`);
      return message.reply('❌ Error: Screenshot database channel not found. Please contact an admin.');
    }

    const dbEmbed = new EmbedBuilder()
      .setTitle(`📄 Player Profile: ${session.ign}`)
      .setDescription(
        `**Discord:** <@${message.author.id}> (${message.author.tag})\n` +
        `**Status:** ${session.isClan ? 'Clan Member' : 'Discord Member'}\n` +
        `**Timestamp:** <t:${Math.floor(Date.now() / 1000)}:F>`
      )
      .setImage(attachment.url)
      .setColor(session.isClan ? '#FFD700' : '#00FFCC')
      .setFooter({ text: `ID: ${message.author.id}` });

    const dbMsg = await dbChannel.send({ embeds: [dbEmbed] });

    // 2. Update Player Model in Database
    const player = await Player.findOne({ discordId: message.author.id });
    if (player) {
      player.screenshot = dbMsg.url; // Save the message link or image URL
      await player.save();
    }

    // 3. Cleanup & Confirmation
    regService.endSession(message.author.id);
    
    const confirmMsg = await message.reply(`✅ **Registration Complete!** Your screenshot for **${session.ign}** has been verified and saved to the secure database.`);
    
    // Delete the original upload message after a short delay
    setTimeout(async () => {
      await message.delete().catch(() => {});
      // Also delete the confirmation message after some time to keep channel clean
      setTimeout(() => confirmMsg.delete().catch(() => {}), 10000);
    }, 2000);

  } catch (err) {
    logger.error('Registration', `Screenshot processing failed: ${err.message}`);
    await message.reply('❌ An error occurred while processing your screenshot. Please try again or contact an admin.').catch(() => {});
  }
};
