/**
 * plugins/card-exchange/handlers/exchangeHandler.js
 *
 * Core engine for the Card Exchange system.
 *
 * Handles:
 *  • "Post Exchange" button → role check → modal
 *  • Modal submission → validate → post exchange embed
 *  • "Interested" button → prevent self-click → create private thread
 *
 * State (in-memory):
 *  activeExchanges: Map<userId, messageId>
 *  cooldowns:       Map<userId, timestamp>
 */

'use strict';

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  ChannelType
} = require('discord.js');

/* ─── Config ─────────────────────────────────────────────────────────────── */
const EXCHANGE_CHANNEL_ID = '1486943351403184169';
const TRADER_ROLE_ID      = '1486942697976631326';
const COOLDOWN_MS         = 5 * 60 * 1000; // 5 minutes

/* ─── State ──────────────────────────────────────────────────────────────── */
/** @type {Map<string, string>} userId → messageId */
const activeExchanges = new Map();

/** @type {Map<string, number>} userId → timestamp */
const cooldowns = new Map();

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

/**
 * Check if a member has the Trader role.
 * @param {import('discord.js').GuildMember} member
 * @returns {boolean}
 */
function hasTraderRole(member) {
  return member.roles.cache.has(TRADER_ROLE_ID);
}

/**
 * Ephemeral deny reply.
 * @param {import('discord.js').Interaction} interaction
 * @param {string} message
 */
async function denyEphemeral(interaction, message) {
  const payload = { content: message, flags: MessageFlags.Ephemeral };
  if (interaction.deferred || interaction.replied) {
    return interaction.followUp(payload).catch(() => {});
  }
  return interaction.reply(payload).catch(() => {});
}

/**
 * Format remaining cooldown as mm:ss.
 * @param {number} remainingMs
 * @returns {string}
 */
function formatCooldown(remainingMs) {
  const secs = Math.ceil(remainingMs / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

/* ─── Modal Builder ──────────────────────────────────────────────────────── */

function buildPostModal() {
  const modal = new ModalBuilder()
    .setCustomId('cex_modal_post')
    .setTitle('Post a Card Exchange');

  const wantedInput = new TextInputBuilder()
    .setCustomId('cex_wanted')
    .setLabel('Card you are LOOKING FOR')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. Legendary Dragon')
    .setRequired(true)
    .setMaxLength(60);

  const offerInput = new TextInputBuilder()
    .setCustomId('cex_offer')
    .setLabel('Offering (max 3 cards, comma-separated)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. Fire Sprite, Stone Golem, Wind Elf')
    .setRequired(true)
    .setMaxLength(120);

  const codeInput = new TextInputBuilder()
    .setCustomId('cex_code')
    .setLabel('Exchange Code (optional)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. ABCD-1234')
    .setRequired(false)
    .setMaxLength(30);

  modal.addComponents(
    new ActionRowBuilder().addComponents(wantedInput),
    new ActionRowBuilder().addComponents(offerInput),
    new ActionRowBuilder().addComponents(codeInput)
  );

  return modal;
}

/* ─── Exchange Embed Builder ─────────────────────────────────────────────── */

/**
 * Build the exchange post embed.
 * @param {import('discord.js').User} user
 * @param {string} wanted
 * @param {string[]} offered
 * @param {string|null} code
 * @returns {EmbedBuilder}
 */
function buildExchangeEmbed(user, wanted, offered, code) {
  const offeredStr = offered.map((c, i) => `\`${i + 1}.\` ${c.trim()}`).join('\n');

  return new EmbedBuilder()
    .setTitle('🔄 Card Exchange Request')
    .setDescription(`<@${user.id}> is looking to exchange cards!`)
    .addFields(
      { name: '🔍 Looking For', value: wanted, inline: true },
      { name: '🎁 Offering',    value: offeredStr, inline: true },
      ...(code ? [{ name: '🔑 Exchange Code', value: `\`${code}\``, inline: false }] : [])
    )
    .setColor(0x2ECC71)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `Posted by ${user.username}` })
    .setTimestamp();
}

/* ─── Interaction Handlers ───────────────────────────────────────────────── */

/**
 * Handle "Post Exchange" button click.
 */
async function handlePostButton(interaction) {
  // Channel check
  if (interaction.channelId !== EXCHANGE_CHANNEL_ID) {
    return denyEphemeral(interaction, '❌ This system only works in the designated exchange channel.');
  }

  // Role check
  if (!hasTraderRole(interaction.member)) {
    return denyEphemeral(interaction, '❌ You need the **Trader** role to post an exchange.');
  }

  // Active exchange check
  if (activeExchanges.has(interaction.user.id)) {
    return denyEphemeral(interaction, '❌ You already have an active exchange! Wait for it to close before posting another.');
  }

  // Cooldown check
  const lastPost = cooldowns.get(interaction.user.id);
  if (lastPost) {
    const elapsed = Date.now() - lastPost;
    if (elapsed < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - elapsed;
      return denyEphemeral(interaction, `⏳ You are on cooldown! Please wait **${formatCooldown(remaining)}** before posting again.`);
    }
  }

  // Show modal
  return interaction.showModal(buildPostModal());
}

