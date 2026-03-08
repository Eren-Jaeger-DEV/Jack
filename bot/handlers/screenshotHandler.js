const Player = require("../database/models/Player");

module.exports = async function screenshotHandler(message) {

  const player = await Player.findOne({
    discordId: message.author.id
  });

  if (!player) return;

  if (player.screenshot) return;

  if (message.attachments.size === 0) return;

  const attachment = message.attachments.first();

  if (!attachment.contentType?.startsWith("image")) return;

  await Player.updateOne(
    { discordId: message.author.id },
    { screenshot: attachment.url }
  );

  message.reply("✅ Screenshot saved to your player profile.");

};