const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const Player = require("../../../bot/database/models/Player");

module.exports = {
  name: "profiletransfer",
  category: "clan",
  description: "Link an unlinked profile to a Discord user (Admin Only)",
  aliases: ["pt", "transferprofile"],
  usage: "/profiletransfer [@user]  |  j profiletransfer [@user]",
  details: "Allows admins to transfer an unlinked, manually-created profile to a Discord user. If an unlinked profile matches perfectly when a user runs /register, it is claimed automatically.",

  data: new SlashCommandBuilder()
    .setName("profiletransfer")
    .setDescription("Link an unlinked profile to a Discord user")
    .addUserOption(o => 
      o.setName("user")
       .setDescription("The target Discord user to link the profile to")
       .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {
    if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return ctx.reply({ content: "❌ You must be an administrator to use this command.", ephemeral: true });
    }

    const targetUser = ctx.options?.getUser?.("user") || ctx.message?.mentions?.users?.first();
    if (!targetUser) {
      return ctx.reply("Please mention or specify a target user.");
    }

    // Check if target user already has a linked profile
    const existingTargetProfile = await Player.findOne({ discordId: targetUser.id });
    if (existingTargetProfile) {
      return ctx.reply(`❌ **${targetUser.username}** already has a linked profile (IGN: ${existingTargetProfile.ign}).`);
    }

    // Fetch all unlinked profiles
    const unlinkedProfiles = await Player.find({ status: "unlinked" });
    if (unlinkedProfiles.length === 0) {
      return ctx.reply("❌ No unlinked profiles are available to transfer.");
    }

    const options = unlinkedProfiles.map(p => ({
      label: p.ign || "Unknown IGN",
      description: `UID: ${p.uid || 'N/A'}`,
      value: p._id.toString()
    }));

    // Pagination for select menu isn't directly supported, limit to first 25
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`admin_transfer_select_${targetUser.id}`)
      .setPlaceholder("Select an unlinked profile to transfer...")
      .addOptions(options.slice(0, 25));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const msg = await ctx.reply({
      content: `Select an unlinked profile to transfer to **${targetUser.username}**:`,
      components: [row],
      fetchReply: true
    });

    if (!msg) return;

    // Handle selection inline
    const filter = i => i.customId === `admin_transfer_select_${targetUser.id}` && i.user.id === ctx.user.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
      // Acknowledge immediately to prevent timeout
      await i.deferUpdate().catch(() => {});

      const selectedId = i.values[0];
      const profile = await Player.findById(selectedId);
      
      if (!profile) {
        return i.editReply({ content: "❌ Profile not found, it may have been already linked or deleted.", components: [] });
      }

      if (profile.status !== "unlinked") {
        return i.editReply({ content: "❌ Profile is no longer unlinked.", components: [] });
      }

      const targetMember = await ctx.guild.members.fetch(targetUser.id).catch(() => null);

      profile.discordId = targetUser.id;
      profile.discordName = targetUser.username;
      profile.status = "linked";
      if (targetMember && !profile.clanJoinDate) {
        profile.clanJoinDate = targetMember.joinedAt;
      }

      await profile.save();

      await i.editReply({ content: `✅ Profile **${profile.ign}** successfully linked to ${targetUser}!`, components: [] });
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        msg.edit({ content: "⏳ Transfer menu expired.", components: [] }).catch(() => {});
      }
    });
  }
};
