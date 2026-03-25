const { EmbedBuilder, Events } = require("discord.js");
const fs = require("fs");
const path = require("path");

// Paths for persistence
const INVITES_FILE = path.join(__dirname, "../data/invites.json");
const CACHE_FILE = path.join(__dirname, "../data/inviteCache.json");
const LOG_CHANNEL_ID = "1486149854764990605";

// In-memory data structures
let data = {
    users: {}, // inviterId: { invites: 0, fake: 0, leaves: 0 }
    joins: {}  // memberId: { inviter: id, joinedAt: timestamp }
};

let inviteCache = new Map(); // guildId -> Map(inviteCode -> uses)
let raidCheck = new Map();   // inviterId -> [timestamps]

/**
 * Utility: Ensure data directory exists and files are initialized
 */
function initializeStorage() {
    const dataDir = path.join(__dirname, "../data");
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(INVITES_FILE)) {
        try {
            data = JSON.parse(fs.readFileSync(INVITES_FILE, "utf-8"));
        } catch (e) {
            console.error("[InviteTracker] Error loading invites.json:", e.message);
        }
    }

    if (fs.existsSync(CACHE_FILE)) {
        try {
            const cached = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
            for (const [guildId, invites] of Object.entries(cached)) {
                inviteCache.set(guildId, new Map(Object.entries(invites)));
            }
        } catch (e) {
            console.error("[InviteTracker] Error loading inviteCache.json:", e.message);
        }
    }
}

/**
 * Utility: Save data to disk
 */
function saveData() {
    fs.writeFileSync(INVITES_FILE, JSON.stringify(data, null, 2));
}

/**
 * Utility: Save invite cache to disk
 */
function saveCache() {
    const obj = {};
    for (const [guildId, map] of inviteCache) {
        obj[guildId] = Object.fromEntries(map);
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2));
}

/**
 * Fetch and cache all invites for a guild
 */
async function cacheGuildInvites(guild) {
    try {
        if (!guild.members.me.permissions.has("ManageGuild")) return;
        const invites = await guild.invites.fetch();
        const guildInvites = new Map();
        invites.forEach(inv => guildInvites.set(inv.code, inv.uses));
        inviteCache.set(guild.id, guildInvites);
    } catch (e) {
        console.error(`[InviteTracker] Failed to fetch invites for guild ${guild.id}:`, e.message);
    }
}

