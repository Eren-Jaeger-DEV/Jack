const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits
} = require("discord.js");

module.exports = {
  name: "profilecreate",
  category: "clan",
  description: "Create an unlinked BGMI player profile (Admin Only)",
  aliases: ["pc", "createprofile"],
  usage: "/profilecreate  |  j profilecreate",
  details: "Opens the registration modal to create an unlinked profile for a player without a Discord account.",

  data: new SlashCommandBuilder()
    .setName("profilecreate")
    .setDescription("Create an unlinked BGMI player profile (Admin Only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {
    if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return ctx.reply({ content: "❌ You must be an administrator to use this command.", ephemeral: true });
    }

    /* PREFIX COMMAND */
    if (!ctx.isInteraction) {
      return ctx.reply("Use `/profilecreate` to open the manual registration form.");
    }

    /* SLASH COMMAND → OPEN MODAL */
    const modal = new ModalBuilder()
      .setCustomId("admin_create_profile_modal")
      .setTitle("Admin Profile Creation");

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
