const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

function buildMainDashboardEmbed() {
  return new EmbedBuilder()
    .setTitle("Jack Admin Command Dashboard")
    .setDescription("This panel allows the administration team to explore all commands available in Jack and understand how they work.")
    .setColor("Blue")
    .setFooter({ text: "Prefixes: j | J | jack | Jack" });
}

function mainMenuOptions() {
  return [
    { label: "Command Categories", value: "categories", description: "View all command groups" },
    { label: "Moderation Commands", value: "moderation", description: "Kick, ban, mute, warns and more" },
    { label: "POP Market Commands", value: "pop_market", description: "Manage POP listings and trades" },
    { label: "Role Management", value: "role_management", description: "Reaction roles and role assignments" },
    { label: "Emoji & Sticker System", value: "emoji_sticker", description: "Emoji vault and sticker commands" },
    { label: "Server Utilities", value: "server_utilities", description: "Utility and informational commands" },
    { label: "Bot Administration", value: "bot_admin", description: "Admin setup and control commands" },
    { label: "Search Command", value: "search", description: "Find docs for a specific command" },
    { label: "Most Used Commands", value: "most_used", description: "Top command usage analytics" },
    { label: "Back to Main Menu", value: "back_main", description: "Return to dashboard root" }
  ];
}

function buildMainMenuRow() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("guide_select_main")
      .setPlaceholder("Choose a dashboard section")
      .addOptions(mainMenuOptions())
  );
}

function categoriesForView(view) {
  const map = {
    moderation: ["moderation"],
    pop_market: ["market"],
    role_management: ["roles"],
    emoji_sticker: ["emoji", "sticker", "packs"],
    server_utilities: ["utility", "level", "fun"],
    bot_admin: ["admin"]
  };

  return map[view] || [];
}

function getCommandsForView(view, allCommands) {
  if (view === "categories") {
    return allCommands;
  }

  const categories = categoriesForView(view);
  if (!categories.length) return [];

  return allCommands.filter(cmd => categories.includes(cmd.category));
}

function truncate(text, max = 120) {
  if (!text) return "No description.";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function usageExampleLine(command) {
  const sample = command.usageExamples?.slice(0, 2) || [];
  return sample.join(" | ") || `/${command.name} | j ${command.name}`;
}

function chunkFieldValues(lines, maxLen = 1024) {
  const chunks = [];
  let current = "";

  for (const line of lines) {
    const candidate = current ? `${current}\n\n${line}` : line;

    if (candidate.length > maxLen) {
      if (current) chunks.push(current);
      current = line.length > maxLen ? `${line.slice(0, maxLen - 3)}...` : line;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function buildCategoriesOverviewEmbed(allCommands) {
  const grouped = new Map();

  for (const command of allCommands) {
    if (!grouped.has(command.category)) {
      grouped.set(command.category, 0);
    }
    grouped.set(command.category, grouped.get(command.category) + 1);
  }

  const lines = [...grouped.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([category, count]) => `• **${category}**: ${count} command(s)`);

  return new EmbedBuilder()
    .setTitle("Command Categories")
    .setDescription(lines.join("\n") || "No commands detected.")
    .setColor("Green");
}

function buildCategoryEmbed(viewLabel, commands) {
  const embed = new EmbedBuilder()
    .setTitle(`${viewLabel} Guide`)
    .setDescription(`Commands in this section: **${commands.length}**`)
    .setColor("Orange");

  if (!commands.length) {
    embed.addFields({ name: "Commands", value: "No commands found for this section." });
    return embed;
  }

  const lines = commands.slice(0, 15).map(cmd => {
    return [
      `**${cmd.name}**`,
      `Desc: ${truncate(cmd.description, 80)}`,
      `Perm: ${cmd.permissionLevel}`,
      `Use: ${usageExampleLine(cmd)}`
    ].join("\n");
  });

  const chunks = chunkFieldValues(lines, 1024).slice(0, 6);

  chunks.forEach((chunk, index) => {
    embed.addFields({
      name: index === 0 ? "Command List" : `Command List (cont. ${index + 1})`,
      value: chunk
    });
  });

  if (commands.length > 15) {
    embed.setFooter({ text: `Showing 15/${commands.length}. Use search for specific commands.` });
  }

  return embed;
}

function buildCommandPickerRow(commands) {
  const options = commands.slice(0, 25).map(cmd => ({
    label: cmd.name,
    value: cmd.name,
    description: truncate(cmd.description, 90)
  }));

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("guide_select_command")
      .setPlaceholder("Select a command")
      .addOptions(options)
  );
}

function buildCategoryControlRows(commands, selectedCommand) {
  const rows = [buildMainMenuRow()];

  if (commands.length) {
    rows.push(buildCommandPickerRow(commands));
  }

  const detailsId = selectedCommand ? `guide_btn_view_${selectedCommand}` : "guide_btn_view_none";
  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(detailsId)
        .setLabel("View Command Details")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!selectedCommand),
      new ButtonBuilder()
        .setCustomId("guide_btn_back_main")
        .setLabel("Back to Main Menu")
        .setStyle(ButtonStyle.Secondary)
    )
  );

  return rows;
}

function buildCommandPreviewEmbed(command) {
  return new EmbedBuilder()
    .setTitle(`Command Preview: ${command.name}`)
    .setDescription(command.description)
    .setColor("Aqua")
    .addFields(
      { name: "Permission Level", value: command.permissionLevel, inline: true },
      { name: "Aliases", value: command.aliases.length ? command.aliases.map(a => `\`${a}\``).join(", ") : "None", inline: true },
      { name: "Usage Example", value: usageExampleLine(command), inline: false }
    );
}

function buildCommandDetailsEmbed(command, relatedCommands) {
  const args = command.arguments.length
    ? command.arguments.map(arg => `\`${arg.name}\` (${arg.required ? "required" : "optional"})`).join("\n")
    : "None";

  const related = relatedCommands.length
    ? relatedCommands.map(name => `\`${name}\``).join(", ")
    : "None";

  return new EmbedBuilder()
    .setTitle(`Command Details: ${command.name}`)
    .setDescription(command.description)
    .setColor("Purple")
    .addFields(
      { name: "Aliases", value: command.aliases.length ? command.aliases.map(a => `\`${a}\``).join(", ") : "None", inline: false },
      { name: "Arguments", value: args, inline: false },
      { name: "Usage Examples", value: command.usageExamples.map(u => `\`${u}\``).join("\n"), inline: false },
      { name: "Permission Level", value: command.permissionLevel, inline: true },
      { name: "Related Commands", value: related, inline: true }
    );
}

function buildMostUsedEmbed(rows) {
  const lines = rows.length
    ? rows.map((row, index) => `${index + 1}. \`${row.commandName}\` - **${row.count}** uses`).join("\n")
    : "No command usage data yet.";

  return new EmbedBuilder()
    .setTitle("Most Used Commands")
    .setDescription(lines)
    .setColor("Gold");
}

function buildSearchModal() {
  const modal = new ModalBuilder()
    .setCustomId("guide_modal_search")
    .setTitle("Search Command");

  const input = new TextInputBuilder()
    .setCustomId("command_name")
    .setLabel("Command Name")
    .setPlaceholder("Example: warn")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

function findCommand(commands, query) {
  const clean = query.trim().toLowerCase();
  if (!clean) return null;

  return commands.find(cmd => {
    if (cmd.name.toLowerCase() === clean) return true;
    return cmd.aliases.some(alias => alias.toLowerCase() === clean);
  }) || null;
}

module.exports = {
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
};
