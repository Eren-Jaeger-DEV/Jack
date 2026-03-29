const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const configManager = require("../../../bot/utils/configManager");

module.exports = {
  name: "prefix",
  category: "utility",
  description: "Manage the bot's custom prefix for this server.",
  usage: "/prefix set <new_prefix> | j prefix remove | j prefix review",
  permissions: [PermissionFlagsBits.ManageGuild],

  data: new SlashCommandBuilder()
    .setName("prefix")
    .setDescription("Manage the bot's custom prefix")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => 
      sub.setName("set")
        .setDescription("Set a custom prefix")
        .addStringOption(opt => opt.setName("new_prefix").setDescription("The new prefix (max 5 chars)").setRequired(true))
    )
    .addSubcommand(sub => sub.setName("remove").setDescription("Remove the custom prefix"))
    .addSubcommand(sub => sub.setName("review").setDescription("Review the current prefix")),

  async run(ctx) {
    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return ctx.reply({ content: "❌ You need `Manage Guild` permission to use this.", ephemeral: true });
    }

    let subcommand, newPrefix;

    if (ctx.isInteraction) {
      subcommand = ctx.interaction.options.getSubcommand();
      newPrefix = ctx.interaction.options.getString("new_prefix");
    } else {
      subcommand = ctx.args[0]?.toLowerCase();
      newPrefix = ctx.args[1];
    }

    if (!subcommand || !["set", "remove", "review"].includes(subcommand)) {
      return ctx.reply("Usage: `j prefix set <new_prefix>` | `j prefix remove` | `j prefix review`.");
    }

    if (subcommand === "set") {
      if (!newPrefix) return ctx.reply("❌ Please provide a new prefix.");
      if (newPrefix.length > 5) return ctx.reply("❌ Prefix must be 5 characters or less.");
      
      await configManager.updateGuildConfig(ctx.guildId, { prefix: newPrefix });
      return ctx.reply(`✅ Prefix updated to: \`${newPrefix}\`\nNote: The master prefix \`j\` will always work.`);
    }
    
    if (subcommand === "remove") {
      await configManager.updateGuildConfig(ctx.guildId, { prefix: "j" });
      return ctx.reply("✅ Custom prefix removed. Default prefix is now `j`.");
    }
    
    if (subcommand === "review") {
      const config = await configManager.getGuildConfig(ctx.guildId);
      const prefix = config?.prefix || "j";
      const embed = new EmbedBuilder()
        .setTitle("🤖 Prefix Configuration")
        .setDescription(`Current server prefix: \`${prefix}\`\nMaster prefix: \`j\` (always active)`)
        .setColor("Blue")
        .setFooter({ text: "Use /prefix set to change the prefix" });
      
      return ctx.reply({ embeds: [embed] });
    }
  }
};
