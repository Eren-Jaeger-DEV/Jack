const Overview = require("../../systems/panels/serverOverview");

module.exports = {
  name: "serveroverview",
  description: "Create the server overview panel",

  async run(ctx) {

    const channel = ctx.channel;

    const messageId = await Overview.createOverview(channel);

    await ctx.reply({
      content: `Server overview panel created. Message ID: ${messageId}`
    });

  }
};