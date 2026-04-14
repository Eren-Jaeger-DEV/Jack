
const mongoose = require('mongoose');

const ServerStatsSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['TOTAL', 'ONLINE', 'IDLE', 'DND', 'HUMANS', 'BOTS'],
        required: true 
    },
    nameFormat: { type: String, default: '{type}: {count}' },
    lastKnownValue: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ServerStats', ServerStatsSchema);
