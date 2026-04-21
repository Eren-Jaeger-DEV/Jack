/**
 * scripts/fixSerials.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Client, GatewayIntentBits } = require('discord.js');
const Player = require('../bot/database/models/Player');
const { hasClanRole, hasDiscordMemberRole } = require('../bot/utils/serialGenerator');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

async function fix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const guildId = process.env.GUILD_ID || '1477852331495424093';
    const guild = await client.guilds.fetch(guildId);

    // 1. Fetch ALL clan members (by role)
    const players = await Player.find({ discordId: { $ne: null } });
    console.log(`Checking ${players.length} registered players...`);

    // Get current JCMs to see what slots are taken
    const existingJCMs = await Player.find({ serialNumber: /^JCM\d{2}$/ }).select('serialNumber').lean();
    const usedSlots = existingJCMs.map(p => parseInt(p.serialNumber.replace('JCM', ''), 10));
    console.log(`Currently used JCM slots: ${usedSlots.sort((a,b)=>a-b).join(', ')}`);

    let nextJDM = 1;
    // Get highest JDM
    const lastJDM = await Player.findOne({ serialNumber: /^JDM\d{4}$/ }).sort({ serialNumber: -1 }).lean();
    if (lastJDM) nextJDM = parseInt(lastJDM.serialNumber.replace('JDM', ''), 10) + 1;

    let availableSlots = [];
    for(let i=1; i<=60; i++) if(!usedSlots.includes(i)) availableSlots.push(i);

    for (const player of players) {
      const member = await guild.members.fetch(player.discordId).catch(() => null);
      if (!member) continue;

      const isClan = hasClanRole(member);
      const isDiscord = hasDiscordMemberRole(member);

      if (isClan && !player.serialNumber?.startsWith('JCM')) {
        if (availableSlots.length > 0) {
          const slot = availableSlots.shift();
          const serial = `JCM${String(slot).padStart(2, '0')}`;
          await Player.updateOne({ _id: player._id }, { $set: { serialNumber: serial, isClanMember: true } });
          console.log(`✅ Assigned ${serial} to ${player.ign}`);
        }
      } else if (isDiscord && !player.serialNumber?.startsWith('JDM') && !isClan) {
        const serial = `JDM${String(nextJDM++).padStart(4, '0')}`;
        await Player.updateOne({ _id: player._id }, { $set: { serialNumber: serial, isClanMember: false } });
        console.log(`✅ Assigned ${serial} to ${player.ign}`);
      } else if (!isClan && !isDiscord && player.serialNumber) {
        await Player.updateOne({ _id: player._id }, { $unset: { serialNumber: 1 }, $set: { isClanMember: false } });
        console.log(`❌ Removed serial from ${player.ign}`);
      }
    }

    console.log('Fix complete.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

client.once('ready', fix);
client.login(process.env.BOT_TOKEN);
