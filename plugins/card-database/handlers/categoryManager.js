/**
 * plugins/card-database/handlers/categoryManager.js
 *
 * Handles the Add Category flow:
 *  1. Button click → modal (category name)
 *  2. Modal submit  → create a public thread, post category panel inside
 */

'use strict';

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function isAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

async function denyEphemeral(interaction, msg) {
  const payload = { content: msg, flags: MessageFlags.Ephemeral };
  if (interaction.deferred || interaction.replied) return interaction.followUp(payload).catch(() => {});
  return interaction.reply(payload).catch(() => {});
}

/* ─── Category Panel (inside thread) ──────────────────────────────────────── */
function buildCategoryPanel(categoryName) {
  const embed = new EmbedBuilder()
    .setTitle(`📁 ${categoryName}`)
    .setDescription(
      '**Add cards to this category using the button below.**\n\n' +
      '🃏 Each card requires a **Name**, **Rarity**, and an **image**.\n' +
      '> After filling in the modal, send your image in this thread.'
    )
    .setColor(0xF1C40F)
    .setFooter({ text: 'Card Database — Category Panel' })
    .setTimestamp();

  const addCardBtn = new ButtonBuilder()
    .setCustomId('cdb_add_card')
    .setLabel('Add Card')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('🃏');

  const deleteCatBtn = new ButtonBuilder()
    .setCustomId('cdb_delete_cat')
    .setLabel('Delete Category')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🗑️');

  const row = new ActionRowBuilder().addComponents(addCardBtn, deleteCatBtn);
  return { embeds: [embed], components: [row] };
}

/* ─── Step 1: Show Modal ───────────────────────────────────────────────────── */
async function handleAddCategory(interaction) {
  if (!isAdmin(interaction.member)) {
    return denyEphemeral(interaction, '❌ Only administrators can add categories.');
  }

  const modal = new ModalBuilder()
    .setCustomId('cdb_modal_cat')
    .setTitle('Add New Category');

  const nameInput = new TextInputBuilder()
    .setCustomId('cdb_cat_name')
    .setLabel('Category Name')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. Jujutsu Kaisen')
    .setRequired(true)
    .setMaxLength(80);

  modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
  return interaction.showModal(modal);
}

/* ─── Step 2: Create Thread + Send Panel ──────────────────────────────────── */
async function handleCategoryModal(interaction) {
  if (!isAdmin(interaction.member)) {
    return denyEphemeral(interaction, '❌ Only administrators can add categories.');
  }

  const categoryName = interaction.fields.getTextInputValue('cdb_cat_name')?.trim();
  if (!categoryName) return denyEphemeral(interaction, '❌ Category name cannot be empty.');

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const channel = interaction.channel;

    // Create a public thread in the database channel
    const thread = await channel.threads.create({
      name: categoryName,
      type: ChannelType.PublicThread,
      reason: `Card Database — new category: ${categoryName}`
    }).catch(err => {
      console.error('[CardDB] Failed to create thread:', err.message);
      return null;
    });

    if (!thread) {
      return interaction.followUp({ content: '❌ Could not create thread. Please try again.', flags: MessageFlags.Ephemeral });
    }

    // Post the category panel inside the thread
    await thread.send(buildCategoryPanel(categoryName)).catch(() => {});

    await interaction.followUp({
      content: `✅ Category **${categoryName}** created! Thread: ${thread}`,
      flags: MessageFlags.Ephemeral
    });
  } catch (err) {
    console.error('[CardDB] handleCategoryModal error:', err.message);
    await interaction.followUp({ content: '❌ Something went wrong.', flags: MessageFlags.Ephemeral });
  }
}

/* ─── Delete Category ──────────────────────────────────────────────────────── */
async function handleDeleteCategory(interaction) {
  if (!isAdmin(interaction.member)) {
    return denyEphemeral(interaction, '❌ Only administrators can delete categories.');
  }

  if (!interaction.channel.isThread()) {
    return denyEphemeral(interaction, '❌ This button must be used inside a category thread.');
  }

  const categoryName = interaction.channel.name;

  try {
    // Delete the thread
    await interaction.channel.delete(`Card Database — category deleted by ${interaction.user.tag}`);
    
    // interaction.reply() will fail because the channel is deleted,
    // so we don't bother sending a confirmation to the channel itself.
    console.log(`[CardDB] Category "${categoryName}" deleted by ${interaction.user.tag}.`);
  } catch (err) {
    console.error('[CardDB] handleDeleteCategory error:', err.message);
    await denyEphemeral(interaction, `❌ Failed to delete category: ${err.message}`);
  }
}

module.exports = { handleAddCategory, handleCategoryModal, handleDeleteCategory };
