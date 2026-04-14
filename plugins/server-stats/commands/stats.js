
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const statsService = require('../services/statsService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Manage server status counters.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('setup')
               .setDescription('Setup automatic status counters (Total, Online, Idle, etc).')
        )
        .addSubcommand(sub =>
            sub.setName('sync')
               .setDescription('Force an immediate refresh of all status counters.')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            await interaction.deferReply();
            
            const results = [];
            const types = ['TOTAL', 'HUMANS', 'BOTS', 'ONLINE', 'IDLE', 'DND'];
            
            for (const type of types) {
                const res = await statsService.setupStatChannel(interaction.guild, type);
                results.push({ type, success: res.success, channelId: res.channel?.id, error: res.error });
            }

            const embed = new EmbedBuilder()
                .setTitle('📊 Server Stats | Infrastructure Setup')
                .setColor('#00ff00')
                .setDescription('The following status counters have been initialized:')
                .addFields(results.map(r => ({
                    name: r.type,
                    value: r.success ? `✅ <#${r.channelId}>` : `❌ ${r.error}`,
                    inline: true
                })));

            await interaction.editReply({ embeds: [embed] });
            
            // Perfrom initial sync
            await statsService.updateGuildStats(interaction.guild);

        } else if (subcommand === 'sync') {
            await interaction.deferReply({ ephemeral: true });
            await statsService.updateGuildStats(interaction.guild);
            await interaction.editReply('✅ **Jack:** All status counters have been synchronized with the live network.');
        }
    }
};
