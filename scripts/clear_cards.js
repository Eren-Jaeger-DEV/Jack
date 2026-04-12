require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");

async function run() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.");
    
    console.log("Purging all cards from the database...");
    const result = await mongoose.connection.collection("cards").deleteMany({});
    
    console.log(`Success! Deleted ${result.deletedCount} documents.`);

  } catch (err) {
    console.error("Clear Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
    process.exit(0);
  }
}

run();
