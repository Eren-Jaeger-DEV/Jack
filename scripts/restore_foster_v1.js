const mongoose = require('mongoose');
const GuildConfig = require('../bot/database/models/GuildConfig');
const FosterProgram = require('../plugins/foster-program/models/FosterProgram');
require('dotenv').config();

const GUILD_ID = '1341978655437619250';
const FOSTER_CHANNEL_ID = '1477150817021858047';
const DOCUMENT_ID = '69ce360c2d6ef2a070d63531'; // The real program with 6 pairs

async function migrate() {
  console.log('🔄 Migrating Foster Program v1 (6 pairs) to v2...');

  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not found in .env');

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB.');

    // 1. Restore and Update the FosterProgram document
    const program = await FosterProgram.findById(DOCUMENT_ID);
    if (!program) throw new Error('FosterProgram document not found.');

    program.active = true;
    program.status = 'ACTIVE';
    program.term = 1;
    program.cycle = 1;
    program.guildId = GUILD_ID;
    // Clear any registration state if it affects v2 shuffles
    program.registration.targets = []; 
    // Set the startedAt to now or preserve it? Preserve it.
    await program.save();
    console.log(`✅ Restored Foster Program: ${DOCUMENT_ID} | Pairs: ${program.pairs.length}`);

    // 2. Set the Foster Channel ID
    await GuildConfig.findOneAndUpdate(
      { guildId: GUILD_ID },
      { $set: { 'settings.fosterChannelId': FOSTER_CHANNEL_ID } }
    );
    console.log(`✅ Foster Channel set to: ${FOSTER_CHANNEL_ID}`);

    // 3. Deactivate any other active programs for safety
    await FosterProgram.updateMany(
      { guildId: GUILD_ID, active: true, _id: { $ne: DOCUMENT_ID } },
      { $set: { active: false, status: 'ENDED' } }
    );

    console.log('\n✨ **MIGRATION SUCCESSFUL**');
    console.log('Program logic is now synced with v2. Next rotation will handle unique shuffles.');

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration Error:', err);
    process.exit(1);
  }
}

migrate();
