/**
 * plugins/card-exchange/handlers/exchangeHandler.js
 *
 * Dropdown-based Card Exchange system.
 * Data is sourced exclusively from MongoDB via /utils/cardManager.js.
 * 
 * Flow:
 *  Step 1 → Category select    (wanted card)
 *  Step 2 → Card select        (wanted card)
 *  Step 3 → Offer multi-select (max 3)
 *  Step 4 → Optional code modal
 *  Step 5 → Post exchange embed publicly
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

const { getCards, getCache, getCardImage } = require('../../../utils/cardManager');
const CardExchange = require('../../../bot/database/models/CardExchange');
const CardExchangeThread = require('../../../bot/database/models/CardExchangeThread');

const configManager = require('../../../bot/utils/configManager');

/* ─── Config ──────────────────────────────────────────────────────────────── */
const COOLDOWN_MS         = 5 * 60 * 1000; // 5 minutes


/* ─── State ───────────────────────────────────────────────────────────────── */
const sessions = new Map();
const cooldowns = new Map();
const searchCooldowns = new Map();
const EXPIRE_MS = 4 * 60 * 60 * 1000; // 4 hours
const THREAD_EXPIRE_MS = 30 * 60 * 1000; // 30 minutes
const SEARCH_COOLDOWN_MS = 10 * 1000; // 10 seconds for search/browse

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
async function hasTraderRole(member, guildId) {
  const config = await configManager.getGuildConfig(guildId);
  const traderRoleId = config?.settings?.traderRoleId;
  if (!traderRoleId) return false;
  return member.roles.cache.has(traderRoleId);
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

/* ─── UI Builders ─────────────────────────────────────────────────────────── */

/** Step 1: Category select */
function buildStep1(CARDS) {
  const categories = Object.keys(CARDS);

  if (categories.length === 0) {
    return {
      content: '❌ No card categories found. Please contact an admin.',
      flags: MessageFlags.Ephemeral
    };
  }

  const embed = new EmbedBuilder()
    .setTitle('📤 CREATE POST — STEP 1')
    .setDescription('**Select the category of the card you are LOOKING FOR:**')
    .setColor(0xF1C40F)
    .setFooter({ text: 'Step 1: Wanted Category • Card Exchange System' });

  const menu = new StringSelectMenuBuilder()
    .setCustomId('cex_step1_cat')
    .setPlaceholder('🗂️ Choose category...')
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
function buildStep2(category, CARDS) {
  const cards = CARDS[category] || [];

  if (cards.length === 0) {
    return {
      content: `❌ No cards found in category **${category}**.`,
      flags: MessageFlags.Ephemeral
    };
  }

  const embed = new EmbedBuilder()
    .setTitle('📤 CREATE POST — STEP 2')
    .setDescription(`**Category:** \`${category}\`\n\nSelect the card you are **looking for:**`)
    .setColor(0x3498DB)
    .setFooter({ text: 'Step 2: Wanted Card • Card Exchange System' });

  const options = cards.slice(0, 25).map(card => {
    return new StringSelectMenuOptionBuilder()
      .setLabel(card)
      .setValue(card)
      .setEmoji('🃏');
  });

  const menu = new StringSelectMenuBuilder()
    .setCustomId('cex_step2_card')
    .setPlaceholder('🔍 Select card...')
    .addOptions(options);

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)], flags: MessageFlags.Ephemeral };
}

