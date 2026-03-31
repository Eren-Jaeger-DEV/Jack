const { Events, EmbedBuilder } = require("discord.js");
const configManager = require("../../../bot/utils/configManager");
const { inviteCache, raidCheck } = require("../state");
const InviteJoin = require("../../../bot/database/models/InviteJoin");
const InviteStats = require("../../../bot/database/models/InviteStats");


module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        const { guild } = member;
        const config = await configManager.getGuildConfig(guild.id);
        const inviteLogChannelId = config?.settings?.inviteLogChannelId || config?.settings?.logChannelId;
        let logChannel = null;

        if (inviteLogChannelId) {
            logChannel = await guild.channels.fetch(inviteLogChannelId).catch(() => null);
        }

        if (!logChannel && client.serverMap) {
            // Fallback to name-based identification via ServerMapManager
            logChannel = client.serverMap.getChannelByName("invite-log") || client.serverMap.getChannelByName("invite_log") || client.serverMap.getChannelByName("jack_log");
        }

        // 1. Account Age Flags
        const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
        let flag = null;
        if (accountAgeDays < 1) flag = "⚠️ New Account (< 1 day)";
        else if (accountAgeDays < 7) flag = "🕒 Very Young Account (< 7 days)";

        // 2. Rejoin Protection (MongoDB Check)
        const existingJoin = await InviteJoin.findOne({ memberId: member.id, guildId: guild.id });
        const isRejoin = !!existingJoin;

        // 3. Detect Invite Used
        let inviter = null;
        let joinType = "Normal";

        try {
            const oldInvites = inviteCache.get(guild.id) || new Map();
            const newInvites = await guild.invites.fetch().catch(() => new Map());
            
            // Find used invite
            const usedInvite = newInvites.find(inv => {
                const prevUses = oldInvites.get(inv.code) || 0;
                return inv.uses > prevUses;
            });

            // Update cache immediately for next join
            const updatedInvites = new Map();
            newInvites.forEach(inv => updatedInvites.set(inv.code, inv.uses));
            inviteCache.set(guild.id, updatedInvites);

            if (usedInvite) {
                inviter = usedInvite.inviter;
                joinType = "Normal";
            } else {
                if (guild.vanityURLCode) {
                    joinType = "Vanity URL";
                } else {
                    joinType = "Unknown";
                }
            }
        } catch (e) {
            console.error("[InviteTracker] Error detecting invite usage:", e.message);
            joinType = "Unknown";
        }

        const inviterId = inviter ? inviter.id : (joinType === "Vanity URL" ? "vanity" : "unknown");

        // 4. Update Stats and Join Record
        if (!isRejoin) {
            // Create new join record
            await InviteJoin.create({
                memberId: member.id,
                guildId: guild.id,
                inviterId: inviterId,
                joinedAt: new Date()
            });

            // Update inviter stats if possible
            if (inviter) {
                await InviteStats.findOneAndUpdate(
                    { userId: inviter.id, guildId: guild.id },
                    { $inc: { invites: 1 } },
                    { upsert: true, new: true }
                );

                // 5. Raid Detection (5+ joins in 5 mins from same inviter)
                const now = Date.now();
                if (!raidCheck.has(inviter.id)) raidCheck.set(inviter.id, []);
                const timestamps = raidCheck.get(inviter.id);
                timestamps.push(now);
                
                const fiveMinsAgo = now - 5 * 60 * 1000;
                const recentJoins = timestamps.filter(t => t > fiveMinsAgo);
                raidCheck.set(inviter.id, recentJoins);

                if (recentJoins.length >= 5 && logChannel) {
                    logChannel.send({
                        content: `🚨 **Invite Raid Detected!**\nInviter: <@${inviter.id}> (${inviter.id}) has brought **${recentJoins.length}** users in the last 5 minutes.`
                    }).catch(() => {});
                }
            }
        } else {
            // Update existing join record timestamp
            existingJoin.joinedAt = new Date();
            await existingJoin.save();
        }

        // 6. Log Invite Information
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setAuthor({ name: "🎫 Invite Information", iconURL: member.user.displayAvatarURL() })
                .setColor(flag ? 0xFFA500 : 0x2f3136) // Use neutral/aesthetic color unless flagged
                .addFields(
                    { name: "👤 User joining", value: `${member.user.tag} (\`${member.id}\`)`, inline: false },
                    { name: "🔗 Invite Link", value: usedInvite ? `\`${usedInvite.code}\`` : `\`${joinType}\``, inline: true },
                    { name: "👑 Inviter", value: inviter ? `<@${inviter.id}> (\`${inviter.id}\`)` : `\`${joinType}\``, inline: true },
                    { name: "📅 Join Status", value: isRejoin ? "✅ **Rejoined**" : "✨ **Newly Joined**", inline: true },
                    { name: "🎂 Account Age", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: "📊 Total Members", value: `\`${guild.memberCount}\``, inline: true }
                )
                .setTimestamp();

            if (flag) embed.addFields({ name: "🚩 Verification Flag", value: flag, inline: false });
            
            logChannel.send({ embeds: [embed] }).catch(() => {});
        }
    }
};
