const { Events } = require("discord.js");
const { inviteCache } = require("../state");

module.exports = {
    name: Events.InviteCreate,
    execute(invite, client) {
        if (!inviteCache.has(invite.guild.id)) inviteCache.set(invite.guild.id, new Map());
        inviteCache.get(invite.guild.id).set(invite.code, invite.uses);
    }
};
