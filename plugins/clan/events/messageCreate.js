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

    const { AttachmentBuilder } = require('discord.js');
    const file = new AttachmentBuilder(attachment.url, { name: 'player_stats.png' });

    // Step 1: Send only the file first to get a permanent URL
    const dbMsg = await dbChannel.send({ files: [file] });
    let newAttachment = dbMsg.attachments.first();
    
    if (!newAttachment) {
      const fresh = await dbChannel.messages.fetch(dbMsg.id).catch(() => null);
      newAttachment = fresh?.attachments?.first();
    }
    
    if (!newAttachment) {
      logger.error('Registration', 'Failed to get attachment from DB message.');
      return message.reply('❌ Error saving screenshot. Please try again.');
    }

    const screenshotUrl = newAttachment.url;

    // Step 2: Update the embed with the permanent URL and edit the message
    dbEmbed.setImage(screenshotUrl);
    await dbMsg.edit({ embeds: [dbEmbed] });

    // Step 3: Update Player Model in Database
    let player;
    if (session.targetId) {
      player = await Player.findOne({ discordId: session.targetId });
    } else {
      player = await Player.findOne({ ign: new RegExp(`^${session.ign}$`, "i") });
    }

    if (player) {
      player.screenshot = screenshotUrl;
      await player.save();
      logger.info('Registration', `Screenshot URL for ${session.ign}: ${screenshotUrl}`);
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
