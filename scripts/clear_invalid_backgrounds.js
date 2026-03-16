const mongoose = require('mongoose');
const axios = require('axios');
const Level = require('../bot/database/models/Level');
require('dotenv').config();

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const profiles = await Level.find({ background: { $ne: "" } });
  console.log(`Checking ${profiles.length} profiles with custom backgrounds...`);

  for (const profile of profiles) {
    try {
      const response = await axios.head(profile.background, { timeout: 5000 });
      if (response.status !== 200) {
        console.log(`Clearing invalid background for ${profile.userId} (Status: ${response.status}): ${profile.background}`);
        profile.background = "";
        await profile.save();
      }
    } catch (err) {
      console.log(`Clearing invalid background for ${profile.userId} (Error: ${err.message}): ${profile.background}`);
      profile.background = "";
      await profile.save();
    }
  }

  console.log('Cleanup complete.');
  await mongoose.disconnect();
}

cleanup().catch(console.error);
