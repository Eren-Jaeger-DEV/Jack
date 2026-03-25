const { SlashCommandBuilder } = require('discord.js');
const smartQueue = require('../systems/smartQueue');

module.exports = {
    name: 'play',
    category: 'music',
    description: 'Play a song from YouTube or search',
    aliases: ['p'],
    usage: '/play <song_name_or_url>',

    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song from YouTube or search')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The song you want to play')
                .setRequired(true)
        ),

    async run(ctx) {
        const { client, member, guild, channel } = ctx;
        if (!member.voice.channel) {
            return ctx.reply({ content: '❌ You must be in a voice channel.', ephemeral: true });
        }

        const query = ctx.isInteraction ? ctx.options.getString('query') : ctx.args.join(' ');
        if (!query) return ctx.reply({ content: '❌ Please provide a song.', ephemeral: true });

        try {
            await ctx.defer({ ephemeral: true });

            const node = client.music.shoukaku.getIdealNode() || client.music.shoukaku.nodes.values().next().value;
            if (!node) {
                return ctx.reply({ content: `❌ No Lavalink nodes are available. Current Status: ${client.music.shoukaku.nodes.size} nodes found.` });
            }
            
            // Try SoundCloud first as YouTube is currently blocked on this machine (403 Stuck)
            let searchResult = await node.rest.resolve(query.startsWith('http') ? query : `scsearch:${query}`);
            
            // Fallback to YouTube only if it's a URL or if SoundCloud empty
            if (!searchResult || searchResult.loadType === 'empty' || searchResult.loadType === 'error') {
                searchResult = await node.rest.resolve(query.startsWith('http') ? query : `ytsearch:${query}`);
            }

            if (!searchResult || !searchResult.data || (Array.isArray(searchResult.data) && searchResult.data.length === 0)) {
                return ctx.reply({ content: '❌ No results found on SoundCloud or YouTube.' });
            }

            const loadType = searchResult.loadType.toLowerCase();
            let track;

            if (loadType === 'track' || loadType === 'short') {
                track = searchResult.data;
            } else if (loadType === 'search') {
                track = searchResult.data[0];
            } else if (loadType === 'playlist') {
                track = searchResult.data.tracks[0];
            }

            if (!track || !track.info) {
                console.warn('[Music] Failed to extract track. loadType:', loadType);
                return ctx.reply({ content: `❌ Could not extract track information (Type: ${loadType}).` });
            }

            const queue = client.music.getQueue(guild.id);

            if (smartQueue.isDuplicate(queue, track.info)) {
                 return ctx.reply({ content: `⚠️ **${track.info.title}** is already in the queue!` });
            }

            let player = client.music.shoukaku.players.get(guild.id);
            if (!player) {
                player = await client.music.shoukaku.joinVoiceChannel({
                    guildId: guild.id,
                    channelId: member.voice.channel.id,
                    shardId: 0 // Single shard
                });
                
                player.on('start', (data) => {
                    console.log(`[Music Debug] Track started in ${guild.id}: ${track.info.title}`);
                    client.music.shoukaku.emit('playerStart', guild.id, track.info);
                });
                player.on('end', () => {
                    console.log(`[Music Debug] Track ended in ${guild.id}`);
                    client.music.shoukaku.emit('playerEnd', guild.id);
                });
                
                console.log(`[Music Debug] Player created for guild ${guild.id}`);
            }

            if (player.track) {
                queue.tracks.push(track);
                await ctx.reply({ content: `🎶 Added **${track.info.title}** to the queue.` });
            } else {
                queue.current = track;
                queue.textChannel = channel;
                await player.playTrack({ encoded: track.encoded });
                
                // Debug: Log available methods if setVolume/setGlobalVolume fails
                try {
                    if (player.setGlobalVolume) await player.setGlobalVolume(100);
                    else if (player.setVolume) await player.setVolume(100);
                    else console.warn('[Music] No volume method found on player. Available:', Object.keys(player).filter(k => typeof player[k] === 'function'));
                } catch (e) {
                    console.error('[Music] Volume set failed:', e.message);
                }

                await ctx.reply({ content: `🎶 Now playing: **${track.info.title}**` });
            }

        } catch (err) {
            console.error(`[Lavalink Play Error] ${err.message}`);
            await ctx.reply({ content: `❌ Error: ${err.message}` }).catch(() => {});
        }
    }
};
