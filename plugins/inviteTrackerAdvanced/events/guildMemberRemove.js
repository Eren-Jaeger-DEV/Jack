const { Events, EmbedBuilder } = require("discord.js");
const configManager = require("../../../bot/utils/configManager");
const { FAKE_THRESHOLD_MS } = require("../state");
const InviteJoin = require("../../../bot/database/models/InviteJoin");
const InviteStats = require("../../../bot/database/models/InviteStats");


module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member, client) {
        const { guild } = member;
        const config = await configManager.getGuildConfig(guild.id);
        const logChannelId = config?.settings?.inviteLogChannelId || config?.settings?.logChannelId;
        let logChannel = null;

        if (logChannelId) {
            logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
        }

        if (!logChannel && client.serverMap) {
            logChannel = client.serverMap.getChannelByName("invite-log") || client.serverMap.getChannelByName("invite_log") || client.serverMap.getChannelByName("jack_log");
        }

        const joinRecord = await InviteJoin.findOne({ memberId: member.id, guildId: guild.id });
        
        let classification = "Normal Leave";
        let inviterName = "Unknown/Vanity";

        if (joinRecord) {
            const timeDiff = Date.now() - joinRecord.joinedAt.getTime();
            const isFake = timeDiff < FAKE_THRESHOLD_MS; 

            if (joinRecord.inviterId !== "unknown" && joinRecord.inviterId !== "vanity") {
                const inviterId = joinRecord.inviterId;
                inviterName = `<@${inviterId}>`;

                if (isFake) {
                    classification = "❌ Fake Join (left within 10m)";
                    await InviteStats.findOneAndUpdate(
                        { userId: inviterId, guildId: guild.id },
                        { $inc: { invites: -1, fake: 1 } },
                        { upsert: true }
                    );
                } else {
                    await InviteStats.findOneAndUpdate(
                        { userId: inviterId, guildId: guild.id },
                        { $inc: { leaves: 1 } },
                        { upsert: true }
                    );
                }
            } else {
                inviterName = `\`${joinRecord.inviterId}\``;
            }
        }
    }
};
