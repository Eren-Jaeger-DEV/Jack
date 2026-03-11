const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Overview = require("../../systems/panels/serverOverview");

module.exports = {
  name: "serveroverview",
  category: "admin",
  description: "Create the server overview panel",

  data: new SlashCommandBuilder()
    .setName("serveroverview")
    .setDescription("Create the server overview panel")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {

    const channel = ctx.channel;

    const messageId = await Overview.createOverview(channel);

    await ctx.reply({
      content: `Server overview panel created. Message ID: ${messageId}`
    });

  }
};