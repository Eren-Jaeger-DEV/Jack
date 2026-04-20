
const mongoose = require('mongoose');
require('dotenv').config();

async function checkDbStats() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const stats = await db.command({ dbStats: 1 });

        console.log('Database Statistics:');
        console.log(JSON.stringify(stats, null, 2));

        // For Atlas free tier, the limit is usually 512MB (536870912 bytes)
        // Let's see if we can get storage details
        const storageSize = stats.storageSize; // in bytes
        const dataSize = stats.dataSize; // in bytes
        
        console.log(`\nData Size: ${(dataSize / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`Storage Size: ${(storageSize / (1024 * 1024)).toFixed(2)} MB`);
        
        // Atlas Free Tier (M0) is 512MB
        const capacityMB = 512;
        const usedMB = storageSize / (1024 * 1024);
        const remainingMB = capacityMB - usedMB;

        console.log(`\nEstimated Capacity (Atlas M0): ${capacityMB} MB`);
        console.log(`Remaining Space: ${remainingMB.toFixed(2)} MB (${((remainingMB / capacityMB) * 100).toFixed(2)}%)`);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkDbStats();
