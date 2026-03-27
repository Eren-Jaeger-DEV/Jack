/**
 * plugins/card-exchange/handlers/exchangeHandler.js
 *
 * Dropdown-based Card Exchange system.
 * Data is sourced exclusively from MongoDB via /utils/cardManager.js.
 * 
 * Flow:
 *  Step 1 → Category select    (wanted card)
 *  Step 2 → Card select        (wanted card — shows rarity in description)
 *  Step 3 → Offer multi-select (max 3 — shows rarity in labels)
 *  Step 4 → Optional code modal
 *  Step 5 → Post exchange embed publicly (shows wanted card image preview)
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

const { getCards, getCache, getCardRarity, getCardImage } = require('../../../utils/cardManager');

/* ─── Config ──────────────────────────────────────────────────────────────── */
const EXCHANGE_CHANNEL_ID = '1486943351403184169';
const TRADER_ROLE_ID      = '1486942697976631326';
const COOLDOWN_MS         = 5 * 60 * 1000; // 5 minutes

/* ─── State ───────────────────────────────────────────────────────────────── */
const sessions = new Map();
const activeExchanges = new Map();
const cooldowns = new Map();

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function hasTraderRole(member) {
  return member.roles.cache.has(TRADER_ROLE_ID);
}

async function denyEphemeral(interaction, message) {
  const payload = { content: message, flags: MessageFlags.Ephemeral };
  if (interaction.deferred || interaction.replied) return interaction.followUp(payload).catch(() => {});
  return interaction.reply(payload).catch(() => {});
}

function formatCooldown(ms) {
  const secs = Math.ceil(ms / 1000);
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

/** Rarity → emoji badge */
function rarityBadge(rarity) {
  if (!rarity) return '';
  const r = rarity.toUpperCase();
  if (r === 'S') return '⭐ S';
  if (r === 'A') return '🔶 A';
  if (r === 'B') return '🔷 B';
  if (r === 'C') return '⚪ C';
  return rarity;
}

/* ─── UI Builders ─────────────────────────────────────────────────────────── */

/** Step 1: Category select */
function buildStep1(CARDS) {
  const categories = Object.keys(CARDS);

  if (categories.length === 0) {
    return {
      content: '❌ No card categories found in the database. Please contact an admin to sync.',
      flags: MessageFlags.Ephemeral
    };
  }

  const embed = new EmbedBuilder()
    .setTitle('📋 Post Exchange — Step 1 of 3')
    .setDescription('**Select the category of the card you are looking for:**')
    .setColor(0xF1C40F)
    .setFooter({ text: 'Step 1: Choose a category' });

  const menu = new StringSelectMenuBuilder()
    .setCustomId('cex_step1_cat')
    .setPlaceholder('🗂️ Choose a category...')
    .addOptions(
      categories.slice(0, 25).map(cat =>
        new StringSelectMenuOptionBuilder()
          .setLabel(cat)
          .setValue(cat)
          .setEmoji('📁')
      )
    );

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)], flags: MessageFlags.Ephemeral };
}

/** Step 2: Card select for wanted card */
function buildStep2(category, CARDS, allCardsDocs) {
  const cards = CARDS[category] || [];

  if (cards.length === 0) {
    return {
      content: `❌ No cards found in category **${category}**.`,
      flags: MessageFlags.Ephemeral
    };
  }

  const rarityMap = {};
  for (const c of allCardsDocs) {
    if (c.category === category) rarityMap[c.name] = c.rarity;
  }

  const embed = new EmbedBuilder()
    .setTitle('📋 Post Exchange — Step 2 of 3')
    .setDescription(`**Category:** \`${category}\`\n\nSelect the card you are **looking for:**`)
    .setColor(0x3498DB)
    .setFooter({ text: 'Step 2: Choose your wanted card' });

  const options = cards.slice(0, 25).map(card => {
    const rarity = rarityMap[card];
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(card)
      .setValue(card)
      .setEmoji('🃏');
    if (rarity) option.setDescription(`Rarity: ${rarityBadge(rarity)}`);
    return option;
  });

  const menu = new StringSelectMenuBuilder()
    .setCustomId('cex_step2_card')
    .setPlaceholder('🔍 Select wanted card...')
    .addOptions(options);

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)], flags: MessageFlags.Ephemeral };
}

