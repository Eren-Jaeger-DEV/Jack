const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const ReactionRolePanel = require("../../../bot/database/models/ReactionRolePanel");

module.exports = {

  name: "rrdelete",
  category: "roles",
  description: "Delete an active Reaction Role Panel permanently",
  aliases: ["deletereactionrole","rr-delete","delrr"],
  usage: "/rrdelete  |  j rr delete",
  details: "Permanently deletes an existing Reaction Role Panel.",

  data: new SlashCommandBuilder()
    .setName("rrdelete")
    .setDescription("Delete a Reaction Role Panel and its message")
    .addStringOption(opt => opt.setName("panel_id").setDescription("The Panel ID").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async run(ctx) {

    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return ctx.reply({ content: "❌ You need `Manage Roles` permission to use this.", flags: 64 });
    }

    let panelID;

    if (ctx.type === "slash") {
      panelID = ctx.options.getString("panel_id").toUpperCase();
    } else {
      panelID = ctx.args[0]?.toUpperCase();
      if (!panelID) return ctx.reply({ content: "Usage: `jack rr delete <PanelID>`" });
    }

    const panel = await ReactionRolePanel.findOne({ panelID, guildID: ctx.guild.id });
    if (!panel) return ctx.reply({ content: `❌ No panel found with ID \`${panelID}\`.`, flags: 64 });

    // Attempt to delete message
    try {
       const channel = await ctx.client.channels.fetch(panel.channelID).catch(() => null);
       if (channel) {
          const message = await channel.messages.fetch(panel.messageID).catch(() => null);
          if (message) await message.delete();
       }
    } catch (err) {
       console.log("Could not delete associated Discord message for deleted Panel ID:", panelID);
    }

    // Delete Record
    await ReactionRolePanel.deleteOne({ panelID });

    return ctx.reply(`✅ Permanently deleted Reaction Role Panel \`${panelID}\`.`);

  }
};
