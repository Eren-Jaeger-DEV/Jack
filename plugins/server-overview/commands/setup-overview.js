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

        const embed = buildOverviewEmbed();
        const row = buildOverviewDropdown(config.sections);

        const message = await channel.send({ 
            embeds: [embed], 
            components: row ? [row] : [] 
        });

        config.overviewMessageId = message.id;
        await config.save();

        await ctx.reply(`✅ Overview initialized in <#${OVERVIEW_CHANNEL_ID}>`);
    }
};
