const ReactionRolePanel = require("../database/models/ReactionRolePanel");

module.exports = async function reactionRoleButtons(interaction) {

  if (!interaction.customId.startsWith("rr_assign_")) return;

  // Custom ID format: rr_assign_[panelID]_[roleID]
  const idParts = interaction.customId.split("_");
  const panelID = idParts[2];
  const roleID = idParts[3];

  await interaction.deferReply({ flags: 64 });

  const panel = await ReactionRolePanel.findOne({ panelID });
  if (!panel) {
    return interaction.editReply({ content: "❌ This reaction role panel is no longer active in the database." });
  }

  // Double check role exists in guild
  const targetRole = interaction.guild.roles.cache.get(roleID);
  if (!targetRole) {
    return interaction.editReply({ content: "❌ That role no longer exists on this server." });
  }

  // Check Bot Hierarchy
  const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
  if (targetRole.position >= botMember.roles.highest.position) {
    return interaction.editReply({ content: "❌ I cannot assign this role because it is higher than or equal to my highest role position in server settings." });
  }

  try {
    const member = await interaction.guild.members.fetch(interaction.user.id);

    // Toggle Role (Add if missing, Remove if exists)
    if (member.roles.cache.has(roleID)) {
      await member.roles.remove(roleID);
      return interaction.editReply({ content: `✅ Removed the **${targetRole.name}** role from you.` });
    } else {
      await member.roles.add(roleID);
      return interaction.editReply({ content: `✅ Assigned the **${targetRole.name}** role to you!` });
    }

  } catch (error) {
    console.error("Reaction Role Assign Error:", error);
    return interaction.editReply({ content: "❌ An error occurred trying to assign the role. Please check my permissions." });
  }

};
