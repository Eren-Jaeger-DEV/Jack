module.exports = {
    async handleAutoplay(client, guildId) {
        const queue = client.music.getQueue(guildId);
        if (queue.loop) return;

        try {
            const lastTrack = queue.current;
            if (!lastTrack) return;

            const node = client.music.shoukaku.options.nodeResolver(client.music.shoukaku.nodes);
            const searchResult = await node.rest.resolve(`ytsearch:${lastTrack.info.author || lastTrack.info.title}`);

            if (!searchResult || !searchResult.data || searchResult.data.length < 2) return;

            // Find next related track
            const nextTrack = searchResult.data.find(t => t.info.uri !== lastTrack.info.uri);
            if (nextTrack) {
                queue.tracks.push(nextTrack);
                await client.music.playNext(guildId);
            }
        } catch (err) {
            console.error(`[Autoplay Error] ${err.message}`);
        }
    }
};
