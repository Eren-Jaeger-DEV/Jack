const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  StringSelectMenuBuilder, 
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');

module.exports = {
  name: "help",
  aliases: ["h", "commands", "cmds"],
  category: "utility",
  description: "View the interactive help menu with all available commands.",
  usage: "/help [mode] | j help [admin]",
  details: "Displays a fully dynamic UI-based help system separating user and admin commands.",

  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("View the interactive help menu with all available commands.")
    .addStringOption(o => 
      o.setName("mode")
      .setDescription("Select User or Admin mode")
      .setRequired(false)
      .addChoices(
        { name: "User", value: "user" },
        { name: "Admin", value: "admin" }
      )
    ),

  async run(ctx) {
    // 1. Determine Mode (User or Admin)
    let mode = "user";
    if (ctx.type === "slash") {
      mode = ctx.options?.getString("mode") || "user";
    } else {
      if (ctx.args[0] && ctx.args[0].toLowerCase() === "admin") {
        mode = "admin";
      }
    }

    // 2. Privilege Check for Admin Mode
    if (mode === "admin") {
      const isAdmin = ctx.member.permissions.has("Administrator") || ctx.member.permissions.has("ManageGuild");
      if (!isAdmin) {
        return ctx.reply({ content: "❌ You do not have permission to view Admin commands.", ephemeral: true });
      }
    }

    // 3. Dynamically Categorize Commands
    const categories = {};
    
    ctx.client.commands.forEach(cmd => {
      // Missing fields fallback
      const permission = cmd.permission ? cmd.permission.toLowerCase() : "user";
      const category = cmd.category || "misc";

      const isAdminCmd = permission.includes("admin") || permission.includes("moderator") || permission.includes("owner") || category === "admin" || category === "moderation";

      // Filter based on mode
      if (mode === "user" && isAdminCmd) {
        return; // Exclude admin commands from User mode
      } else if (mode === "admin" && !isAdminCmd) {
         return; // Exclude user commands from Admin mode
      }

      // Initialize array if not exists
      if (!categories[category]) categories[category] = [];
      
      // Deduplicate by name
      if (!categories[category].find(c => c.name === cmd.name)) {
        categories[category].push({
          name: cmd.name || "unknown",
          description: cmd.description || "No description provided",
          category: category,
          permission: permission,
          usage: cmd.usage || `/${cmd.name}`,
          aliases: cmd.aliases || []
        });
      }
    });

    const categoryList = Object.keys(categories).sort();

    if (categoryList.length === 0) {
       return ctx.reply({ content: `⚠️ No commands found for **${mode}** mode.`, ephemeral: true });
    }

    // 4. Construct Dropdown Options
    const options = categoryList.slice(0, 25).map(cat => {
      return new StringSelectMenuOptionBuilder()
        .setLabel(cat.charAt(0).toUpperCase() + cat.slice(1))
        .setValue(cat)
        .setDescription(`View commands in ${cat}`);
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("help_category_select")
      .setPlaceholder("Select a category...")
      .addOptions(options);

    const menuRow = new ActionRowBuilder().addComponents(selectMenu);

    // Main Menu Embed
    const mainEmbed = new EmbedBuilder()
      .setTitle(mode === "admin" ? "🛡️ Jack Admin Help Panel" : "📖 Jack Help Panel")
      .setDescription("Select a category from the dropdown menu below to view commands.")
      .setColor(mode === "admin" ? "Red" : "Blue")
      .setFooter({ text: `${mode.toUpperCase()} MODE | Dynamically generated from plugins` });

    // Send the reply (fetchReply to get the Message object for the collector)
    const responseMessage = await ctx.reply({
       embeds: [mainEmbed],
       components: [menuRow],
       fetchReply: true
    });

    if (!responseMessage) return; // if it failed to send/fetch

    // Back Button (shown when viewing a category)
    const backButton = new ButtonBuilder()
      .setCustomId("help_back_button")
      .setLabel("Back to Main Menu")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⬅️");
    
    const buttonRow = new ActionRowBuilder().addComponents(backButton);

    // 5. Create Component Collector
    const collector = responseMessage.createMessageComponentCollector({ 
      filter: (i) => i.customId.startsWith('help_'), 
      time: 120000 
    });

    let currentPage = 0;
    let currentCategoryCmds = [];

    collector.on('collect', async (interaction) => {
      // Ensure only the person who ran the command can use the dropdown
      if (interaction.user.id !== ctx.user.id) {
        return interaction.reply({ content: "❌ This menu is not for you!", ephemeral: true });
      }

      if (interaction.isStringSelectMenu() && interaction.customId === "help_category_select") {
        const selectedCategory = interaction.values[0];
        currentCategoryCmds = categories[selectedCategory].sort((a, b) => a.name.localeCompare(b.name));
        currentPage = 0;

        await renderCategoryPage(interaction, selectedCategory);
      } 
      
      else if (interaction.isButton()) {
        if (interaction.customId === "help_back_button") {
           // Return to main menu
           await interaction.update({ embeds: [mainEmbed], components: [menuRow] });
        } else if (interaction.customId === "help_prev_page") {
           currentPage--;
           await renderCategoryPage(interaction, currentCategoryCmds[0].category);
        } else if (interaction.customId === "help_next_page") {
           currentPage++;
           await renderCategoryPage(interaction, currentCategoryCmds[0].category);
        }
      }
    });

    // Helper function to render a page of commands (pagination support)
    async function renderCategoryPage(interaction, category) {
       const itemsPerPage = 5; // Use 5 commands per page for clean formatting
       const totalPages = Math.ceil(currentCategoryCmds.length / itemsPerPage);
       
       const pageCmds = currentCategoryCmds.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

       const catEmbed = new EmbedBuilder()
         .setTitle(`📂 ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
         .setColor(mode === "admin" ? "Red" : "Blue")
         .setFooter({ text: `Page ${currentPage + 1} of ${totalPages} • ${currentCategoryCmds.length} commands` });

       let descriptionStr = "";
       for (const cmd of pageCmds) {
         const aliasesStr = cmd.aliases.length > 0 ? `\n**Aliases:** ${cmd.aliases.join(', ')}` : "";
         descriptionStr += `**/${cmd.name}**\n→ ${cmd.description}\n**Usage:** \`${cmd.usage}\`${aliasesStr}\n\n`;
       }
       catEmbed.setDescription(descriptionStr || "No commands found.");

       const paginationRow = new ActionRowBuilder();
       paginationRow.addComponents(backButton);

       if (totalPages > 1) {
          const prevBtn = new ButtonBuilder()
            .setCustomId("help_prev_page")
            .setLabel("Previous")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === 0);
          
          const nextBtn = new ButtonBuilder()
            .setCustomId("help_next_page")
            .setLabel("Next")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === totalPages - 1);
          
          paginationRow.addComponents(prevBtn, nextBtn);
       }

       await interaction.update({ embeds: [catEmbed], components: [menuRow, paginationRow] });
    }

    collector.on('end', () => {
       // Disable components when time expires
       const disabledMenu = ActionRowBuilder.from(menuRow).components[0].setDisabled(true);
       const disabledRow = new ActionRowBuilder().addComponents(disabledMenu);
       responseMessage.edit({ components: [disabledRow] }).catch(() => {});
    });

  }
};