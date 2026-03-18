const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

module.exports = {

  name: "register",
  category: "clan",
  description: "Register your BGMI player profile",
  aliases: ["reg","joinroster"],
  usage: '/register  |  j register',
  details: 'Registers your BGMI player profile (IGN, UID, level, preferred modes).',

  data: new SlashCommandBuilder()
    .setName("register")
    .setDescription("Register your BGMI player profile"),

  async run(ctx) {

    /* PREFIX COMMAND */

    if (!ctx.isInteraction) {
      return ctx.reply("Use `/register` to open the registration form.");
    }

    /* SLASH COMMAND → OPEN MODAL */

    const modal = new ModalBuilder()
      .setCustomId("player_register_modal")
      .setTitle("BGMI Player Registration");

    const ign = new TextInputBuilder()
      .setCustomId("ign")
      .setLabel("In-Game Name")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const uid = new TextInputBuilder()
      .setCustomId("uid")
      .setLabel("BGMI UID")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const level = new TextInputBuilder()
      .setCustomId("level")
      .setLabel("Account Level")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const modes = new TextInputBuilder()
      .setCustomId("modes")
      .setLabel("Preferred Modes (Example: TDM, Classic, WOW)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(ign),
      new ActionRowBuilder().addComponents(uid),
      new ActionRowBuilder().addComponents(level),
      new ActionRowBuilder().addComponents(modes)
    );

    await ctx.source.showModal(modal);

  }

};