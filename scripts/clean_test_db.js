require('dotenv').config({ path: '.env.test' });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const GuildConfig = require('../bot/database/models/GuildConfig');
  await GuildConfig.updateOne(
    { guildId: "1479678633588297898" },
    { $unset: { "settings.dataGuildId": 1 } }
  );
  console.log("✅ Clean slate preserved for Bot's land!");
  await mongoose.disconnect();
  process.exit(0);
});
