const configManager = require("../utils/configManager");
const Player = require("../database/models/Player");

module.exports = {
  name: "guildMemberUpdate",

  async execute(oldMember, newMember, client) {
    if (newMember.user.bot) return;

    try {
      const { hasClanRole, hasDiscordMemberRole, getNextSerialNumber } = require("../utils/serialGenerator");

      const hadClan = hasClanRole(oldMember);
      const hasClan = hasClanRole(newMember);
      const hadDiscord = hasDiscordMemberRole(oldMember);
      const hasDiscord = hasDiscordMemberRole(newMember);

      // ── Status Changed ──
      if (hadClan !== hasClan || hadDiscord !== hasDiscord) {
        const player = await Player.findOne({ discordId: newMember.id });
        if (!player) return; // Only track registered players

        let newSerial = player.serialNumber;
        let isClanMember = player.isClanMember;

        if (!hadClan && hasClan) {
          // Joined Clan: Upgrade to JCM
          newSerial = await getNextSerialNumber(true);
          isClanMember = true;
          console.log(`[SerialSwap] Upgrading ${newMember.user.tag} to JCM: ${newSerial}`);
        } else if (hadClan && !hasClan) {
          // Left Clan: Downgrade to JDM or remove
          if (hasDiscord) {
            newSerial = await getNextSerialNumber(false);
          } else {
            newSerial = null; // No role, no serial
          }
          isClanMember = false;
          console.log(`[SerialSwap] Downgrading ${newMember.user.tag} to JDM: ${newSerial}`);
        } else if (!hadDiscord && hasDiscord && !hasClan) {
          // Got Discord Member role (and no clan role): Assign JDM
          if (!player.serialNumber) {
            newSerial = await getNextSerialNumber(false);
            console.log(`[SerialSwap] Assigning JDM to ${newMember.user.tag}: ${newSerial}`);
          }
        } else if (hadDiscord && !hasDiscord && !hasClan) {
          // Lost Discord Member role (and no clan role): Remove serial
          newSerial = null;
          console.log(`[SerialSwap] Removing serial from ${newMember.user.tag} (No roles)`);
        }

        await Player.findOneAndUpdate(
          { discordId: newMember.id },
          { 
            serialNumber: newSerial,
            isClanMember: isClanMember,
            username: newMember.user.username,
            avatar: newMember.user.avatar
          }
        );
      }
    } catch (err) {
      console.error("[Serial Swap Error]", err);
    }
  }
};
