const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');
const { buildHomeEmbed, buildNavigationRow } = require('../bot/utils/controlCenterUtils');
const configManager = require('../bot/utils/configManager');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const CHANNEL_ID = '1479492977305981220';

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    await client.login(process.env.BOT_TOKEN);
    
    client.once('ready', async () => {
        const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
        if (!channel) process.exit(1);

        const config = await configManager.getGuildConfig(channel.guildId);
        const messageId = config.settings?.controlCenterMessageId;

        const embed = buildHomeEmbed(client, channel.guild, config);
        const row = buildNavigationRow();

        if (messageId) {
            const msg = await channel.messages.fetch(messageId).catch(() => null);
            if (msg) {
                await msg.edit({ embeds: [embed], components: [row] });
                console.log('✅ Control Center refreshed.');
                process.exit(0);
            }
        }

        // Fallback: send new if not found
        const sent = await channel.send({ embeds: [embed], components: [row] });
        await configManager.updateGuildConfig(channel.guildId, {
            'settings.controlCenterMessageId': sent.id
        });
        console.log('✅ Control Center re-posted.');
        process.exit(0);
    });
}

run();
