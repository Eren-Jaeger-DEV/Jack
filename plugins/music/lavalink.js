const { Shoukaku, Connectors } = require('shoukaku');
const { addLog } = require('../../utils/logger');

const Nodes = [
    {
        name: 'LocalNode',
        url: '127.0.0.1:2333',
        auth: 'youshallnotpass',
        secure: false
    }
];

module.exports = (client) => {
    const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), Nodes, {
        moveOnDisconnect: true,
        resume: true,
        resumeKey: 'JackResumeKey',
        reconnectTries: 5,
        restTimeout: 15000
    });

    shoukaku.on('ready', (name) => {
        addLog("Lavalink", `Node "${name}" connected successfully`);
    });

    shoukaku.on('error', (name, error) => {
        console.error(`[Lavalink Error] Node "${name}":`, error);
    });

    shoukaku.on('close', (name, code, reason) => {
        console.warn(`[Lavalink Closed] Node "${name}": Code ${code}, Reason ${reason}`);
    });

    shoukaku.on('disconnect', (name, players, moved) => {
        if (moved) return;
        addLog("Lavalink", `Node "${name}" disconnected`);
    });

    // Provide a simple queue manager
    client.music = {
        shoukaku,
        queues: new Map(),

        getQueue(guildId) {
            if (!this.queues.has(guildId)) {
                this.queues.set(guildId, {
                    tracks: [],
                    current: null,
                    loop: false,
                    textChannel: null,
                    voiceChannel: null
                });
            }
            return this.queues.get(guildId);
        },

        async playNext(guildId) {
            const queue = this.getQueue(guildId);
            const player = shoukaku.players.get(guildId);

            if (!player) return;

            if (queue.tracks.length === 0) {
                queue.current = null;
                // Trigger autoplay or emit event
                client.emit('musicEmptyQueue', guildId);
                return;
            }

            const nextTrack = queue.tracks.shift();
            queue.current = nextTrack;

            await player.playTrack({ encoded: nextTrack.encoded });
        }
    };

    return shoukaku;
};
