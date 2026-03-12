const { PermissionFlagsBits, MessageFlags } = require("discord.js");
const GuildConfig = require("../database/models/GuildConfig");
const CommandUsage = require("../database/models/CommandUsage");
const { scanCommands } = require("../utils/commandScanner");
const {
  buildMainDashboardEmbed,
  buildMainMenuRow,
  buildCategoriesOverviewEmbed,
  buildCategoryEmbed,
  buildCategoryControlRows,
  buildCommandPreviewEmbed,
  buildCommandDetailsEmbed,
  buildMostUsedEmbed,
  buildSearchModal,
  getCommandsForView,
  findCommand
} = require("../utils/commandDocGenerator");

function isGuideComponent(interaction) {
  const id = interaction.customId || "";
  return (
    id === "guide_select_main" ||
    id === "guide_select_command" ||
    id === "guide_btn_back_main" ||
    id.startsWith("guide_btn_view_") ||
    id === "guide_modal_search"
  );
}

async function getDashboardMessage(interaction) {
  const cfg = await GuildConfig.findOne({ guildId: interaction.guild.id });
  if (!cfg?.adminGuideChannelId || !cfg?.adminGuideMessageId) {
    return null;
  }

  const channel = await interaction.guild.channels.fetch(cfg.adminGuideChannelId).catch(() => null);
  if (!channel) return null;

  return channel.messages.fetch(cfg.adminGuideMessageId).catch(() => null);
}

function viewLabel(value) {
  const map = {
    moderation: "Moderation Commands",
    pop_market: "POP Market Commands",
    role_management: "Role Management",
    emoji_sticker: "Emoji & Sticker System",
    server_utilities: "Server Utilities",
    bot_admin: "Bot Administration"
  };
  return map[value] || "Command Section";
}

function viewKeyFromCategory(category) {
  const map = {
    moderation: "moderation",
    market: "pop_market",
    roles: "role_management",
    emoji: "emoji_sticker",
    sticker: "emoji_sticker",
    packs: "emoji_sticker",
    utility: "server_utilities",
    level: "server_utilities",
    fun: "server_utilities",
    admin: "bot_admin"
  };

  return map[category] || "categories";
}

function relatedCommandNames(command, allCommands) {
  return allCommands
    .filter(c => c.category === command.category && c.name !== command.name)
    .slice(0, 5)
    .map(c => c.name);
}

async function showMainDashboard(interaction) {
  const commands = scanCommands();
  const embed = buildMainDashboardEmbed().addFields({
    name: "Auto-Detected Commands",
    value: `${commands.length}`,
    inline: true
  });

  return interaction.update({
    embeds: [embed],
    components: [buildMainMenuRow()]
  });
}

async function showCategoriesOverview(interaction) {
  const commands = scanCommands();

  return interaction.update({
    embeds: [buildCategoriesOverviewEmbed(commands)],
    components: [buildMainMenuRow()]
  });
}

async function showCategory(interaction, view) {
  const allCommands = scanCommands();
  const commands = getCommandsForView(view, allCommands);

  return interaction.update({
    embeds: [buildCategoryEmbed(viewLabel(view), commands)],
    components: buildCategoryControlRows(commands, null)
  });
}

async function showCommandPreview(interaction, commandName) {
  const allCommands = scanCommands();
  const command = allCommands.find(c => c.name === commandName);

  if (!command) {
    return interaction.update({
      embeds: [buildMainDashboardEmbed().setDescription("Command not found anymore. It may have been removed.")],
      components: [buildMainMenuRow()]
    });
  }

  const commands = getCommandsForView(viewKeyFromCategory(command.category), allCommands);

  return interaction.update({
    embeds: [buildCommandPreviewEmbed(command)],
    components: buildCategoryControlRows(commands, command.name)
  });
}

async function showCommandDetails(interaction, commandName) {
  const allCommands = scanCommands();
  const command = allCommands.find(c => c.name === commandName);

  if (!command) {
    return interaction.update({
      embeds: [buildMainDashboardEmbed().setDescription("Command not found anymore. It may have been removed.")],
      components: [buildMainMenuRow()]
    });
  }

  const related = relatedCommandNames(command, allCommands);
  const commands = getCommandsForView(viewKeyFromCategory(command.category), allCommands);

  return interaction.update({
    embeds: [buildCommandDetailsEmbed(command, related)],
    components: buildCategoryControlRows(commands, command.name)
  });
}

async function showMostUsed(interaction) {
  const rows = await CommandUsage.aggregate([
    { $match: { guildID: interaction.guild.id } },
    { $group: { _id: "$commandName", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    { $project: { _id: 0, commandName: "$_id", count: 1 } }
  ]);

  return interaction.update({
    embeds: [buildMostUsedEmbed(rows)],
    components: [buildMainMenuRow()]
  });
}

async function showSearchResultFromModal(interaction) {
  const searchValue = interaction.fields.getTextInputValue("command_name") || "";
  const allCommands = scanCommands();
  const command = findCommand(allCommands, searchValue);

  const dashboardMessage = await getDashboardMessage(interaction);
  if (!dashboardMessage) {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Admin dashboard message is not configured.", flags: MessageFlags.Ephemeral });
    }
    return;
  }

  if (!command) {
    await dashboardMessage.edit({
      embeds: [buildMainDashboardEmbed().setDescription(`No command found for \`${searchValue}\`.`)],
      components: [buildMainMenuRow()]
    });

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "Updated dashboard with search result.", flags: MessageFlags.Ephemeral });
    }
    return;
  }

  const related = relatedCommandNames(command, allCommands);
  const commands = getCommandsForView(viewKeyFromCategory(command.category), allCommands);

  await dashboardMessage.edit({
    embeds: [buildCommandDetailsEmbed(command, related)],
    components: buildCategoryControlRows(commands, command.name)
  });

  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply({ content: "Updated dashboard with command details.", flags: MessageFlags.Ephemeral });
  }
}

module.exports = async function guideMenuHandler(interaction) {
  if (!interaction.guild || !interaction.member) return false;

  if (!isGuideComponent(interaction)) {
    return false;
  }

  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    const payload = { content: "❌ Only administrators can use this dashboard.", flags: MessageFlags.Ephemeral };

    if (interaction.isModalSubmit()) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply(payload);
      }
    } else {
      await interaction.reply(payload);
    }

    return true;
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "guide_select_main") {
      const choice = interaction.values?.[0];

      if (choice === "back_main") return showMainDashboard(interaction);
      if (choice === "categories") return showCategoriesOverview(interaction);
      if (choice === "search") {
        if (interaction.replied || interaction.deferred) {
          return true;
        }
        return interaction.showModal(buildSearchModal());
      }
      if (choice === "most_used") return showMostUsed(interaction);

      return showCategory(interaction, choice);
    }

    if (interaction.customId === "guide_select_command") {
      const selected = interaction.values?.[0];
      if (!selected) return interaction.deferUpdate();

      return showCommandPreview(interaction, selected);
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === "guide_btn_back_main") {
      return showMainDashboard(interaction);
    }

    if (interaction.customId.startsWith("guide_btn_view_")) {
      const commandName = interaction.customId.replace("guide_btn_view_", "");
      if (!commandName || commandName === "none") {
        return interaction.deferUpdate();
      }

      return showCommandDetails(interaction, commandName);
    }
  }

  if (interaction.isModalSubmit() && interaction.customId === "guide_modal_search") {
    await showSearchResultFromModal(interaction);
    return true;
  }

  return true;
};
