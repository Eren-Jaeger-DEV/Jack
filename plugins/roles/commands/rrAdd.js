const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const ReactionRolePanel = require("../../../bot/database/models/ReactionRolePanel");
const { refreshReactionRolePanel } = require("../../../bot/utils/rrPanelManager");

module.exports = {

  name: "rradd",
  category: "roles",
  description: "Add a Role option to a Reaction Role Panel",
  aliases: ["addreactionrole","rr-add"],
  usage: '/rradd  |  j rr add',
  details: 'Adds a new role option button to an existing Reaction Role Panel.',

  data: new SlashCommandBuilder()
    .setName("rradd")
    .setDescription("Add a role button to a reaction role panel")
    .addStringOption(opt => opt.setName("panel_id").setDescription("The Panel ID").setRequired(true))
    .addRoleOption(opt => opt.setName("role").setDescription("The role to give").setRequired(true))
    .addStringOption(opt => opt.setName("label").setDescription("Text label for the button").setRequired(false))
    .addStringOption(opt => opt.setName("emoji").setDescription("Emoji for the button").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async run(ctx) {

    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return ctx.reply({ content: "❌ You need `Manage Roles` permission to use this.", flags: 64 });
    }

    let panelID, targetRole, label, emoji;

    if (ctx.type === "slash") {
      panelID = ctx.options.getString("panel_id").toUpperCase();
      targetRole = ctx.options.getRole("role");
      label = ctx.options.getString("label");
      emoji = ctx.options.getString("emoji");
    } else {
      // j rr add <PanelID> <@Role> <Label>
      panelID = ctx.args[0]?.toUpperCase();
      const roleMention = ctx.args[1];
      label = ctx.args.slice(2).join(" "); // Simplistic parsing for prefix
      
      if (!panelID || !roleMention) {
         return ctx.reply({ content: "Usage: `jack rr add <PanelID> <@Role> [Label]`" });
      }

      const roleIdMatch = roleMention.match(/<@&(\d+)>/);
      targetRole = roleIdMatch ? ctx.guild.roles.cache.get(roleIdMatch[1]) : ctx.guild.roles.cache.get(roleMention);

      if (!targetRole) return ctx.reply("❌ Invalid role provided.");
    }

    if (!label && !emoji) {
      label = targetRole.name; // Use role name if no label or emoji provided
    }

    // Checking Bot Hierarchy
    const botMember = ctx.guild.members.cache.get(ctx.client.user.id) || await ctx.guild.members.fetch(ctx.client.user.id);
    if (targetRole.position >= botMember.roles.highest.position) {
      return ctx.reply({ content: `❌ I cannot assign this role because its position is higher than or equal to my highest role. Move my role higher in settings!`, flags: 64 });
    }

    // Fetch Panel
    const panel = await ReactionRolePanel.findOne({ panelID, guildID: ctx.guild.id });
    if (!panel) {
      return ctx.reply({ content: `❌ No panel found with ID \`${panelID}\`.`, flags: 64 });
    }

    if (panel.roles.length >= 25) {
      return ctx.reply({ content: `❌ A single message can only hold up to 25 buttons. This panel is full.`, flags: 64 });
    }

    // Avoid duplicate roles on same panel
    if (panel.roles.find(r => r.roleID === targetRole.id)) {
      return ctx.reply({ content: `❌ That role is already linked to this panel!`, flags: 64 });
    }

    // Push new role
    panel.roles.push({
      roleID: targetRole.id,
      label: label || "",
      emoji: emoji || ""
    });

    await panel.save();

    await ctx.reply(`✅ Added **${targetRole.name}** to Panel \`${panelID}\`. Refreshing Panel...`);

    // Force Panel visual update using Utility
    await refreshReactionRolePanel(ctx.client, panelID);

  }
};
