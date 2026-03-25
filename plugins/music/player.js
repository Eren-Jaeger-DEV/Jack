const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');

module.exports = (client) => {
    const player = new Player(client, {
        ytdlOptions: {
            quality: 'highestaudio',
            highWaterMark: 1 << 25
        }
    });

    // Load official extractors + specific ones for reliability
    player.extractors.loadMulti(DefaultExtractors).then(() => {
        console.log('[Music] Extractors loaded successfully');
    }).catch(err => {
        console.error('[Music] Failed to load extractors:', err.message);
    });

    return player;
};
