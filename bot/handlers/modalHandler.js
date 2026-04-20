const Player = require("../database/models/Player");
const configManager = require("../utils/configManager");

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
        const config = await configManager.getGuildConfig(interaction.guild.id);
        const isClan = member?.roles.cache.has(config?.settings?.clanMemberRoleId || "1477856665817714699");

        unlinkedProfile.discordId = interaction.user.id;
        unlinkedProfile.discordName = interaction.user.username;
        unlinkedProfile.status = "linked";
        unlinkedProfile.uid = uid;
        unlinkedProfile.accountLevel = level;
        unlinkedProfile.preferredModes = preferredModes;
        unlinkedProfile.isClanMember = isClan;
        
        if (isClan && member && !unlinkedProfile.clanJoinDate) {
          unlinkedProfile.clanJoinDate = member.joinedAt;
        } else if (isClan && !unlinkedProfile.clanJoinDate) {
          unlinkedProfile.clanJoinDate = new Date();
        }
        
        await unlinkedProfile.save();
        
        // Start a screenshot session
        const regService = require('../../plugins/clan/services/registrationService');
        regService.startSession(interaction.user.id, { ign, isClan });

        return interaction.reply({
          content: `✅ Linked an existing profile for **${ign}** to your Discord!\nStatus: **${isClan ? "Clan Member" : "Discord Member"}**.\n\n📸 **Final Step:** Please upload a screenshot of your **BGMI Basic Info** (Stats Card) in this channel now.`,
          flags: 64
        });
      }

      // Create new linked profile
      const config = await configManager.getGuildConfig(interaction.guild.id);
      const isClan = member?.roles.cache.has(config?.settings?.clanMemberRoleId || "1477856665817714699");

      await Player.create({
        discordId: interaction.user.id,
        discordName: interaction.user.username,
        ign,
        uid,
        accountLevel: level,
        preferredModes,
        isClanMember: isClan,
        clanJoinDate: (isClan && member) ? member.joinedAt : (isClan ? new Date() : null)
      });

      // Start a screenshot session
      const regService = require('../../plugins/clan/services/registrationService');
      regService.startSession(interaction.user.id, { ign, isClan });

      return interaction.reply({
        content: `✅ Profile saved as **${isClan ? "Clan Member" : "Discord Member"}**.\n\n📸 **Final Step:** Please upload a screenshot of your **BGMI Basic Info** (Stats Card) in this channel now.`,
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

    const config = await configManager.getGuildConfig(interaction.guild.id);
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    const isClan = member?.roles.cache.has(config?.settings?.clanMemberRoleId || "1477856665817714699");

    const player = await Player.findOneAndUpdate(
      { discordId: interaction.user.id },
      {
        ign,
        uid,
        accountLevel: level,
        preferredModes,
        isClanMember: isClan,
        // Only update join date if they just became a clan member and it wasn't set
        $set: (isClan && member) ? { clanJoinDate: member.joinedAt } : {}
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
      content: `✅ Profile updated! Status: **${isClan ? "Clan Member" : "Discord Member"}**.`,
      flags: 64
    });

  }

  // NOTE: Announcement and Ticket modals have been migrated to their respective plugins.
};