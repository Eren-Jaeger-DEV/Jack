/**
 * plugins/card-database/handlers/cardManager.js
 *
 * Handles the Add Card flow:
 *  1. Button click  → show modal (Name, Rarity)
 *  2. Modal submit  → store pending session, prompt admin to send image in thread
 *  3. messageCreate → detect image upload from admin with a pending session
 *                   → post the formatted card message in the thread
 */

'use strict';

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');

/* ─── Pending sessions: userId → { name, rarity, threadId } ──────────────── */
const pendingSessions = new Map();

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function isAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

async function denyEphemeral(interaction, msg) {
  const payload = { content: msg, flags: MessageFlags.Ephemeral };
  if (interaction.deferred || interaction.replied) return interaction.followUp(payload).catch(() => {});
  return interaction.reply(payload).catch(() => {});
}

/* ─── Step 1: Show Modal ───────────────────────────────────────────────────── */
async function handleAddCard(interaction) {
  if (!isAdmin(interaction.member)) {
    return denyEphemeral(interaction, '❌ Only administrators can add cards.');
  }

  // Must be used inside a thread
  if (!interaction.channel.isThread()) {
    return denyEphemeral(interaction, '❌ Use this button inside a category thread.');
  }

  const modal = new ModalBuilder()
    .setCustomId('cdb_modal_card')
    .setTitle('Add New Card');

  const nameInput = new TextInputBuilder()
    .setCustomId('cdb_card_name')
    .setLabel('Card Name')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. Satoru Gojo')
    .setRequired(true)
    .setMaxLength(100);

  const rarityInput = new TextInputBuilder()
    .setCustomId('cdb_card_rarity')
    .setLabel('Rarity')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. S, A, B, C')
    .setRequired(true)
    .setMaxLength(20);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(rarityInput)
  );

  return interaction.showModal(modal);
}

/* ─── Step 2: Store Session, Prompt for Image ─────────────────────────────── */
async function handleCardModal(interaction) {
  if (!isAdmin(interaction.member)) {
    return denyEphemeral(interaction, '❌ Only administrators can add cards.');
  }

  if (!interaction.channel.isThread()) {
    return denyEphemeral(interaction, '❌ This action must be performed inside a category thread.');
  }

  const name   = interaction.fields.getTextInputValue('cdb_card_name')?.trim();
  const rarity = interaction.fields.getTextInputValue('cdb_card_rarity')?.trim();

  if (!name || !rarity) {
    return denyEphemeral(interaction, '❌ Name and Rarity are required.');
  }

  // Store pending session
  pendingSessions.set(interaction.user.id, {
    name,
    rarity,
    threadId: interaction.channel.id
  });

  // Auto-expire session after 5 minutes
  setTimeout(() => pendingSessions.delete(interaction.user.id), 5 * 60 * 1000);

  await interaction.reply({
    content:
      `✅ Card info saved!\n\n` +
      `**Name:** ${name}\n**Rarity:** ${rarity}\n\n` +
      `📎 Now **send a message with an image attachment** in this thread to complete the card.`,
    flags: MessageFlags.Ephemeral
  }).catch(() => {});
}

/* ─── Step 3: Detect Image Upload ─────────────────────────────────────────── */
async function handleImageUpload(message) {
  // Ignore bots and DMs
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.channel.isThread()) return;

  const session = pendingSessions.get(message.author.id);
  if (!session) return;

  // Must be in the same thread the modal was triggered in
  if (message.channel.id !== session.threadId) return;

  // Must have an image attachment
  const attachment = message.attachments.find(
    a => a.contentType?.startsWith('image/')
  );
  if (!attachment) return;

  // Clear session immediately to prevent double-posting
  pendingSessions.delete(message.author.id);

  try {
    const cardContent =
      `Name: ${session.name}\n` +
      `Rarity: ${session.rarity}`;

    // Re-upload the image to create a permanent bot message first
    const sent = await message.channel.send({
      content: cardContent,
      files: [{ attachment: attachment.url, name: attachment.name }]
    });

    if (sent) {
      // Delete the raw upload ONLY after successful re-upload
      await message.delete().catch(() => {});
    }
  } catch (err) {
    console.error('[CardDB] handleImageUpload error:', err.message);
    // Restore session so admin can try again
    pendingSessions.set(message.author.id, session);
  }
}

module.exports = { handleAddCard, handleCardModal, handleImageUpload };
