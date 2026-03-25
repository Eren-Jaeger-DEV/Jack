const createLavalink = require('./lavalink');
const { addLog } = require('../../utils/logger');
const autoplaySystem = require('./systems/autoplay');
const controllerSystem = require('./systems/controller');

module.exports = {
    load(client) {
        const shoukaku = createLavalink(client);
        
        // Lavalink Player Events
        shoukaku.on('ready', () => {
             addLog("Music", "Plugin initialized (Lavalink Mode)");
        });

        // Track Events
        shoukaku.on('playerStart', (guildId, track) => {
            const queue = client.music.getQueue(guildId);
            controllerSystem.sendControlPanel(queue, track);
        });

        shoukaku.on('playerEnd', (guildId) => {
            client.music.playNext(guildId);
        });

        shoukaku.on('playerException', (guildId, error) => {
            console.error(`[Record Error] Playback error in guild ${guildId}:`, error);
        });

        client.on('raw', (packet) => {
            // Optional: Listen for specific packets if needed
        });


        addLog("Music", "Plugin initialized");
    }
};
