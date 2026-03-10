async function refreshPanel(channel, messageId, data) {

  try {

    const msg = await channel.messages.fetch(messageId);

    await msg.edit({
      embeds: data.embeds || [],
      components: data.components || []
    });

  } catch (error) {

    console.error("Panel refresh failed:", error);

  }

}

async function createPanel(channel, data) {

  const msg = await channel.send({
    embeds: data.embeds || [],
    components: data.components || []
  });

  return msg.id;

}

module.exports = {
  refreshPanel,
  createPanel
};