/** Step 3: Offer multi-select */
function buildStep3(wantedCard, CARDS, allCardsDocs) {
  const allCardsList = [];
  const rarityMap = Object.fromEntries(allCardsDocs.map(c => [c.name, c.rarity]));

  for (const [cat, names] of Object.entries(CARDS)) {
    for (const name of names) {
      if (name !== wantedCard) {
        allCardsList.push({ name, cat, rarity: rarityMap[name] || null });
      }
    }
  }

  if (allCardsList.length === 0) {
    return {
      content: '❌ No cards available to offer.',
      flags: MessageFlags.Ephemeral
    };
  }

  const embed = new EmbedBuilder()
    .setTitle('📋 Post Exchange — Step 3 of 3')
    .setDescription(
      `**Looking For:** \`${wantedCard}\`\n\n` +
      'Select up to **3 cards** you are **offering:**'
    )
    .setColor(0x2ECC71)
    .setFooter({ text: 'Step 3: Choose your offered cards (max 3)' });

  const options = allCardsList.slice(0, 25).map(({ name, cat, rarity }) => {
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(name)
      .setValue(`${cat}::${name}`)
      .setEmoji('🎁');
    if (rarity) option.setDescription(`Rarity: ${rarityBadge(rarity)}`);
    return option;
  });

  const menu = new StringSelectMenuBuilder()
    .setCustomId('cex_step3_offer')
    .setPlaceholder('🎁 Select cards to offer...')
    .setMinValues(1)
    .setMaxValues(Math.min(3, options.length))
    .addOptions(options);

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)], flags: MessageFlags.Ephemeral };
}

/** Step 4: Optional code modal */
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

/** Public exchange embed */
async function buildExchangeEmbed(user, wantedCard, offeredCards, code) {
  const offeredStrList = await Promise.all(offeredCards.map(async (c, i) => {
    const rarity = await getCardRarity(c);
    return `\`${i + 1}.\` ${c}${rarity ? ` — ${rarityBadge(rarity)}` : ''}`;
  }));
  const offeredStr = offeredStrList.join('\n');

  const wantedRarity = await getCardRarity(wantedCard);
  const wantedImage  = await getCardImage(wantedCard);

  const wantedStr = wantedRarity
    ? `${wantedCard} — ${rarityBadge(wantedRarity)}`
    : wantedCard;

  return new EmbedBuilder()
    .setTitle('🔄 Card Exchange Request')
    .setDescription(`<@${user.id}> is looking to exchange cards!`)
    .addFields(
      { name: '🔍 Looking For', value: wantedStr,  inline: true },
      { name: '🎁 Offering',    value: offeredStr, inline: false },
      ...(code ? [{ name: '🔑 Exchange Code', value: `\`${code}\``, inline: false }] : [])
    )
    .setColor(0x2ECC71)
    .setThumbnail(wantedImage || user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `Posted by ${user.username}` })
    .setTimestamp();
}

/* ─── Step Handlers ───────────────────────────────────────────────────────── */

async function handlePostButton(interaction) {
  if (interaction.channelId !== EXCHANGE_CHANNEL_ID) return denyEphemeral(interaction, '❌ This system only works in the exchange channel.');
  if (!hasTraderRole(interaction.member)) return denyEphemeral(interaction, '❌ You need the **Trader** role to post an exchange.');
  if (activeExchanges.has(interaction.user.id)) return denyEphemeral(interaction, '❌ You already have an active exchange!');
  
  const lastPost = cooldowns.get(interaction.user.id);
  if (lastPost && (Date.now() - lastPost) < COOLDOWN_MS) {
    return denyEphemeral(interaction, `⏳ Cooldown! Wait **${formatCooldown(COOLDOWN_MS - (Date.now() - lastPost))}** before posting again.`);
  }

  const CARDS = await getCards();
  sessions.set(interaction.user.id, { step: 1, wantedCategory: null, wantedCard: null, offeredCards: [] });
  return interaction.reply(buildStep1(CARDS));
}

async function handleStep1(interaction) {
  const session = sessions.get(interaction.user.id);
  if (!session || session.step !== 1) return denyEphemeral(interaction, '❌ Session expired. Click "Post Exchange" again.');

  const category = interaction.values[0];
  session.wantedCategory = category;
  session.step = 2;

  const CARDS = await getCards();
  const allCardsDocs = await getCache();
  return interaction.update(buildStep2(category, CARDS, allCardsDocs));
}

