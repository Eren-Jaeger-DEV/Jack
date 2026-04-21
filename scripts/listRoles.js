/**
 * scripts/listRoles.js
 */

require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.on('ready', async () => {
  const guildId = process.env.GUILD_ID || '1477852331495424093'; // Fallback to main guild
  const guild = client.guilds.cache.get(guildId);
  
  if (!guild) {
    console.log('Guild not found.');
    process.exit(1);
  }

  console.log(`Roles in ${guild.name}:`);
  const roles = await guild.roles.fetch();
  roles.forEach(role => {
    console.log(`${role.name}: ${role.id}`);
  });

  process.exit(0);
});

client.login(process.env.BOT_TOKEN);
