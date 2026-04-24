const mongoose = require('mongoose');
const EmojiBank = require('./bot/database/models/EmojiBank');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const emojis = await EmojiBank.find();
  for (let e of emojis) {
     if (!e.url || !e.url.startsWith('http')) {
        console.log(`Invalid URL for ${e.name}: ${e.url}`);
     }
  }
  console.log('Done checking emojis.');
  process.exit();
});
