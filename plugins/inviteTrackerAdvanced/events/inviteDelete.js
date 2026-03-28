const { Events } = require("discord.js");
const { inviteCache } = require("../state");

module.exports = {
    name: Events.InviteDelete,
    execute(invite, client) {
        if (inviteCache.has(invite.guild.id)) {
            inviteCache.get(invite.guild.id).delete(invite.code);
        }
    }
};