module.exports = (client) => {
    initializeStorage();

    // Cache saving interval (30s as requested)
    setInterval(saveCache, 30000);

    client.on(Events.ClientReady, async () => {
        console.log("[InviteTracker] Initializing invite cache...");
        for (const guild of client.guilds.cache.values()) {
            await cacheGuildInvites(guild);
        }
        console.log("[InviteTracker] Cache initialized.");
    });

    client.on(Events.InviteCreate, (invite) => {
        if (!inviteCache.has(invite.guild.id)) inviteCache.set(invite.guild.id, new Map());
        inviteCache.get(invite.guild.id).set(invite.code, invite.uses);
    });

    client.on(Events.InviteDelete, (invite) => {
        if (inviteCache.has(invite.guild.id)) {
            inviteCache.get(invite.guild.id).delete(invite.code);
        }
    });

    client.on(Events.GuildMemberAdd, async (member) => {
        const { guild } = member;
        const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);

        // 1. Account Age Flags
        const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
        let flag = null;
        if (accountAgeDays < 1) flag = "⚠️ New Account (< 1 day)";
        else if (accountAgeDays < 7) flag = "🕒 Very Young Account (< 7 days)";

        // 2. Rejoin Protection
        const isRejoin = data.joins[member.id] !== undefined;

        // 3. Detect Invite Used
        let inviter = null;
        let joinType = "Normal";

        try {
            const oldInvites = inviteCache.get(guild.id) || new Map();
            const newInvites = await guild.invites.fetch().catch(() => new Map());
            
            // Update cache immediately for next join
            const updatedInvites = new Map();
            newInvites.forEach(inv => updatedInvites.set(inv.code, inv.uses));
            inviteCache.set(guild.id, updatedInvites);

            // Find used invite
            const usedInvite = newInvites.find(inv => {
                const prevUses = oldInvites.get(inv.code) || 0;
                return inv.uses > prevUses;
            });

            if (usedInvite) {
                inviter = usedInvite.inviter;
                joinType = "Normal";
            } else {
                // Check Vanity
                try {
                    const vanityData = await guild.fetchVanityData();
                    // This is tricky as we don't have a perfect delta for vanity in memory unless we cache it too
                    // But if no invite matched and it's a vanity guild, we assume vanity if it's the only other option
                    if (guild.vanityURLCode) {
                        joinType = "Vanity URL";
                    } else {
                        joinType = "Unknown";
                    }
                } catch (e) {
                    joinType = "Unknown";
                }
            }
        } catch (e) {
            console.error("[InviteTracker] Error detecting invite usage:", e.message);
            joinType = "Unknown";
        }

        // 4. Update Stats (only if not rejoin)
        if (!isRejoin && inviter) {
            if (!data.users[inviter.id]) {
                data.users[inviter.id] = { invites: 0, fake: 0, leaves: 0 };
            }
            data.users[inviter.id].invites++;
            
            // Re-store join record
            data.joins[member.id] = {
                inviter: inviter.id,
                joinedAt: Date.now()
            };
            saveData();

            // 5. Raid Detection (5+ joins in 5 mins from same inviter)
            const now = Date.now();
            if (!raidCheck.has(inviter.id)) raidCheck.set(inviter.id, []);
            const timestamps = raidCheck.get(inviter.id);
            timestamps.push(now);
            
            // Filter timestamps within last 5 minutes
            const fiveMinsAgo = now - 5 * 60 * 1000;
            const recentJoins = timestamps.filter(t => t > fiveMinsAgo);
            raidCheck.set(inviter.id, recentJoins);

            if (recentJoins.length >= 5 && logChannel) {
                logChannel.send({
                    content: `🚨 **Invite Raid Detected!**\nInviter: <@${inviter.id}> (${inviter.id}) has brought **${recentJoins.length}** users in the last 5 minutes.`
                }).catch(() => {});
            }
        } else if (!isRejoin) {
            // Unknown or Vanity join
            data.joins[member.id] = {
                inviter: joinType === "Vanity URL" ? "vanity" : "unknown",
                joinedAt: Date.now()
            };
            saveData();
        }

        // 6. Log Join
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle("📥 Member Joined")
                .setColor(flag ? 0xFFA500 : 0x00FF00)
                .setThumbnail(member.user.displayAvatarURL())
                .addFields(
                    { name: "User", value: `${member.user.tag} (\`${member.id}\`)`, inline: false },
                    { name: "Inviter", value: inviter ? `<@${inviter.id}> (\`${inviter.id}\`)` : `\`${joinType}\``, inline: true },
                    { name: "Account Age", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: "Rejoin", value: isRejoin ? "✅ Yes" : "❌ No", inline: true }
                )
                .setTimestamp();

            if (flag) embed.addFields({ name: "Flags", value: flag, inline: false });
            
            logChannel.send({ embeds: [embed] }).catch(() => {});
        }
    });

    client.on(Events.GuildMemberRemove, async (member) => {
        const joinRecord = data.joins[member.id];
        const logChannel = member.guild.channels.cache.get(LOG_CHANNEL_ID);
        
        let classification = "Normal Leave";
        let inviterName = "Unknown/Vanity";

        if (joinRecord) {
            const timeDiff = Date.now() - joinRecord.joinedAt;
            const isFake = timeDiff < 60000; // 60 seconds

            if (isFake && joinRecord.inviter !== "unknown" && joinRecord.inviter !== "vanity") {
                classification = "❌ Fake Join (left within 60s)";
                const inviterId = joinRecord.inviter;
                if (data.users[inviterId]) {
                    data.users[inviterId].invites = Math.max(0, data.users[inviterId].invites - 1);
                    data.users[inviterId].fake++;
                    saveData();
                }
            } else if (!isFake && joinRecord.inviter !== "unknown" && joinRecord.inviter !== "vanity") {
                const inviterId = joinRecord.inviter;
                if (data.users[inviterId]) {
                    data.users[inviterId].leaves++;
                    saveData();
                }
            }

            if (joinRecord.inviter !== "unknown" && joinRecord.inviter !== "vanity") {
                inviterName = `<@${joinRecord.inviter}>`;
            } else {
                inviterName = `\`${joinRecord.inviter}\``;
            }

            // 6. Log Leave
            if (logChannel) {
                const stayTime = Math.floor(timeDiff / 1000);
                const embed = new EmbedBuilder()
                    .setTitle("📤 Member Left")
                    .setColor(classification.includes("Fake") ? 0xFF0000 : 0xCCCCCC)
                    .setThumbnail(member.user.displayAvatarURL())
                    .addFields(
                        { name: "User", value: `${member.user.tag}`, inline: true },
                        { name: "Inviter", value: inviterName, inline: true },
                        { name: "Time Spent", value: `${stayTime} seconds`, inline: true },
                        { name: "Classification", value: classification, inline: false }
                    )
                    .setTimestamp();

                logChannel.send({ embeds: [embed] }).catch(() => {});
            }
        }
    });

    console.log("[InviteTracker] Plugin loaded successfully.");
};