/** Step 3: Offer multi-select */
function buildStep3(wantedCard, wantedCategory, CARDS) {
  // Prioritize cards from the same category as the wanted card
  const sameCatCards = (CARDS[wantedCategory] || []).filter(n => n !== wantedCard).map(n => ({ name: n, cat: wantedCategory }));
  const otherCatCards = [];
  
  for (const [cat, names] of Object.entries(CARDS)) {
    if (cat === wantedCategory) continue;
    for (const name of names) {
      otherCatCards.push({ name, cat });
    }
  }

  // Combine and take first 25
  const allAvailable = [...sameCatCards, ...otherCatCards].slice(0, 25);

  if (allAvailable.length === 0) {
    return {
      content: '❌ No other cards available to offer.',
      flags: MessageFlags.Ephemeral
    };
  }

  const embed = new EmbedBuilder()
    .setTitle('📤 CREATE POST — STEP 3')
    .setDescription(
      `**Looking For:** \`${wantedCard}\`\n\n` +
      'Select up to **3 cards** you are **offering:**\n' +
      '> *Tip: You can offer cards from any category shown below.*'
    )
    .setColor(0x2ECC71)
    .setFooter({ text: 'Step 3: Offered Cards (Max 3) • Card Exchange System' });

  const options = allAvailable.map(({ name, cat }) => {
    return new StringSelectMenuOptionBuilder()
      .setLabel(name)
      .setDescription(`From: ${cat}`)
      .setValue(`${cat}::${name}`)
      .setEmoji('🎁');
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
  const expiresAt = Math.floor((Date.now() + EXPIRE_MS) / 1000);
  const offeredStr = offeredCards.map((c, i) => `\`${i + 1}.\` ${c}`).join('\n');

  const wantedImage  = await getCardImage(wantedCard);

  return new EmbedBuilder()
    .setTitle('🔄 CARD EXCHANGE REQUEST')
    .setDescription(
      `<@${user.id}> is looking for a trade!\n` +
      `⏳ **Status:** Active • **Expires:** <t:${expiresAt}:R>`
    )
    .addFields(
      { name: '🔍 Looking For', value: `**${wantedCard}**`,  inline: true },
      { name: '🎁 Offering',    value: offeredStr, inline: false },
      ...(code ? [{ name: '🔑 Exchange Code', value: `\`${code}\``, inline: false }] : [])
    )
    .setColor(0x2ECC71)
    .setThumbnail(wantedImage || user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `Trader: ${user.username}`, iconURL: user.displayAvatarURL() })
    .setTimestamp();
}

/* ─── Step Handlers ───────────────────────────────────────────────────────── */

async function handlePostButton(interaction) {
  const config = await configManager.getGuildConfig(interaction.guildId);
  const exchangeChannelId = config?.settings?.cardExchangeChannelId;

  if (interaction.channelId !== exchangeChannelId) return denyEphemeral(interaction, '❌ This system only works in the exchange channel.');
  
  if (!(await hasTraderRole(interaction.member, interaction.guildId))) {
    return denyEphemeral(interaction, '❌ You need the **Trader** role to post an exchange.');
  }
  
  const existing = await CardExchange.findOne({ userId: interaction.user.id });
  if (existing) return denyEphemeral(interaction, '❌ You already have an active exchange!');
  
  const lastPost = cooldowns.get(interaction.user.id);
  if (lastPost && (Date.now() - lastPost) < COOLDOWN_MS) {
    return denyEphemeral(interaction, `⏳ Cooldown! Wait **${formatCooldown(COOLDOWN_MS - (Date.now() - lastPost))}** before posting again.`);
  }

  const CARDS = await getCards();
  sessions.set(interaction.user.id, { type: 'post', step: 1, wantedCategory: null, wantedCard: null, offeredCards: [] });
  return interaction.reply(buildStep1(CARDS));
}

/* ─── Search Handlers ─────────────────────────────────────────────────────── */

async function handleSearchButton(interaction) {
  if (!(await hasTraderRole(interaction.member, interaction.guildId))) {
    return denyEphemeral(interaction, '❌ You need the **Trader** role to search for exchanges.');
  }
  
  const lastSearch = searchCooldowns.get(interaction.user.id);
  if (lastSearch && (Date.now() - lastSearch) < SEARCH_COOLDOWN_MS) {
    return denyEphemeral(interaction, `⏳ Search cooldown! Wait **${Math.ceil((SEARCH_COOLDOWN_MS - (Date.now() - lastSearch)) / 1000)}s**.`);
  }

  const CARDS = await getCards();
  sessions.set(interaction.user.id, { type: 'search', step: 1, timer: setTimeout(() => sessions.delete(interaction.user.id), 2 * 60 * 1000) });

  const embed = new EmbedBuilder()
    .setTitle('🔍 MARKET SEARCH — STEP 1')
    .setDescription('Select the **category** of the card you are looking for:')
    .setColor(0x3498DB)
    .setFooter({ text: 'Card Exchange Marketplace' });

  const categories = Object.keys(CARDS);
  const menu = new StringSelectMenuBuilder()
    .setCustomId('cex_search_cat')
    .setPlaceholder('🗂️ Choose a category...')
    .addOptions(
      categories.slice(0, 25).map(cat =>
        new StringSelectMenuOptionBuilder().setLabel(cat).setValue(cat).setEmoji('📁')
      )
    );

  searchCooldowns.set(interaction.user.id, Date.now());
  return interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)], flags: MessageFlags.Ephemeral });
}

