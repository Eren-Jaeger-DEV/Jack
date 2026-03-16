const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const ReactionRolePanel = require("../../../bot/database/models/ReactionRolePanel");
const { refreshReactionRolePanel } = require("../../../bot/utils/rrPanelManager");

module.exports = {

  name: "rrremove",
  category: "roles",
  description: "Remove a Role option from a Reaction Role Panel",

  data: new SlashCommandBuilder()
    .setName("rrremove")
    .setDescription("Remove a role button from a reaction role panel")
    .addStringOption(opt => opt.setName("panel_id").setDescription("The Panel ID").setRequired(true))
    .addRoleOption(opt => opt.setName("role").setDescription("The role to remove").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async run(ctx) {

    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return ctx.reply({ content: "❌ You need `Manage Roles` permission to use this.", flags: 64 });
    }

    let panelID, targetRole;

    if (ctx.type === "slash") {
      panelID = ctx.options.getString("panel_id").toUpperCase();
      targetRole = ctx.options.getRole("role");
    } else {
      panelID = ctx.args[0]?.toUpperCase();
      const roleMention = ctx.args[1];
      
      if (!panelID || !roleMention) {
         return ctx.reply({ content: "Usage: `jack rr remove <PanelID> <@Role>`" });
      }

      const roleIdMatch = roleMention.match(/<@&(\d+)>/);
      targetRole = roleIdMatch ? ctx.guild.roles.cache.get(roleIdMatch[1]) : ctx.guild.roles.cache.get(roleMention);

      if (!targetRole) return ctx.reply("❌ Invalid role provided.");
    }

    const panel = await ReactionRolePanel.findOne({ panelID, guildID: ctx.guild.id });
    if (!panel) return ctx.reply({ content: `❌ No panel found with ID \`${panelID}\`.`, flags: 64 });

    const roleIndex = panel.roles.findIndex(r => r.roleID === targetRole.id);
    if (roleIndex === -1) {
      return ctx.reply({ content: `❌ **${targetRole.name}** is not attached to this panel using Panel ID \`${panelID}\`.`, flags: 64 });
    }

    panel.roles.splice(roleIndex, 1);
    await panel.save();

    await ctx.reply(`✅ Removed **${targetRole.name}** from Panel \`${panelID}\`. Refreshing Panel...`);

    // Force Panel visual update using Utility
    await refreshReactionRolePanel(ctx.client, panelID);

  }
};
