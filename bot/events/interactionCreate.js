const Context = require("../structures/Context");
const { MessageFlags } = require("discord.js");
const buttonHandler = require("../handlers/buttonHandler");
const modalHandler = require("../handlers/modalHandler");
const browserModalHandler = require("../handlers/browserModalHandler");
const popButtons = require("../interactions/popButtons");
const reactionRoleButtons = require("../interactions/reactionRoleButtons");
const emojiBrowserButtons = require("../interactions/emojiBrowserButtons");
const guideMenuHandler = require("../interactions/guideMenuHandler");
const CommandUsage = require("../database/models/CommandUsage");

/* Server Overview button embeds */
const overview = require("../systems/panels/serverOverview");

const { setTemporaryPresence, getPresenceText } = require("../utils/presenceManager");

module.exports = {

  name: "interactionCreate",

  async execute(interaction, client) {

    /* ---------- SLASH COMMANDS ---------- */

    if (interaction.isChatInputCommand()) {

      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      const presenceText = getPresenceText(interaction.commandName);
      setTemporaryPresence(client, presenceText);

      const ctx = new Context(client, interaction);

      try {

        if (command.run) {
          await command.run(ctx);

          await CommandUsage.create({
            commandName: interaction.commandName.toLowerCase(),
            userID: interaction.user.id,
            guildID: interaction.guild.id,
            timestamp: new Date()
          }).catch(() => null);
        }

      } catch (err) {

        console.error(`Command error (${interaction.commandName})`, err);

        if (!interaction.replied && !interaction.deferred) {
          try {
            await interaction.reply({
              content: "⚠️ Something went wrong executing this command.",
              flags: MessageFlags.Ephemeral
            });
          } catch (replyErr) {
            if (replyErr?.code !== 10062) {
              console.error("Failed to send command error reply:", replyErr);
            }
          }
        }

      }

      return;

    }

    /* ---------- BUTTON INTERACTIONS ---------- */

    if (interaction.isButton()) {

      if (interaction.customId.startsWith("guide_")) {
        return guideMenuHandler(interaction);
      }

      /* Server Overview panel buttons */

      if (interaction.customId.startsWith("overview_")) {

        const guild = interaction.guild;
        let embed;

        switch (interaction.customId) {
          case "overview_roles":    embed = overview.rolesEmbed(guild); break;
          case "overview_channels": embed = overview.channelsEmbed(guild); break;
          case "overview_clan":     embed = overview.clanEmbed(); break;
          case "overview_pop":      embed = overview.popEmbed(); break;
          case "overview_support":  embed = overview.supportEmbed(); break;
        }

        if (embed) {
          return interaction.reply({
            embeds: [embed],
            components: [overview.buildButtons()],
            flags: MessageFlags.Ephemeral
          });
        }

      }

      /* POP Marketplace buttons */
      if (
        interaction.customId.startsWith("buy_pop_") ||
        interaction.customId.startsWith("deal_final_") ||
        interaction.customId.startsWith("deal_cancel_")
      ) {
        return popButtons(interaction);
      }

      /* Reaction Role Buttons */
      if (interaction.customId.startsWith("rr_assign_")) {
        return reactionRoleButtons(interaction);
      }

      /* Emoji Vault Buttons */
      if (interaction.customId.startsWith("browser_add_")) {
        return emojiBrowserButtons(interaction);
      }

      /* Ticket & other buttons */
      return buttonHandler(interaction);

    }

    /* ---------- SELECT MENU INTERACTIONS ---------- */
    if (interaction.isStringSelectMenu()) {
      try {
        if (interaction.customId.startsWith("guide_")) {
          return await guideMenuHandler(interaction);
        }

        if (interaction.customId === "admin_select_action") {
          return await emojiBrowserButtons(interaction);
        }
      } catch (err) {
        if (err?.code === 10062) {
          return;
        }
        console.error("Select Menu interaction error:", err);
      }
    }

    /* ---------- MODAL SUBMISSIONS ---------- */

    if (interaction.isModalSubmit()) {
      try {
        if (interaction.customId.startsWith("guide_")) {
          return await guideMenuHandler(interaction);
        }

        if (interaction.customId.startsWith("modal_rename_") || interaction.customId.startsWith("modal_pack_")) {
          return await browserModalHandler(interaction);
        }
        return await modalHandler(interaction);
      } catch (err) {
        console.error("Modal submission error:", err);
      }
    }

  }

};