async function handleStep2(interaction) {
  const session = sessions.get(interaction.user.id);
  if (!session || session.step !== 2) return denyEphemeral(interaction, '❌ Session expired. Click "Post Exchange" again.');

  const wantedCard = interaction.values[0];
  session.wantedCard = wantedCard;
  session.step = 3;

  const CARDS = await getCards();
  const allCardsDocs = await getCache();
  return interaction.update(buildStep3(wantedCard, CARDS, allCardsDocs));
}

async function handleStep3(interaction) {
  const session = sessions.get(interaction.user.id);
  if (!session || session.step !== 3) return denyEphemeral(interaction, '❌ Session expired. Click "Post Exchange" again.');

  session.offeredCards = interaction.values.map(v => v.split('::')[1]);
  session.step = 4;
  return interaction.showModal(buildCodeModal());
}

async function handleCodeModal(interaction) {
  const session = sessions.get(interaction.user.id);
  if (!session || session.step !== 4 || !session.wantedCard || !session.offeredCards?.length) {
    return denyEphemeral(interaction, '❌ Session expired or incomplete.');
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const code = interaction.fields.getTextInputValue('cex_code')?.trim() || null;
  const embed = await buildExchangeEmbed(interaction.user, session.wantedCard, session.offeredCards, code);

  const interestedBtn = new ButtonBuilder()
    .setCustomId(`cex_interested_${interaction.user.id}`)
    .setLabel('Interested')
    .setStyle(ButtonStyle.Success)
    .setEmoji('🤝');

  const msg = await interaction.channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(interestedBtn)]
  }).catch(() => null);

  if (!msg) return interaction.followUp({ content: '❌ Failed to post exchange.', flags: MessageFlags.Ephemeral });

  activeExchanges.set(interaction.user.id, msg.id);
  cooldowns.set(interaction.user.id, Date.now());
  sessions.delete(interaction.user.id);

  return interaction.followUp({ content: '✅ Your exchange has been posted!', flags: MessageFlags.Ephemeral });
}

/* ─── Interested Handler ──────────────────────────────────────────────────── */
async function handleInterested(interaction) {
  const posterId = interaction.customId.split('_')[2];
  if (interaction.user.id === posterId) return denyEphemeral(interaction, '❌ You cannot express interest in your own exchange!');

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const posterName = interaction.message.embeds?.[0]?.footer?.text?.replace('Posted by ', '') || 'Poster';
    const thread = await interaction.message.startThread({
      name: `Exchange — ${interaction.user.username} × ${posterName}`,
      type: ChannelType.PrivateThread,
      reason: 'Card Exchange interest'
    }).catch(() => null);

    if (!thread) return interaction.followUp({ content: '❌ Could not create a private thread.', flags: MessageFlags.Ephemeral });

    await thread.members.add(interaction.user.id).catch(() => {});
    await thread.members.add(posterId).catch(() => {});
    await thread.send(`👋 <@${interaction.user.id}> is interested in your exchange, <@${posterId}>!\n\nDiscuss details here. 🤝`);

    await interaction.followUp({ content: `✅ Private thread created: ${thread}`, flags: MessageFlags.Ephemeral });
  } catch (err) {
    await interaction.followUp({ content: '❌ Something went wrong.', flags: MessageFlags.Ephemeral });
  }
}

/* ─── Main Router ─────────────────────────────────────────────────────────── */
function registerHandler(client) {
  client.on('interactionCreate', async interaction => {
    try {
      if (interaction.isButton()) {
        if (interaction.customId === 'cex_post') return handlePostButton(interaction);
        if (interaction.customId.startsWith('cex_interested_')) return handleInterested(interaction);
      }
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'cex_step1_cat') return handleStep1(interaction);
        if (interaction.customId === 'cex_step2_card') return handleStep2(interaction);
        if (interaction.customId === 'cex_step3_offer') return handleStep3(interaction);
      }
      if (interaction.isModalSubmit() && interaction.customId === 'cex_modal_code') return handleCodeModal(interaction);
    } catch (err) {
      console.error('[CardExchange] Unhandled interaction error:', err.message);
    }
  });
}

module.exports = { registerHandler, activeExchanges };
