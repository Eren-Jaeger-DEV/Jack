/**
 * clear-commands.js
 *
 * Clears ALL slash commands (Global and Guild-specific) 
 * to resolve duplication issues.
 *
 * RUN: node scripts/clear-commands.js
 */

require('dotenv').config();
const { REST, Routes } = require('discord.js');

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
    try {
        const clientId = process.env.CLIENT_ID;
        const guildId = process.env.GUILD_ID;

        if (!clientId) {
            console.error("❌ CLIENT_ID is missing in .env");
            return;
        }

        console.log("🧹 Starting slash command cleanup...");

        // 1. Clear Global Commands
        console.log("🌐 Clearing GLOBAL commands...");
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        console.log("✅ Global commands cleared.");

        // 2. Clear Guild Commands (if GUILD_ID is provided)
        if (guildId) {
            console.log(`🏰 Clearing GUILD commands for: ${guildId}...`);
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
            console.log("✅ Guild commands cleared.");
        } else {
            console.log("ℹ️ No GUILD_ID found, skipping guild command cleanup.");
        }

        console.log("\n✨ Cleanup finished. You can now run `node deploy-commands.js` to re-register commands.");
    } catch (error) {
        console.error("❌ Cleanup failed:", error);
    }
})();
