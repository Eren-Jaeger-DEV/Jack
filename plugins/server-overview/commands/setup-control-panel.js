const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const OverviewConfig = require('../models/OverviewConfig');
const { buildControlPanelEmbed, buildControlPanelButtons } = require('../services/controlPanelService');

module.exports = {
    name: 'setup-control-panel',
    category: 'admin',
    permissions: [PermissionFlagsBits.Administrator],
    cooldown: { user: 10000 },
    data: new SlashCommandBuilder()
        .setName('setup-control-panel')
        .setDescription('Initializes the admin control panel in the designated channel.'),

    async run(ctx) {
        const mappedChannel = ctx.client.serverMap?.getChannel("moderators", "bots_setup");
        const CONTROL_CHANNEL_ID = mappedChannel ? mappedChannel.id : "1479492977305981220";
        const channel = ctx.client.channels.cache.get(CONTROL_CHANNEL_ID);

        if (!channel) {
            return await ctx.reply("❌ Control panel channel not found. Please verify the ID.");
        }

        let config = await OverviewConfig.findOne({ guildId: ctx.guildId });
        if (!config) {
            config = await OverviewConfig.create({ guildId: ctx.guildId, sections: [] });
        }

        const embed = buildControlPanelEmbed(config);
        const row = buildControlPanelButtons();

        const message = await channel.send({ 
            embeds: [embed], 
            components: [row] 
        });

        config.controlMessageId = message.id;
        await config.save();

        await ctx.reply(`✅ Control panel initialized in <#${CONTROL_CHANNEL_ID}>`);
    }
};
