const Player = require("../database/models/Player");

module.exports = async function modalHandler(interaction) {

  if (interaction.customId === "player_register_modal" || interaction.customId === "admin_create_profile_modal") {
    const isManual = interaction.customId === "admin_create_profile_modal";

    const ign = interaction.fields.getTextInputValue("ign");
    const uid = interaction.fields.getTextInputValue("uid");
    const level = interaction.fields.getTextInputValue("level");
    const modes = interaction.fields.getTextInputValue("modes");

    const preferredModes = modes.split(",").map(m => m.trim());

    if (!isManual) {
      // Normal Discord registration
      const existing = await Player.findOne({ discordId: interaction.user.id });
      if (existing) {
        return interaction.reply({
          content: "You already registered. Use /editprofile.",
          flags: 64
        });
      }

      // SMART CLAIM: Check if an unlinked profile exists with this exact IGN
      const unlinkedProfile = await Player.findOne({ ign: new RegExp(`^${ign}$`, "i"), status: "unlinked" });
      const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

      if (unlinkedProfile) {
        // Claim the unlinked profile
        unlinkedProfile.discordId = interaction.user.id;
        unlinkedProfile.discordName = interaction.user.username;
        unlinkedProfile.status = "linked";
        unlinkedProfile.uid = uid;
        unlinkedProfile.accountLevel = level;
        unlinkedProfile.preferredModes = preferredModes;
        if (member && !unlinkedProfile.clanJoinDate) unlinkedProfile.clanJoinDate = member.joinedAt;
        
        await unlinkedProfile.save();
        
        return interaction.reply({
          content: "✅ Found an existing profile created by an admin and linked it to your Discord!\n\nUpload your **BGMI Basic Info** now.",
          flags: 64
        });
      }

      // Create new linked profile
      await Player.create({
        discordId: interaction.user.id,
        discordName: interaction.user.username,
        ign,
        uid,
        accountLevel: level,
        preferredModes,
        clanJoinDate: member ? member.joinedAt : new Date()
      });

      return interaction.reply({
        content: "✅ Profile saved.\n\nUpload your **BGMI Basic Info** now.",
        flags: 64
      });

    } else {
      // Admin Manual Creation
      const existingIgn = await Player.findOne({ ign: new RegExp(`^${ign}$`, "i") });
      if (existingIgn) {
        return interaction.reply({ content: `❌ A profile with IGN **${ign}** already exists.`, flags: 64 });
      }

      await Player.create({
        ign,
        uid,
        accountLevel: level,
        preferredModes,
        status: "unlinked",
        isManual: true,
        createdBy: interaction.user.id,
        clanJoinDate: new Date() // Fallback since no member object
      });

      return interaction.reply({
        content: `✅ Unlinked profile for **${ign}** created successfully.\n\nUpload the **BGMI Basic Info** screenshot for them now.`,
        flags: 64
      });
    }
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
      { returnDocument: 'after' }
    );

    if (!player) {
      return interaction.reply({
        content: "❌ You are not registered yet. Use `/register` first.",
        flags: 64
      });
    }

    return interaction.reply({
      content: "✅ Profile beautifully updated!",
      flags: 64
    });

  }

  /* ---------- ANNOUNCEMENT MODAL ---------- */
  if (interaction.customId.startsWith("announce_modal_")) {

    const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

    const channelId = interaction.customId.replace("announce_modal_", "");
    const targetChannel = interaction.guild.channels.cache.get(channelId);

    if (!targetChannel) {
      return interaction.reply({ content: "❌ Target channel not found.", flags: 64 });
    }

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ No permission.", flags: 64 });
    }

    const title = interaction.fields.getTextInputValue("title");
    const description = interaction.fields.getTextInputValue("description");
    const color = interaction.fields.getTextInputValue("color") || "Random";
    const image = interaction.fields.getTextInputValue("image") || null;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

    if (image) {
      // Basic URL validation
      if (image.startsWith('http')) {
        embed.setImage(image);
      }
    }

    try {
      await targetChannel.send({ embeds: [embed] });
      return interaction.reply({ content: `✅ Announcement sent to ${targetChannel}!`, flags: 64 });
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: "❌ Failed to send announcement. Ensure I have permissions in that channel.", flags: 64 });
    }

  }

};