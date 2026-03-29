const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const OverviewConfig = require('../models/OverviewConfig');
const { buildOverviewEmbed, buildOverviewDropdown } = require('../services/overviewService');

module.exports = {
    name: 'setup-overview',
    category: 'admin',
    permissions: [PermissionFlagsBits.Administrator],
    cooldown: { user: 10000 },
    data: new SlashCommandBuilder()
        .setName('setup-overview')
        .setDescription('Initializes the server overview in the designated channel.'),

    async run(ctx) {
        const OVERVIEW_CHANNEL_ID = "1477894589565374667";
        const channel = ctx.client.channels.cache.get(OVERVIEW_CHANNEL_ID);

        if (!channel) {
            return await ctx.reply("❌ Overview channel not found. Please verify the ID.");
        }

        let config = await OverviewConfig.findOne({ guildId: ctx.guildId });
        if (!config) {
            config = await OverviewConfig.create({ guildId: ctx.guildId, sections: [] });
        }

        const embed = buildOverviewEmbed(ctx.guild);
        const row = buildOverviewDropdown(config.sections);

        const isFirstTime = !config.overviewMessageId;
        let message;

        if (config.overviewMessageId) {
            try {
                const oldMessage = await channel.messages.fetch(config.overviewMessageId);
                if (oldMessage) {
                    message = await oldMessage.edit({ 
                        embeds: [embed], 
                        components: row ? [row] : [] 
                    });
                }
            } catch (err) {
                // If message not found, it will fallback to sending a new one
            }
        }

        if (!message) {
            message = await channel.send({ 
                embeds: [embed], 
                components: row ? [row] : [] 
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