async function handleSearchCat(interaction) {
  const session = sessions.get(interaction.user.id);
  if (!session || session.type !== 'search') return denyEphemeral(interaction, '❌ Session expired.');
  if (session.timer) clearTimeout(session.timer);
  session.timer = setTimeout(() => sessions.delete(interaction.user.id), 2 * 60 * 1000);

  const category = interaction.values[0];
  session.wantedCategory = category;
  session.step = 2;

  const CARDS = await getCards();
  const cards = CARDS[category] || [];

  const embed = new EmbedBuilder()
    .setTitle('🔍 MARKET SEARCH — STEP 2')
    .setDescription(`**Category:** \`${category}\`\n\nSelect the **card** you want to find, or select **"All Cards"**.`)
    .setColor(0x3498DB)
    .setFooter({ text: 'Card Exchange Marketplace' });

  const options = [
    new StringSelectMenuOptionBuilder()
      .setLabel('All Cards')
      .setValue('ALL')
      .setEmoji('🌐'),
    ...cards.slice(0, 24).map(card =>
      new StringSelectMenuOptionBuilder().setLabel(card).setValue(card).setEmoji('🃏')
    )
  ];

  const menu = new StringSelectMenuBuilder()
    .setCustomId('cex_search_card')
    .setPlaceholder('🔍 Select card or All...')
    .addOptions(options);

  return interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
}

async function handleSearchCard(interaction) {
  const session = sessions.get(interaction.user.id);
  if (!session || session.type !== 'search') return denyEphemeral(interaction, '❌ Session expired.');
  if (session.timer) clearTimeout(session.timer);

  const wantedCard = interaction.values[0];
  const query = { expiresAt: { $gt: new Date() } };
  
  if (wantedCard !== 'ALL') {
    query.wantedCard = wantedCard;
  } else if (session.wantedCategory) {
    const CARDS = await getCards();
    query.wantedCard = { $in: CARDS[session.wantedCategory] || [] };
  }

  const results = await CardExchange.find(query).sort({ createdAt: -1 }).limit(5);

  if (results.length === 0) {
    return interaction.update({ content: '🔍 **No active trades found** matching your criteria.', embeds: [], components: [] });
  }

  const embed = new EmbedBuilder()
    .setTitle('🔍 Search Results')
    .setDescription(`Found **${results.length}** active trade(s) matching your search.`)
    .setColor(0x2ECC71)
    .setFooter({ text: 'Card Exchange System' })
    .setTimestamp();

  const rows = [];
  for (const res of results) {
    embed.addFields({
      name: `🃏 ${res.wantedCard}`,
      value: `**Offering:** ${res.offeredCards.join(', ')}\n**Lister:** <@${res.userId}>\n[Jump to Post](https://discord.com/channels/${interaction.guildId}/${res.channelId}/${res.messageId})`,
      inline: false
    });

    if (res.userId !== interaction.user.id) {
      const btn = new ButtonBuilder()
        .setCustomId(`cex_interested_${res.userId}`)
        .setLabel(`Interested in ${res.wantedCard}`)
        .setStyle(ButtonStyle.Success)
        .setEmoji('🤝');
      rows.push(new ActionRowBuilder().addComponents(btn));
    }
  }

  sessions.delete(interaction.user.id);
  return interaction.update({ embeds: [embed], components: rows.slice(0, 5) });
}

