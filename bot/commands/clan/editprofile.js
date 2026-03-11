const Player = require("../../database/models/Player");

const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

module.exports = {

  name: "editprofile",
  category: "clan",
  description: "Edit your BGMI player profile",

  data: new SlashCommandBuilder()
    .setName("editprofile")
    .setDescription("Edit your BGMI player profile"),

  async run(ctx) {

    /* PREFIX COMMAND */

    if (!ctx.isInteraction) {
      return ctx.reply("Use `/editprofile` to edit your profile.");
    }

    const player = await Player.findOne({
      discordId: ctx.user.id
    });

    if (!player) {
      return ctx.reply("❌ You are not registered yet. Use `/register` first.");
    }

    const modal = new ModalBuilder()
      .setCustomId("edit_profile_modal")
      .setTitle("Edit BGMI Profile");

    const ign = new TextInputBuilder()
      .setCustomId("ign")
      .setLabel("In-Game Name")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue(player.ign || "");

    const uid = new TextInputBuilder()
      .setCustomId("uid")
      .setLabel("BGMI UID")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue(player.uid || "");

    const level = new TextInputBuilder()
      .setCustomId("level")
      .setLabel("Account Level")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue(player.accountLevel?.toString() || "");

    const modes = new TextInputBuilder()
      .setCustomId("modes")
      .setLabel("Preferred Modes (TDM, Classic, WOW)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue(player.preferredModes?.join(", ") || "");

    modal.addComponents(
      new ActionRowBuilder().addComponents(ign),
      new ActionRowBuilder().addComponents(uid),
      new ActionRowBuilder().addComponents(level),
      new ActionRowBuilder().addComponents(modes)
    );

    await ctx.source.showModal(modal);

  }

};