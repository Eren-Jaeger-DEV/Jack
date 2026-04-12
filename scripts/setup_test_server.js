/**
 * setup_test_server.js
 * Auto-matches Bot's land channels by name to main server config keys,
 * then writes a full GuildConfig for the test server.
 * Also sets dataGuildId so Jack-Dev reads live data from the main server.
 */

require('dotenv').config({ path: '.env.test' });
const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');

const MAIN_ID = '1341978655437619250';
const TEST_ID = '1479678633588297898';

// Mapping: configKey => channel name to search for in Bot's land
const CHANNEL_MAP = {
  classificationChannelId:  'ᴡᴇʟᴄᴏᴍᴇ',
  generalChannelId:         'ɢᴇɴᴇʀᴀʟ-ᴄʜᴀᴛ',
  mediaChannelId:           'ᴍᴇᴅɪᴀ',
  linksChannelId:           'ᴍᴇᴍᴇ-ʟɪɴᴋᴍᴇᴅɪᴀ',
  aiChannelId:              'ᴊᴀᴄᴋ-ᴄʜᴀᴛ',
  botCommandsChannelId:     'ʙᴏᴛs-ᴄᴍᴅ',
  marketChannelId:          'ᴘᴏᴘ-ᴇᴄᴏɴᴏᴍʏ',
  cardExchangeChannelId:    'ᴄᴀʀᴅ-ᴇxᴄʜᴀɴɢᴇ',
  countingChannelId:        'ᴄᴏᴜɴᴛɪɴɢ',
  clanBattleChannelId:      'ᴄʟᴀɴ-ʙᴀᴛᴛʟᴇ',
  fosterChannelId:          'ғᴏsᴛᴇʀ-ᴘʀᴏɢʀᴀᴍ',
  synergyChannelId:         'sᴇᴀsᴏɴᴀʟ-sʏɴᴇʀɢʏ',
  intraAnnounceChannelId:   'ɪɴᴛʀᴀ-ᴄʟᴀɴ-ᴍᴀᴛᴄʜᴇs',
  teamupChannelId:          'ᴛᴇᴀᴍ-ᴜᴘ-ᴄʜᴀᴛ',
  logChannelId:             'ᴍᴇssᴀɢᴇ-ʟᴏɢ',
  marketLogChannelId:       'ᴘᴏᴘ-ʟᴏɢ',
  inviteLogChannelId:       'ɪɴᴠɪᴛᴇ-ʟᴏɢ',
  cardDatabaseChannelId:    'card-db',
  tempvcPanelChannelId:     'ᴠᴄ-ᴄᴏɴᴛʀᴏʟ-ᴘᴀɴᴇʟ',
};

// Category name map
const CATEGORY_MAP = {
  tempvcCategoryId:  'ᴠᴏɪᴄᴇ',
  dealCategoryId:    'ᴘᴏᴘ ᴅᴇᴀʟ',
};

// Voice channel map
const VOICE_MAP = {
  tempvcCreateChannelId: '➕ᴄʀᴇᴀᴛᴇ ᴠᴄ',
};

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ DB Connected\n');

  const GuildConfig = require('../bot/database/models/GuildConfig');
  const testGuild = client.guilds.cache.get(TEST_ID);
  if (!testGuild) return console.error('❌ Cannot find test server');

  const channels = testGuild.channels.cache;
  const { ChannelType } = require('discord.js');

  const newSettings = {
    xpIgnoreChannels: [],
    aiEnabled: true,
    levelRoles: {},
    // ── This is the key: read live data from the main server ──
    dataGuildId: MAIN_ID,
  };

  let matched = 0, missed = 0;

  // Text channels
  for (const [key, name] of Object.entries(CHANNEL_MAP)) {
    const ch = channels.find(c =>
      c.type === ChannelType.GuildText &&
      c.name.toLowerCase().includes(name.toLowerCase())
    );
    if (ch) {
      newSettings[key] = ch.id;
      console.log(`  ✅ ${key.padEnd(30)} → #${ch.name}`);
      matched++;
    } else {
      console.log(`  ❌ ${key.padEnd(30)} → NOT FOUND (looking for: ${name})`);
      missed++;
    }
  }

  // Categories
  for (const [key, name] of Object.entries(CATEGORY_MAP)) {
    const ch = channels.find(c =>
      c.type === ChannelType.GuildCategory &&
      c.name.toLowerCase().includes(name.toLowerCase())
    );
    if (ch) {
      newSettings[key] = ch.id;
      console.log(`  ✅ ${key.padEnd(30)} → [CAT] ${ch.name}`);
      matched++;
    } else {
      console.log(`  ❌ ${key.padEnd(30)} → NOT FOUND`);
      missed++;
    }
  }

  // Voice channels
  for (const [key, name] of Object.entries(VOICE_MAP)) {
    const ch = channels.find(c =>
      c.type === ChannelType.GuildVoice &&
      c.name.toLowerCase().includes(name.toLowerCase())
    );
    if (ch) {
      newSettings[key] = ch.id;
      console.log(`  ✅ ${key.padEnd(30)} → 🔊 ${ch.name}`);
      matched++;
    } else {
      console.log(`  ❌ ${key.padEnd(30)} → NOT FOUND`);
      missed++;
    }
  }

  // Save to DB
  await GuildConfig.findOneAndUpdate(
    { guildId: TEST_ID },
    { $set: { settings: newSettings } },
    { upsert: true }
  );

  console.log(`\n✅ Bot's land GuildConfig saved!`);
  console.log(`   Matched: ${matched} | Missed: ${missed}`);
  console.log(`   dataGuildId → JACK • XZEEMO (live data source)`);

  await mongoose.disconnect();
  client.destroy();
  process.exit(0);
});

client.login(process.env.BOT_TOKEN);
