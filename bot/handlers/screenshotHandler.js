const Player = require("../database/models/Player");

module.exports = async function screenshotHandler(message) {
  // Skip if this is in the new registration panel channel
  if (message.channel.id === '1495460903628308752') return;

  let player = await Player.findOne({
    discordId: message.author.id
  });

  // If the player doesn't exist, OR already has a screenshot, check if they are an admin
  // who just created an unlinked profile manually that hasn't received a screenshot yet.
  if (!player || player.screenshot) {
    const unlinkedProfile = await Player.findOne({
      createdBy: message.author.id,
      isManual: true,
      screenshot: { $exists: false }
    }).sort({ createdAt: -1 });

    if (unlinkedProfile) {
      player = unlinkedProfile;
    }
  }

  if (!player) return;
  if (player.screenshot) return;
  if (message.attachments.size === 0) return;

  const attachment = message.attachments.first();
  if (!attachment.contentType?.startsWith("image")) return;

  await Player.updateOne(
    { _id: player._id },
    { screenshot: attachment.url }
  );

  if (player.isManual) {
    message.reply(`✅ Screenshot saved to unlinked profile (**${player.ign}**).`).catch(() => {});
  } else {
    message.reply("✅ Screenshot saved to your player profile.").catch(() => {});
  }

};