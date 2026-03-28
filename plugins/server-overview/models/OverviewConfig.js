const mongoose = require('mongoose');

const OverviewConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    overviewMessageId: { type: String, default: null },
    controlMessageId: { type: String, default: null },
    sections: [
        {
            name: { type: String, required: true },
            items: [
                {
                    title: { type: String, required: true },
                    description: { type: String, required: true }
                }
            ]
        }
    ]
});

module.exports = mongoose.model('OverviewConfig', OverviewConfigSchema);
