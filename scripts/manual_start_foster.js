const mongoose = require('mongoose');
const Player = require('../bot/database/models/Player');
const GuildConfig = require('../bot/database/models/GuildConfig');
const FosterProgram = require('../plugins/foster-program/models/FosterProgram');
require('dotenv').config();

// Explicit mapping of Discord IDs to avoid name resolution issues
const PAIRS_IDS = [
  { mentor: "1415693094397153444", newbie: "1281919262591811597", mName: "KennY", nName: "TomPlayzzYT" },
  { mentor: "1270985058118926338", newbie: "1035525922603937814", mName: "Kezzo", nName: "EVIL〆StONeROP" },
  { mentor: "884290995947192360", newbie: "1207631055436255282", mName: "ASURxTEERTH20", nName: "IGL父JINRANG" },
  { mentor: "1255080704501485668", newbie: "1466143194977927385", mName: "A R I S E", nName: "AJ Stranger" },
  { mentor: "1229664059473793104", newbie: "802198731058577468", mName: "DÁRK囧SØÜL", nName: "CAGO" },
  { mentor: "1483044522005893241", newbie: "1482380980114165891", mName: "SRVxIgNiTo02", nName: "Kathan PlayZzz" },
  { mentor: "774535789219414026", newbie: "1169490424361127951", mName: "Eeeuuiiee", nName: "FAXON最強" },
  { mentor: "975526891446493184", newbie: "1015263293239210004", mName: "Helium04u", nName: "7T6xBICH" },
  { mentor: "1451749240836587637", newbie: "1126496354991091752", mName: "BOOGEYMAN", nName: "RANJHA" }
];

async function launch() {
  console.log('🚀 Launching Manual Foster Program Initiation (v2 - Explicit IDs)...');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB.');

    // 1. Get the primary guild config
    const config = await GuildConfig.findOne();
    if (!config) throw new Error('GuildConfig not found.');
    const guildId = config.guildId;

    // 2. Enable plugins
    config.plugins.fosterProgram = true;
    config.plugins.channelManagement = true;
    await config.save();
    console.log(`✅ Enabled plugins for Guild: ${guildId}`);

    // 3. Resolve Pairs
    const finalPairs = [];
    for (const pair of PAIRS_IDS) {
        finalPairs.push({
            mentorId: pair.mentor,
            partnerId: pair.newbie,
            points: 0
        });
        console.log(`   🤝 Paired: [Mentor] ${pair.mName} + [Newbie] ${pair.nName}`);
    }

    // 4. Create/Update FosterProgram Document
    // Deactivate any existing program for this guild
    await FosterProgram.updateMany({ guildId }, { active: false, status: 'ENDED' });

    const program = new FosterProgram({
        guildId,
        active: true,
        status: 'ACTIVE',
        phase: 1,
        rotationIndex: 0,
        pairs: finalPairs,
        registration: {
            mentorPoolSize: 15,
            registeredMentors: finalPairs.map(p => p.mentorId),
            registeredNeophytes: finalPairs.map(p => p.partnerId)
        },
        startedAt: new Date(),
        lastRotation: new Date()
    });

    await program.save();
    console.log(`\n✨ Foster Program active with ${finalPairs.length} pairs.`);
    console.log(`✨ Phase: ORIENTATION`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal Error during launch:', err);
    process.exit(1);
  }
}

launch();
