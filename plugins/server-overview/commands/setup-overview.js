const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const OverviewConfig = require('../models/OverviewConfig');
const { buildOverviewContainer, buildOverviewDropdown } = require('../services/overviewService');

module.exports = {
    name: 'setup-overview',
    category: 'admin',
    permissions: [PermissionFlagsBits.Administrator],
    cooldown: { user: 10000 },
    data: new SlashCommandBuilder()
        .setName('setup-overview')
        .setDescription('Initializes the server overview in the designated channel.'),

    async run(ctx) {
        const mappedChannel = ctx.client.serverMap?.getChannel("dashboard", "overview");
        const OVERVIEW_CHANNEL_ID = mappedChannel ? mappedChannel.id : "1477894589565374667";
        const channel = ctx.client.channels.cache.get(OVERVIEW_CHANNEL_ID);

        if (!channel) {
            return await ctx.reply("❌ Overview channel not found. Please verify the ID.");
        }

        let config = await OverviewConfig.findOne({ guildId: ctx.guildId });
        if (!config) {
            config = await OverviewConfig.create({ guildId: ctx.guildId, sections: [] });
        }

        const container = buildOverviewContainer(ctx.guild);
        const row = buildOverviewDropdown(config.sections);

        const isFirstTime = !config.overviewMessageId;
        let message;

        if (config.overviewMessageId) {
            try {
                const oldMessage = await channel.messages.fetch(config.overviewMessageId);
                if (oldMessage) {
                    message = await oldMessage.edit({ 
                        components: row ? [container, row] : [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
            } catch (err) {
                // If message not found, it will fallback to sending a new one
            }
        }

        if (!message) {
            message = await channel.send({ 
                components: row ? [container, row] : [container],
                flags: MessageFlags.IsComponentsV2
            });
            config.overviewMessageId = message.id;
            await config.save();
        }

        await ctx.reply({ 
            content: `✅ Overview ${isFirstTime ? 'initialized' : 'updated'} in <#${OVERVIEW_CHANNEL_ID}>`, 
            ephemeral: true 
        });
    }
};
