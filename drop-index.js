require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");

async function run() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.");
    
    console.log("Dropping listingID_1 index from popdeals collection...");
    try {
      await mongoose.connection.collection("popdeals").dropIndex("listingID_1");
      console.log("Index dropped successfully.");
    } catch (indexErr) {
      if (indexErr.code === 27) {
        console.log("Index not found, no need to drop.");
      } else {
        console.error("Error dropping index:", indexErr);
      }
    }

  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
    process.exit(0);
  }
}

run();
