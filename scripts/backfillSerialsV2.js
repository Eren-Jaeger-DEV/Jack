/**
 * scripts/backfillSerialsV2.js
 * 
 * Enforces:
 * - JCM01-60 (strictly 60 slots)
 * - JDM0001+
 * - Role-based assignment
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Client, GatewayIntentBits } = require('discord.js');
const Player = require('../bot/database/models/Player');
const { hasClanRole, hasDiscordMemberRole } = require('../bot/utils/serialGenerator');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

async function backfill() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    const guildId = process.env.GUILD_ID || '1477852331495424093';
    const guild = await client.guilds.fetch(guildId);
    console.log(`Working on guild: ${guild.name}`);

    // Fetch all players
    const players = await Player.find({}).sort({ createdAt: 1 });
    console.log(`Found ${players.length} players to evaluate.`);

    // Clear existing serials to start fresh for the new logic
    await Player.updateMany({}, { $unset: { serialNumber: 1 } });
    console.log('Cleared existing serials for clean backfill.');

    let nextJDM = 1;
    let jcmSlots = Array.from({ length: 60 }, (_, i) => i + 1); // 1-60
    let assignedJCM = 0;
    let assignedJDM = 0;
    let removed = 0;

    for (const player of players) {
      if (!player.discordId) {
        // Unlinked profile - assign JDM by default or leave blank?
        // User said "alloted only to those who have roles", unlinked has no roles.
        continue;
      }

      const member = await guild.members.fetch(player.discordId).catch(() => null);
      if (!member) {
        console.log(`Member ${player.ign} (${player.discordId}) not found in guild.`);
        continue;
      }

      const isClan = hasClanRole(member);
      const isDiscord = hasDiscordMemberRole(member);

      let newSerial = null;

      if (isClan) {
        if (jcmSlots.length > 0) {
          const slot = jcmSlots.shift();
          newSerial = `JCM${String(slot).padStart(2, '0')}`;
          assignedJCM++;
        } else {
          console.warn(`⚠️ No JCM slots left for ${player.ign}! Assigning JDM instead.`);
          newSerial = `JDM${String(nextJDM++).padStart(4, '0')}`;
          assignedJDM++;
        }
      } else if (isDiscord) {
        newSerial = `JDM${String(nextJDM++).padStart(4, '0')}`;
        assignedJDM++;
      } else {
        removed++;
      }

      if (newSerial) {
        player.serialNumber = newSerial;
        player.isClanMember = isClan;
        await player.save();
      } else {
        await Player.updateOne({ _id: player._id }, { 
          $unset: { serialNumber: 1 },
          $set: { isClanMember: isClan }
        });
        removed++;
      }
    }

    console.log(`✅ Backfill Complete:`);
    console.log(`- JCM Assigned: ${assignedJCM}`);
    console.log(`- JDM Assigned: ${assignedJDM}`);
    console.log(`- Serial Removed (No roles): ${removed}`);
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exit(1);
  }
}

client.once('ready', backfill);
client.login(process.env.BOT_TOKEN);
