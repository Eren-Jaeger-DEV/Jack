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
const Player = require("../database/models/Player");



const { setTemporaryPresence, getPresenceText } = require("../utils/presenceManager");

module.exports = {

  name: "interactionCreate",

  async execute(interaction, client) {

    /* ---------- SLASH COMMANDS ---------- */

    // Sync user data on any interaction
    if (interaction.user && !interaction.user.bot) {
      Player.findOneAndUpdate(
        { discordId: interaction.user.id },
        { 
          username: interaction.user.username,
          avatar: interaction.user.avatar
        },
        { upsert: false } // Only update if they already exist
      ).catch(() => null);
    }

    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        console.warn(`[Interaction] Command not found: ${interaction.commandName}`);
        return;
      }

      const ctx = new Context(client, interaction, [], command);
      const executor = require("../../core/commandExecutor");
      await executor.execute(ctx, command);
      return;
    }

    /* ---------- BUTTON INTERACTIONS ---------- */

    if (interaction.isButton()) {

      if (interaction.customId.startsWith("guide_")) {
        return guideMenuHandler(interaction);
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