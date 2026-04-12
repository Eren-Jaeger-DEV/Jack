require('dotenv').config({ path: '.env.test' });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const GuildConfig = require('./bot/database/models/GuildConfig');

  const main = await GuildConfig.findOne({ guildId: '1341978655437619250' });
  const test  = await GuildConfig.findOne({ guildId: '1479678633588297898' });

  console.log('=== MAIN SERVER CONFIG ===');
  if (main && main.settings) {
    console.log(JSON.stringify(main.settings, null, 2));
  } else {
    console.log('None');
  }

  console.log('\n=== TEST SERVER CONFIG ===');
  if (test && test.settings) {
    console.log(JSON.stringify(test.settings, null, 2));
  } else {
    console.log('No config found for Test server');
  }

  await mongoose.disconnect();
  process.exit(0);
});
