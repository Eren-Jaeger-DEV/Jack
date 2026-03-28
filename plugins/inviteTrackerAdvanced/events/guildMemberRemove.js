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

        const joinRecord = await InviteJoin.findOne({ memberId: member.id, guildId: guild.id });
        const logChannel = logChannelId ? guild.channels.cache.get(logChannelId) : null;
        
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

            // Log Leave
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
    }
};
