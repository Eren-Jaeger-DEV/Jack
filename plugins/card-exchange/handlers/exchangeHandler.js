/**
 * plugins/card-exchange/handlers/exchangeHandler.js
 *
 * Dropdown-based Card Exchange system.
 *
 * Multi-step ephemeral UI flow:
 *  Step 1 → Category select  (wanted card)
 *  Step 2 → Card select      (wanted card)
 *  Step 3 → Offer multi-select (max 3)
 *  Step 4 → Optional code modal
 *  Step 5 → Post exchange embed publicly
 *
 * State:
 *  sessions : Map<userId, { step, wantedCategory, wantedCard, offeredCards }>
 *  activeExchanges : Map<userId, messageId>
 *  cooldowns       : Map<userId, timestamp>
 */

'use strict';

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  ChannelType
} = require('discord.js');

const CARDS = require('../data/cards.json');

/* ─── Config ─────────────────────────────────────────────────────────────── */
const EXCHANGE_CHANNEL_ID = '1486943351403184169';
const TRADER_ROLE_ID      = '1486942697976631326';
const COOLDOWN_MS         = 5 * 60 * 1000; // 5 minutes

/* ─── State ──────────────────────────────────────────────────────────────── */
/** @type {Map<string, {step:number, wantedCategory:string, wantedCard:string, offeredCards:string[]}>} */
const sessions = new Map();

/** @type {Map<string, string>} userId → messageId */
const activeExchanges = new Map();

/** @type {Map<string, number>} userId → timestamp */
const cooldowns = new Map();

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function hasTraderRole(member) {
  return member.roles.cache.has(TRADER_ROLE_ID);
}

async function denyEphemeral(interaction, message) {
  const payload = { content: message, flags: MessageFlags.Ephemeral };
  if (interaction.deferred || interaction.replied) {
    return interaction.followUp(payload).catch(() => {});
  }
  return interaction.reply(payload).catch(() => {});
}