/* ─── Browse Handlers ─────────────────────────────────────────────────────── */

async function handleBrowseButton(interaction) {
  if (!hasTraderRole(interaction.member)) return denyEphemeral(interaction, '❌ You need the **Trader** role to browse exchanges.');
  
  const lastSearch = searchCooldowns.get(interaction.user.id);
  if (lastSearch && (Date.now() - lastSearch) < SEARCH_COOLDOWN_MS) {
    return denyEphemeral(interaction, `⏳ Browse cooldown! Wait **${Math.ceil((SEARCH_COOLDOWN_MS - (Date.now() - lastSearch)) / 1000)}s**.`);
  }

  const results = await CardExchange.find({ expiresAt: { $gt: new Date() } })
    .sort({ createdAt: -1 })
    .limit(5);

  if (results.length === 0) {
    searchCooldowns.set(interaction.user.id, Date.now());
    return denyEphemeral(interaction, '🤝 **No active trades found** at the moment.');
  }

  const embed = new EmbedBuilder()
    .setTitle('🤝 RECENT EXCHANGES')
    .setDescription('Here are some of the most recent trade requests in the market:')
    .setColor(0xF1C40F)
    .setFooter({ text: 'CARD EXCHANGE SYSTEM • LIVE MARKET' })
    .setTimestamp();

  const rows = [];
  for (const res of results) {
    embed.addFields({
      name: `🃏 ${res.wantedCard}`,
      value: `**Offering:** ${res.offeredCards.join(', ')}\n**Lister:** <@${res.userId}>\n[Jump to Post](https://discord.com/channels/${interaction.guildId}/${res.channelId}/${res.messageId})`,
      inline: false
    });

    if (res.userId !== interaction.user.id) {
      const btn = new ButtonBuilder()
        .setCustomId(`cex_interested_${res.userId}`)
        .setLabel(`Interested in ${res.wantedCard}`)
        .setStyle(ButtonStyle.Success)
        .setEmoji('🤝');
      rows.push(new ActionRowBuilder().addComponents(btn));
    }
  }

  searchCooldowns.set(interaction.user.id, Date.now());
  return interaction.reply({ embeds: [embed], components: rows.slice(0, 5), flags: MessageFlags.Ephemeral });
}

async function handleStep1(interaction) {
  const session = sessions.get(interaction.user.id);
  if (!session || session.step !== 1) return denyEphemeral(interaction, '❌ Session expired. Click "Post Exchange" again.');

  const category = interaction.values[0];
  session.wantedCategory = category;
  session.step = 2;

  const CARDS = await getCards();
  return interaction.update(buildStep2(category, CARDS));
}