/**
 * Handle modal submission (Post Exchange).
 */
async function handlePostModal(interaction) {
  // Channel check
  if (interaction.channelId !== EXCHANGE_CHANNEL_ID) {
    return denyEphemeral(interaction, '❌ This system only works in the designated exchange channel.');
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const wanted   = interaction.fields.getTextInputValue('cex_wanted').trim();
  const offerRaw = interaction.fields.getTextInputValue('cex_offer').trim();
  const code     = interaction.fields.getTextInputValue('cex_code')?.trim() || null;

  // Parse + validate offered cards
  const offered = offerRaw.split(',').map(c => c.trim()).filter(Boolean);

  if (offered.length === 0) {
    return interaction.followUp({ content: '❌ You must offer at least one card.', flags: MessageFlags.Ephemeral });
  }

  if (offered.length > 3) {
    return interaction.followUp({ content: '❌ You can only offer up to **3 cards** at a time.', flags: MessageFlags.Ephemeral });
  }

  // Build exchange embed + Interested button
  const embed = buildExchangeEmbed(interaction.user, wanted, offered, code);

  const interestedBtn = new ButtonBuilder()
    .setCustomId(`cex_interested_${interaction.user.id}`)
    .setLabel('Interested')
    .setStyle(ButtonStyle.Success)
    .setEmoji('🤝');

  const row = new ActionRowBuilder().addComponents(interestedBtn);

  // Post in channel
  const channel = interaction.channel;
  const msg = await channel.send({ embeds: [embed], components: [row] }).catch(err => {
    console.error('[CardExchange] Failed to post exchange:', err.message);
    return null;
  });

  if (!msg) {
    return interaction.followUp({ content: '❌ Failed to post your exchange. Please try again.', flags: MessageFlags.Ephemeral });
  }

  // Store active exchange + cooldown timestamp
  activeExchanges.set(interaction.user.id, msg.id);
  cooldowns.set(interaction.user.id, Date.now());

  await interaction.followUp({ content: '✅ Your exchange has been posted!', flags: MessageFlags.Ephemeral });
}

/**
 * Handle "Interested" button click.
 * customId format: cex_interested_<posterUserId>
 */
async function handleInterested(interaction) {
  // Channel check
  if (interaction.channelId !== EXCHANGE_CHANNEL_ID) {
    return denyEphemeral(interaction, '❌ This action only works in the exchange channel.');
  }

  // Parse poster user ID from customId
  const parts    = interaction.customId.split('_'); // ['cex', 'interested', '<userId>']
  const posterId = parts[2];

  // Prevent self-click
  if (interaction.user.id === posterId) {
    return denyEphemeral(interaction, '❌ You cannot express interest in your own exchange!');
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const message = interaction.message;

    // Create private thread under the exchange message
    const thread = await message.startThread({
      name: `Exchange — ${interaction.user.username} × ${message.embeds?.[0]?.footer?.text?.replace('Posted by ', '') || 'Poster'}`,
      type: ChannelType.PrivateThread,
      reason: 'Card Exchange interest'
    }).catch(() => null);

    if (!thread) {
      return interaction.followUp({ content: '❌ Could not create a private thread. Please try again or contact a mod.', flags: MessageFlags.Ephemeral });
    }

    // Add the interested user (thread creator is auto-added)
    await thread.members.add(interaction.user.id).catch(() => {});
    await thread.members.add(posterId).catch(() => {});

    // Ping both users in the thread
    await thread.send(`👋 <@${interaction.user.id}> is interested in your exchange, <@${posterId}>!\n\nYou can discuss the details here in private.`).catch(() => {});

    await interaction.followUp({ content: `✅ A private thread has been created: ${thread}`, flags: MessageFlags.Ephemeral });
  } catch (err) {
    console.error('[CardExchange] Interested handler error:', err.message);
    await interaction.followUp({ content: '❌ Something went wrong. Please try again.', flags: MessageFlags.Ephemeral });
  }
}

/* ─── Main Router ────────────────────────────────────────────────────────── */

/**
 * Route all card-exchange interactions.
 * @param {import('discord.js').Client} client
 */
function registerHandler(client) {
  client.on('interactionCreate', async interaction => {
    try {
      // Button interactions
      if (interaction.isButton()) {
        if (interaction.customId === 'cex_post') {
          return handlePostButton(interaction);
        }
        if (interaction.customId.startsWith('cex_interested_')) {
          return handleInterested(interaction);
        }
      }

      // Modal submissions
      if (interaction.isModalSubmit()) {
        if (interaction.customId === 'cex_modal_post') {
          return handlePostModal(interaction);
        }
      }
    } catch (err) {
      console.error('[CardExchange] Unhandled interaction error:', err.message);
    }
  });
}

module.exports = { registerHandler, activeExchanges };