function formatCooldown(ms) {
  const secs = Math.ceil(ms / 1000);
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

/* ─── UI Builders ─────────────────────────────────────────────────────────── */

/**
 * Step 1: Category select embed + dropdown
 */
function buildStep1() {
  const embed = new EmbedBuilder()
    .setTitle('📋 Post Exchange — Step 1 of 3')
    .setDescription('**Select the category of the card you are looking for:**')
    .setColor(0xF1C40F)
    .setFooter({ text: 'Step 1: Choose a category' });

  const categories = Object.keys(CARDS);
  const menu = new StringSelectMenuBuilder()
    .setCustomId('cex_step1_cat')
    .setPlaceholder('🗂️ Choose a category...')
    .addOptions(
      categories.map(cat =>
        new StringSelectMenuOptionBuilder()
          .setLabel(cat)
          .setValue(cat)
          .setEmoji('📁')
      )
    );

  const row = new ActionRowBuilder().addComponents(menu);
  return { embeds: [embed], components: [row], flags: MessageFlags.Ephemeral };
}

/**
 * Step 2: Card select for wanted card (from chosen category)
 * @param {string} category
 */
function buildStep2(category) {
  const cards = CARDS[category] || [];

  const embed = new EmbedBuilder()
    .setTitle('📋 Post Exchange — Step 2 of 3')
    .setDescription(`**Category:** \`${category}\`\n\nSelect the card you are **looking for:**`)
    .setColor(0x3498DB)
    .setFooter({ text: 'Step 2: Choose your wanted card' });

  const menu = new StringSelectMenuBuilder()
    .setCustomId('cex_step2_card')
    .setPlaceholder('🔍 Select wanted card...')
    .addOptions(
      cards.map(card =>
        new StringSelectMenuOptionBuilder()
          .setLabel(card)
          .setValue(card)
          .setEmoji('🃏')
      )
    );

  const row = new ActionRowBuilder().addComponents(menu);
  return { embeds: [embed], components: [row], flags: MessageFlags.Ephemeral };
}

/**
 * Step 3: Offer multi-select (all cards, max 3)
 * @param {string} wantedCard — excluded from offer list
 */
function buildStep3(wantedCard) {
  // Flatten all cards, excluding the wanted card
  const allCards = [];
  for (const [cat, cards] of Object.entries(CARDS)) {
    for (const card of cards) {
      if (card !== wantedCard) {
        allCards.push({ label: card, value: `${cat}::${card}` });
      }
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('📋 Post Exchange — Step 3 of 3')
    .setDescription(
      `**Looking For:** \`${wantedCard}\`\n\n` +
      'Select up to **3 cards** you are **offering:**'
    )
    .setColor(0x2ECC71)
    .setFooter({ text: 'Step 3: Choose your offered cards (max 3)' });

  // Discord only allows 25 options per menu; slice to 25
  const options = allCards.slice(0, 25).map(({ label, value }) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(label)
      .setValue(value)
      .setEmoji('🎁')
  );

  const menu = new StringSelectMenuBuilder()
    .setCustomId('cex_step3_offer')
    .setPlaceholder('🎁 Select cards to offer...')
    .setMinValues(1)
    .setMaxValues(Math.min(3, options.length))
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(menu);
  return { embeds: [embed], components: [row], flags: MessageFlags.Ephemeral };
}

/**
 * Optional code modal (Step 4)
 */
function buildCodeModal() {
  const modal = new ModalBuilder()
    .setCustomId('cex_modal_code')
    .setTitle('Exchange Code (Optional)');

  const codeInput = new TextInputBuilder()
    .setCustomId('cex_code')
    .setLabel('Enter your exchange code (or leave blank)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. ABCD-1234')
    .setRequired(false)
    .setMaxLength(30);

  modal.addComponents(new ActionRowBuilder().addComponents(codeInput));
  return modal;
}

/**
 * Public exchange embed + Interested button
 * @param {import('discord.js').User} user
 * @param {string} wantedCard
 * @param {string[]} offeredCards
 * @param {string|null} code
 */
function buildExchangeEmbed(user, wantedCard, offeredCards, code) {
  const offeredStr = offeredCards.map((c, i) => `\`${i + 1}.\` ${c}`).join('\n');

  return new EmbedBuilder()
    .setTitle('🔄 Card Exchange Request')
    .setDescription(`<@${user.id}> is looking to exchange cards!`)
    .addFields(
      { name: '🔍 Looking For',  value: wantedCard,  inline: true },
      { name: '🎁 Offering',     value: offeredStr,  inline: true },
      ...(code ? [{ name: '🔑 Exchange Code', value: `\`${code}\``, inline: false }] : [])
    )
    .setColor(0x2ECC71)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `Posted by ${user.username}` })
    .setTimestamp();
}

/* ─── Step Handlers ──────────────────────────────────────────────────────── */

/** Step 1 trigger: "Post Exchange" button */
async function handlePostButton(interaction) {
  if (interaction.channelId !== EXCHANGE_CHANNEL_ID) {
    return denyEphemeral(interaction, '❌ This system only works in the exchange channel.');
  }
  if (!hasTraderRole(interaction.member)) {
    return denyEphemeral(interaction, '❌ You need the **Trader** role to post an exchange.');
  }
  if (activeExchanges.has(interaction.user.id)) {
    return denyEphemeral(interaction, '❌ You already have an active exchange!');
  }
  const lastPost = cooldowns.get(interaction.user.id);
  if (lastPost && (Date.now() - lastPost) < COOLDOWN_MS) {
    const remaining = COOLDOWN_MS - (Date.now() - lastPost);
    return denyEphemeral(interaction, `⏳ Cooldown! Wait **${formatCooldown(remaining)}** before posting again.`);
  }

  // Initialize session
  sessions.set(interaction.user.id, { step: 1, wantedCategory: null, wantedCard: null, offeredCards: [] });

  return interaction.reply(buildStep1());
}

/** Step 2 trigger: category selected */
async function handleStep1(interaction) {
  const session = sessions.get(interaction.user.id);
  if (!session || session.step !== 1) {
    return denyEphemeral(interaction, '❌ Session expired. Click "Post Exchange" again.');
  }

  const category = interaction.values[0];
  session.wantedCategory = category;
  session.step = 2;

  return interaction.update(buildStep2(category));
}

/** Step 3 trigger: wanted card selected */
async function handleStep2(interaction) {
  const session = sessions.get(interaction.user.id);
  if (!session || session.step !== 2) {
    return denyEphemeral(interaction, '❌ Session expired. Click "Post Exchange" again.');
  }

  const wantedCard = interaction.values[0];
  session.wantedCard = wantedCard;
  session.step = 3;

  return interaction.update(buildStep3(wantedCard));
}

/** Step 4 trigger: offered cards selected → show code modal */
async function handleStep3(interaction) {
  const session = sessions.get(interaction.user.id);
  if (!session || session.step !== 3) {
    return denyEphemeral(interaction, '❌ Session expired. Click "Post Exchange" again.');
  }

  // Parse values: "Category::CardName"
  const offeredCards = interaction.values.map(v => v.split('::')[1]);
  session.offeredCards = offeredCards;
  session.step = 4;

  // Show code modal
  return interaction.showModal(buildCodeModal());
}

/** Step 5 trigger: code modal submitted → post exchange */
async function handleCodeModal(interaction) {
  if (interaction.channelId !== EXCHANGE_CHANNEL_ID) {
    return denyEphemeral(interaction, '❌ This system only works in the exchange channel.');
  }

  const session = sessions.get(interaction.user.id);
  if (!session || session.step !== 4 || !session.wantedCard || !session.offeredCards?.length) {
    return denyEphemeral(interaction, '❌ Session expired or incomplete. Click "Post Exchange" again.');
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const code = interaction.fields.getTextInputValue('cex_code')?.trim() || null;

  const embed = buildExchangeEmbed(
    interaction.user,
    session.wantedCard,
    session.offeredCards,
    code
  );

  const interestedBtn = new ButtonBuilder()
    .setCustomId(`cex_interested_${interaction.user.id}`)
    .setLabel('Interested')
    .setStyle(ButtonStyle.Success)
    .setEmoji('🤝');

  const row = new ActionRowBuilder().addComponents(interestedBtn);

  const msg = await interaction.channel.send({ embeds: [embed], components: [row] }).catch(err => {
    console.error('[CardExchange] Failed to post exchange:', err.message);
    return null;
  });

  if (!msg) {
    sessions.delete(interaction.user.id);
    return interaction.followUp({ content: '❌ Failed to post exchange. Please try again.', flags: MessageFlags.Ephemeral });
  }

  // Store active exchange + cooldown, clear session
  activeExchanges.set(interaction.user.id, msg.id);
  cooldowns.set(interaction.user.id, Date.now());
  sessions.delete(interaction.user.id);

  await interaction.followUp({ content: '✅ Your exchange has been posted!', flags: MessageFlags.Ephemeral });
}

/* ─── Interested Handler ─────────────────────────────────────────────────── */
async function handleInterested(interaction) {
  if (interaction.channelId !== EXCHANGE_CHANNEL_ID) {
    return denyEphemeral(interaction, '❌ This action only works in the exchange channel.');
  }

  const posterId = interaction.customId.split('_')[2];

  if (interaction.user.id === posterId) {
    return denyEphemeral(interaction, '❌ You cannot express interest in your own exchange!');
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const message = interaction.message;
    const posterName = message.embeds?.[0]?.footer?.text?.replace('Posted by ', '') || 'Poster';

    const thread = await message.startThread({
      name: `Exchange — ${interaction.user.username} × ${posterName}`,
      type: ChannelType.PrivateThread,
      reason: 'Card Exchange interest'
    }).catch(() => null);

    if (!thread) {
      return interaction.followUp({ content: '❌ Could not create a private thread. Please try again.', flags: MessageFlags.Ephemeral });
    }

    await thread.members.add(interaction.user.id).catch(() => {});
    await thread.members.add(posterId).catch(() => {});
    await thread.send(
      `👋 <@${interaction.user.id}> is interested in your exchange, <@${posterId}>!\n\nDiscuss the details here in private. 🤝`
    ).catch(() => {});

    await interaction.followUp({ content: `✅ Private thread created: ${thread}`, flags: MessageFlags.Ephemeral });
  } catch (err) {
    console.error('[CardExchange] Interested handler error:', err.message);
    await interaction.followUp({ content: '❌ Something went wrong. Please try again.', flags: MessageFlags.Ephemeral });
  }
}

/* ─── Main Router ────────────────────────────────────────────────────────── */
function registerHandler(client) {
  client.on('interactionCreate', async interaction => {
    try {
      if (interaction.isButton()) {
        if (interaction.customId === 'cex_post')               return handlePostButton(interaction);
        if (interaction.customId.startsWith('cex_interested_')) return handleInterested(interaction);
      }

      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'cex_step1_cat')   return handleStep1(interaction);
        if (interaction.customId === 'cex_step2_card')  return handleStep2(interaction);
        if (interaction.customId === 'cex_step3_offer') return handleStep3(interaction);
      }

      if (interaction.isModalSubmit()) {
        if (interaction.customId === 'cex_modal_code')  return handleCodeModal(interaction);
      }
    } catch (err) {
      console.error('[CardExchange] Unhandled interaction error:', err.message);
    }
  });
}

module.exports = { registerHandler, activeExchanges };
