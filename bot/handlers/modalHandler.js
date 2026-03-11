const Player = require("../database/models/Player");

module.exports = async function modalHandler(interaction) {

  if (interaction.customId === "player_register_modal") {

    const ign = interaction.fields.getTextInputValue("ign");
    const uid = interaction.fields.getTextInputValue("uid");
    const level = interaction.fields.getTextInputValue("level");
    const modes = interaction.fields.getTextInputValue("modes");

    const preferredModes = modes.split(",").map(m => m.trim());

    const existing = await Player.findOne({
      discordId: interaction.user.id
    });

    if (existing) {

      return interaction.reply({
        content: "You already registered. Use /editprofile.",
        ephemeral: true
      });

    }

    const member = await interaction.guild.members.fetch(interaction.user.id);

    await Player.create({

      discordId: interaction.user.id,
      discordName: interaction.user.username,

      ign,
      uid,

      accountLevel: level,

      preferredModes,

      clanJoinDate: member.joinedAt

    });

    return interaction.reply({
      content: "✅ Profile saved.\n\nUpload your **BGMI Basic Info** now.",
      ephemeral: true
    });

  }

  if (interaction.customId === "edit_profile_modal") {

    const ign = interaction.fields.getTextInputValue("ign");
    const uid = interaction.fields.getTextInputValue("uid");
    const level = interaction.fields.getTextInputValue("level");
    const modes = interaction.fields.getTextInputValue("modes");

    const preferredModes = modes.split(",").map(m => m.trim());

    const player = await Player.findOneAndUpdate(
      { discordId: interaction.user.id },
      {
        ign,
        uid,
        accountLevel: level,
        preferredModes
      },
      { new: true }
    );

    if (!player) {
      return interaction.reply({
        content: "❌ You are not registered yet. Use `/register` first.",
        ephemeral: true
      });
    }

    return interaction.reply({
      content: "✅ Profile beautifully updated!",
      ephemeral: true
    });

  }

};