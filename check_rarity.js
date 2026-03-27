require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Card = mongoose.connection.collection("cards");
    const sample = await Card.find({ rarity: { $exists: true } }).toArray();
    
    if (sample.length > 0) {
      console.log(`Found ${sample.length} cards with rarity field!`);
      console.log(JSON.stringify(sample[0], null, 2));
    } else {
      console.log("No cards with rarity found in the database. ✅");
    }

  } catch (err) {
    console.error("Check Error:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
