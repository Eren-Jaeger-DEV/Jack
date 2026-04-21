const Player = require("../database/models/Player");
const logger = require("../utils/logger");

module.exports = {
  name: "guildMemberRemove",
  async execute(member) {
    try {
      // Find the player in the database
      const player = await Player.findOne({ discordId: member.id });
      
      if (player) {
        // If they were a clan member, remove their JCM status
        if (player.isClanMember) {
          player.isClanMember = false;
          const oldSerial = player.serialNumber;
          player.serialNumber = null;
          await player.save();
          
          logger.info('Membership', `Member ${member.user.tag} left the server. Removed Serial ${oldSerial}.`);
        } else {
          // Just remove their serial number if they were a guest (JDM)
          player.serialNumber = null;
          await player.save();
          logger.info('Membership', `Member ${member.user.tag} left the server. Removed guest serial.`);
        }
      }
    } catch (error) {
      logger.error('Membership', `Error handling member removal for ${member.user.tag}:`, error);
    }
  },
};
