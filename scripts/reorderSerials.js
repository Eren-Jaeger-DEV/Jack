/**
 * scripts/reorderSerials.js
 * 
 * Reassigns JCM IDs based on Hierarchy:
 * 1. Clan Leader
 * 2. Clan Co-leader
 * 3. Clan Elite Member
 * 4. Clan Member
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Client, GatewayIntentBits } = require('discord.js');
const Player = require('../bot/database/models/Player');

const ROLE_PRIORITY = [
  '1477866925492146327', // Clan Leader
  '1477860583976992900', // Clan Co-leader
  '1477860065577795676', // Clan Elite Member
  '1477856665817714699'  // Clan Member
];

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

async function reorder() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const guildId = process.env.GUILD_ID || '1477852331495424093';
    const guild = await client.guilds.fetch(guildId);

    console.log('Fetching all registered players...');
    const players = await Player.find({ discordId: { $ne: null } });
    
    const memberData = [];

    for (const player of players) {
      const member = await guild.members.fetch(player.discordId).catch(() => null);
      if (!member) continue;

      // Find highest role priority
      let priority = 99;
      for (let i = 0; i < ROLE_PRIORITY.length; i++) {
        if (member.roles.cache.has(ROLE_PRIORITY[i])) {
          priority = i;
          break;
        }
      }

      if (priority < 99) {
        memberData.push({ player, priority, joinedAt: member.joinedAt });
      }
    }

    // Sort by Priority (0 is highest), then by joinedAt (oldest first)
    memberData.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.joinedAt - b.joinedAt;
    });

    console.log(`Reordering ${memberData.length} clan members...`);

    // Clear JCM serials first to avoid collisions
    await Player.updateMany({ serialNumber: /^JCM/ }, { $unset: { serialNumber: 1 } });

    for (let i = 0; i < memberData.length; i++) {
      const slot = i + 1;
      const serial = `JCM${String(slot).padStart(2, '0')}`;
      await Player.updateOne({ _id: memberData[i].player._id }, { $set: { serialNumber: serial, isClanMember: true } });
      console.log(`${serial}: ${memberData[i].player.ign} (Priority: ${memberData[i].priority})`);
    }

    console.log('✅ Reordering complete.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

client.once('ready', reorder);
client.login(process.env.BOT_TOKEN);