async function handleStep2(interaction) {
  const session = sessions.get(interaction.user.id);
  if (!session || session.step !== 2) return denyEphemeral(interaction, '❌ Session expired. Click "Post Exchange" again.');

  const wantedCard = interaction.values[0];
  session.wantedCard = wantedCard;
  session.step = 3;

  const CARDS = await getCards();
  return interaction.update(buildStep3(wantedCard, session.wantedCategory, CARDS));
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

  // Save to MongoDB with 4-hour expiration
  await CardExchange.create({
    userId: interaction.user.id,
    messageId: msg.id,
    channelId: interaction.channelId,
    wantedCard: session.wantedCard,
    offeredCards: session.offeredCards,
    expiresAt: new Date(Date.now() + EXPIRE_MS)
  }).catch(err => console.error('[CardExchange] DB Save Error:', err));

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

    // Save thread to DB for 30-min auto-cleanup
    const listing = await CardExchange.findOne({ messageId: interaction.message.id });
    if (listing) {
      await CardExchangeThread.create({
        threadId: thread.id,
        listingId: listing._id,
        posterId: posterId,
        interestedId: interaction.user.id,
        expiresAt: new Date(Date.now() + THREAD_EXPIRE_MS)
      }).catch(err => console.error('[CardExchange] Thread DB Save Error:', err));
    }

    const dealFinalBtn = new ButtonBuilder()
      .setCustomId(`cex_deal_final_${interaction.user.id}`)
      .setLabel('Finalize Deal')
      .setStyle(ButtonStyle.Success)
      .setEmoji('💎');

    const dealCancelBtn = new ButtonBuilder()
      .setCustomId(`cex_deal_cancel_${interaction.user.id}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('✖️');

    const row = new ActionRowBuilder().addComponents(dealFinalBtn, dealCancelBtn);

    const matchEmbed = new EmbedBuilder()
      .setTitle('🤝 TRADE MATCH FOUND')
      .setDescription(
        `Hello <@${posterId}> and <@${interaction.user.id}>!\n\n` +
        'Use this private thread to discuss your trade details.\n' +
        'Once you both agree, the **Lister** should click **"Finalize Deal"**.'
      )
      .addFields(
        { name: '👤 Lister', value: `<@${posterId}>`, inline: true },
        { name: '🙋 Interested', value: `<@${interaction.user.id}>`, inline: true }
      )
      .setColor(0xF1C40F)
      .setFooter({ text: 'Private Trading Thread • Auto-expires in 30m' });

    await thread.send({
      embeds: [matchEmbed],
      components: [row]
    });

    await interaction.followUp({ content: `✅ Private thread created: ${thread}`, flags: MessageFlags.Ephemeral });
  } catch (err) {
    console.error('[CardExchange] handleInterested Error:', err);
    await interaction.followUp({ content: '❌ Something went wrong.', flags: MessageFlags.Ephemeral });
  }
}

/* ─── Deal Handlers ───────────────────────────────────────────────────────── */
async function handleDealFinal(interaction) {
  const threadEntry = await CardExchangeThread.findOne({ threadId: interaction.channelId });
  if (!threadEntry) return interaction.reply({ content: '❌ Thread data not found.', flags: MessageFlags.Ephemeral });

  // Only the Lister (poster) can finalize
  if (interaction.user.id !== threadEntry.posterId) {
    return interaction.reply({ content: '❌ Only the Lister can finalize the deal!', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply();

  try {
    const listing = await CardExchange.findById(threadEntry.listingId);
    if (listing) {
      const channel = await interaction.client.channels.fetch(listing.channelId).catch(() => null);
      if (channel) {
        const msg = await channel.messages.fetch(listing.messageId).catch(() => null);
        if (msg) await msg.delete().catch(() => {});
      }
      await CardExchange.deleteOne({ _id: listing._id });
    }

    await interaction.editReply('✅ **Deal Finalized!** The listing has been removed. This thread will now close.');
    
    // Cleanup this thread and any other threads for this listing
    const siblingThreads = await CardExchangeThread.find({ listingId: threadEntry.listingId });
    for (const st of siblingThreads) {
      const thread = await interaction.client.channels.fetch(st.threadId).catch(() => null);
      if (thread) await thread.delete().catch(() => {});
      await CardExchangeThread.deleteOne({ _id: st._id });
    }
  } catch (err) {
    console.error('[CardExchange] handleDealFinal Error:', err);
    await interaction.editReply('❌ Failed to finalize deal.');
  }
}

async function handleDealCancel(interaction) {
  const threadEntry = await CardExchangeThread.findOne({ threadId: interaction.channelId });
  if (!threadEntry) return interaction.reply({ content: '❌ Thread data not found.', flags: MessageFlags.Ephemeral });

  // Lister or Interested person can cancel
  if (interaction.user.id !== threadEntry.posterId && interaction.user.id !== threadEntry.interestedId) {
    return interaction.reply({ content: '❌ You are not part of this deal.', flags: MessageFlags.Ephemeral });
  }

  await interaction.reply('✖️ **Deal Cancelled.** This thread will now close.');
  
  try {
    const thread = await interaction.client.channels.fetch(threadEntry.threadId).catch(() => null);
    if (thread) await thread.delete().catch(() => {});
    await CardExchangeThread.deleteOne({ _id: threadEntry._id });
  } catch (err) {
    console.error('[CardExchange] handleDealCancel Error:', err);
  }
}

/* ─── Main Router ─────────────────────────────────────────────────────────── */
let _handler = null;

function registerHandler(client) {
  if (_handler) {
    client.removeListener('interactionCreate', _handler);
  }

  _handler = async interaction => {
    try {
      if (interaction.isButton()) {
        if (interaction.customId === 'cex_post') return handlePostButton(interaction);
        if (interaction.customId === 'cex_search') return handleSearchButton(interaction);
        if (interaction.customId === 'cex_browse') return handleBrowseButton(interaction);
        if (interaction.customId.startsWith('cex_interested_')) return handleInterested(interaction);
        if (interaction.customId.startsWith('cex_deal_final_')) return handleDealFinal(interaction);
        if (interaction.customId.startsWith('cex_deal_cancel_')) return handleDealCancel(interaction);
      }
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'cex_step1_cat') return handleStep1(interaction);
        if (interaction.customId === 'cex_step2_card') return handleStep2(interaction);
        if (interaction.customId === 'cex_step3_offer') return handleStep3(interaction);
        if (interaction.customId === 'cex_search_cat') return handleSearchCat(interaction);
        if (interaction.customId === 'cex_search_card') return handleSearchCard(interaction);
      }
      if (interaction.isModalSubmit() && interaction.customId === 'cex_modal_code') return handleCodeModal(interaction);
    } catch (err) {
      console.error('[CardExchange] Interaction error:', err.message);
      // Optional: send error to user if they are the reason
      if (err.message.includes('Invalid Form Body')) {
        console.error('[CardExchange] Payload details:', JSON.stringify(err.requestBody?.json?.data, null, 2));
      }
    }
  };

  client.on('interactionCreate', _handler);
}

/* ─── Cleanup ─────────────────────────────────────────────────────────────── */
async function cleanupExchanges(client) {
  try {
    const expiredListings = await CardExchange.find({ expiresAt: { $lte: new Date() } });
    for (const entry of expiredListings) {
      const channel = await client.channels.fetch(entry.channelId).catch(() => null);
      if (channel) {
        const msg = await channel.messages.fetch(entry.messageId).catch(() => null);
        if (msg) await msg.delete().catch(() => {});
      }
      
      // Also cleanup threads for this expired listing
      const threads = await CardExchangeThread.find({ listingId: entry._id });
      for (const t of threads) {
        const thread = await client.channels.fetch(t.threadId).catch(() => null);
        if (thread) await thread.delete().catch(() => {});
        await CardExchangeThread.deleteOne({ _id: t._id });
      }

      await CardExchange.deleteOne({ _id: entry._id });
    }

    // Cleanup lonely expired threads
    const expiredThreads = await CardExchangeThread.find({ expiresAt: { $lte: new Date() } });
    for (const t of expiredThreads) {
      const thread = await client.channels.fetch(t.threadId).catch(() => null);
      if (thread) await thread.delete().catch(() => {});
      await CardExchangeThread.deleteOne({ _id: t._id });
    }
  } catch (err) {
    console.error('[CardExchange] Cleanup Error:', err.message);
  }
}

module.exports = { registerHandler, cleanupExchanges };
