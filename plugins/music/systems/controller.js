const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    async sendControlPanel(queue, track) {
        if (!queue || !track) return;

        const embed = new EmbedBuilder()
            .setTitle('🎶 Now Playing')
            .setDescription(`**[${track.title}](${track.uri})**\n\n**Duration:** ${new Date(track.length).toISOString().substr(11, 8)}`)
            .setThumbnail(track.artworkUrl || null)
            .setColor('#5865F2')
            .setFooter({ text: `Queue: ${queue.tracks.length} songs` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('music_pause_resume')
                .setLabel('⏯️ Pause/Resume')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('music_skip')
                .setLabel('⏭️ Skip')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_stop')
                .setLabel('⏹️ Stop')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('music_loop')
                .setLabel('🔁 Loop')
                .setStyle(ButtonStyle.Success)
        );

        if (queue.textChannel) {
            await queue.textChannel.send({ embeds: [embed], components: [row] });
        }
    },

    async handleInteraction(interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('music_')) return;

        const { client, guildId } = interaction;
        const player = client.music.shoukaku.players.get(guildId);
        const queue = client.music.getQueue(guildId);

        if (!player) {
            return interaction.reply({ content: '❌ No active music player found.', ephemeral: true });
        }

        try {
            switch (interaction.customId) {
                case 'music_pause_resume':
                    const paused = player.paused;
                    await player.setPaused(!paused);
                    await interaction.reply({ content: !paused ? '⏸️ Paused music.' : '▶️ Resumed music.', ephemeral: true });
                    break;

                case 'music_skip':
                    await player.stopTrack();
                    await interaction.reply({ content: '⏭️ Skipped current song.', ephemeral: true });
                    break;

                case 'music_stop':
                    queue.tracks = [];
                    await player.destroy();
                    client.music.queues.delete(guildId);
                    await interaction.reply({ content: '⏹️ Stopped music and cleared queue.', ephemeral: true });
                    break;

                case 'music_loop':
                    queue.loop = !queue.loop;
                    await interaction.reply({ content: queue.loop ? '🔁 Loop enabled.' : '➡️ Loop disabled.', ephemeral: true });
                    break;
            }
        } catch (err) {
            console.error(`[Interaction Error] ${err.message}`);
            await interaction.reply({ content: '❌ Error processing request.', ephemeral: true }).catch(() => {});
        }
    }
};
