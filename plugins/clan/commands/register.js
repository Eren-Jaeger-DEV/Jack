const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");
const configManager = require("../../../bot/utils/configManager");

module.exports = {

  name: "register",
  category: "clan",
  description: "Register your BGMI player profile",
  aliases: ["reg","joinroster"],
  usage: "/register  |  j register",
  details: "Registers your BGMI player profile (IGN, UID, level, preferred modes).",

  data: new SlashCommandBuilder()
    .setName("register")
    .setDescription("Register a BGMI player profile")
    .addUserOption(opt => 
      opt.setName("user")
        .setDescription("The user to register (Admin only)")
        .setRequired(false)
    ),

  async run(ctx) {

    /* PREFIX COMMAND */

    const config = await configManager.getGuildConfig(ctx.guild.id);
    const panelChannelId = require('../services/registrationService').PANEL_CHANNEL_ID;

    if (ctx.channel.id !== panelChannelId) {
      return ctx.reply({
        content: `❌ Registration has been moved to the persistent panel in <#${panelChannelId}>. Please head there to register, edit, or delete your profile.`,
        flags: 64
      });
    }

    if (!ctx.isInteraction) {
      return ctx.reply("Please use the buttons on the registration panel above.");
    }

    /* SLASH COMMAND → OPEN MODAL */
    const targetUser = ctx.options.getUser("user") || ctx.user;
    
    // Check if registering someone else
    if (targetUser.id !== ctx.user.id) {
      const { PermissionFlagsBits } = require("discord.js");
      if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return ctx.reply({ content: "❌ You must be an administrator to register someone else.", flags: 64 });
      }
    }

    const modal = new ModalBuilder()
      .setCustomId(`player_register_modal:${targetUser.id}`)
      .setTitle(`Register: ${targetUser.username}`);

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