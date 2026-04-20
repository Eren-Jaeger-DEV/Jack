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
    console.log('🚀 Initializing Control Center Deployment...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB.');

    await client.login(process.env.BOT_TOKEN);
    
    client.once('ready', async () => {
        console.log(`✅ Logged in as ${client.user.tag}`);
        
        const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
        if (!channel) {
            console.error('❌ Channel not found!');
            process.exit(1);
        }

        const config = await configManager.getGuildConfig(channel.guildId);
        
        const embed = buildHomeEmbed(client, channel.guild, config);
        const row = buildNavigationRow();

        const message = await channel.send({
            embeds: [embed],
            components: [row]
        });

        console.log(`✅ Control Center posted in #${channel.name} (${message.id})`);
        
        // Store in DB for persistence if needed (optional for now)
        await configManager.updateGuildConfig(channel.guildId, {
            'settings.controlCenterChannelId': channel.id,
            'settings.controlCenterMessageId': message.id
        });

        process.exit(0);
    });
}

run().catch(err => {
    console.error('❌ Deployment failed:', err);
    process.exit(1);
});
