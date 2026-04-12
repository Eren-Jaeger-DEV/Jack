/**
 * replicate_server.js
 * Mirrors the full channel structure of JACK • XZEEMO into Bot's land.
 * Deletes all existing channels in Bot's land first, then recreates.
 */

require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');

const MAIN_ID = '1341978655437619250';  // JACK • XZEEMO
const TEST_ID = '1479678633588297898';  // Bot's land

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

client.once('clientReady', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const main = client.guilds.cache.get(MAIN_ID);
  const test  = client.guilds.cache.get(TEST_ID);

  if (!main) return console.error('❌ Cannot find main server.');
  if (!test)  return console.error('❌ Cannot find test server.');

  console.log(`\n📖 Source: ${main.name}`);
  console.log(`🎯 Target: ${test.name}`);

  /* ─────────────────────────────────────
   *  STEP 1: Delete all existing channels
   * ───────────────────────────────────── */
  console.log('\n🗑️  Clearing existing channels in Bot\'s land...');
  const existing = [...test.channels.cache.values()].sort((a, b) => {
    // Delete children before parents
    const aIsChild = a.parentId ? 1 : 0;
    const bIsChild = b.parentId ? 1 : 0;
    return bIsChild - aIsChild;
  });

  for (const ch of existing) {
    try {
      await ch.delete('Server replication').catch(() => {});
      await sleep(400);
    } catch (e) {
      console.log(`  ⚠️  Could not delete: ${ch.name}`);
    }
  }

  /* ─────────────────────────────────────
   *  STEP 2: Create rules channel (no cat)
   * ───────────────────────────────────── */
  const mainChannels = main.channels.cache.sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));
  const noCategory = mainChannels.filter(c => c.type !== ChannelType.GuildCategory && !c.parentId);

  console.log('\n📝 Creating uncategorized channels...');
  for (const ch of noCategory.values()) {
    try {
      await test.channels.create({
        name: ch.name,
        type: ch.type,
        topic: ch.topic || undefined,
        nsfw: ch.nsfw || false,
        rateLimitPerUser: ch.rateLimitPerUser || 0,
      });
      console.log(`  ✅ [no-cat] #${ch.name}`);
      await sleep(600);
    } catch (e) {
      console.log(`  ❌ Failed: ${ch.name} — ${e.message}`);
    }
  }

  /* ─────────────────────────────────────
   *  STEP 3: Recreate categories + children
   * ───────────────────────────────────── */
  const categories = mainChannels
    .filter(c => c.type === ChannelType.GuildCategory)
    .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));

  console.log(`\n📂 Replicating ${categories.size} categories...\n`);

  for (const cat of categories.values()) {
    // Create category
    let newCat;
    try {
      newCat = await test.channels.create({
        name: cat.name,
        type: ChannelType.GuildCategory,
        position: cat.rawPosition,
      });
      console.log(`📁 ${cat.name}`);
      await sleep(600);
    } catch (e) {
      console.log(`❌ Failed to create category: ${cat.name} — ${e.message}`);
      continue;
    }

    // Create children under this category
    const children = mainChannels
      .filter(c => c.parentId === cat.id)
      .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));

    for (const ch of children.values()) {
      try {
        const options = {
          name: ch.name,
          type: ch.type,
          parent: newCat.id,
          position: ch.rawPosition,
        };

        if (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement) {
          options.topic = ch.topic || undefined;
          options.nsfw = ch.nsfw || false;
          options.rateLimitPerUser = ch.rateLimitPerUser || 0;
        }

        if (ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice) {
          options.bitrate = ch.bitrate || 64000;
          options.userLimit = ch.userLimit || 0;
        }

        await test.channels.create(options);
        const icon = ch.type === ChannelType.GuildVoice ? '🔊' :
                     ch.type === ChannelType.GuildAnnouncement ? '📢' : '💬';
        console.log(`  ${icon} ${ch.name}`);
        await sleep(600);
      } catch (e) {
        console.log(`  ❌ Failed: ${ch.name} — ${e.message}`);
      }
    }
    console.log('');
  }

  console.log('✅ Done! Bot\'s land now mirrors JACK • XZEEMO structure.');
  console.log('\n⚠️  NOTE: Roles, permissions, and bot config (GuildConfig in DB) need to be set up manually.');
  client.destroy();
});

client.login(process.env.BOT_TOKEN);
