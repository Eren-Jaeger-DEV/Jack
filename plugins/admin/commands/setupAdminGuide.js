const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const GuildConfig = require("../../../bot/database/models/GuildConfig");
const { scanCommands } = require("../../../bot/utils/commandScanner");
const {
  buildMainDashboardEmbed,
  buildMainMenuRow
} = require("../../../bot/utils/commandDocGenerator");

module.exports = {
  name: "setup",
  category: "admin",
  description: "Setup the permanent admin guide dashboard",
  aliases: ["setup-admin-guide"],

  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Setup dashboards and persistent system panels")
    .addSubcommand(sub =>
      sub
        .setName("admin-guide")
        .setDescription("Create or refresh the staff admin command dashboard")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {
    const reply = (content) => {
      if (ctx.type === "slash") {
        return ctx.reply({ content, flags: MessageFlags.Ephemeral });
      }

      return ctx.reply(content);
    };

    if (!ctx.guild) {
      return reply("❌ This command can only be used in a server.");
    }

    if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return reply("❌ Administrator permission required.");
    }

    if (ctx.type === "prefix") {
      const sub = (ctx.args[0] || "").toLowerCase();
      if (sub !== "admin-guide") {
        return ctx.reply("Usage: `j setup admin-guide`");
      }
    }

    if (ctx.type === "slash") {
      const sub = ctx.options.getSubcommand(false);
      if (sub !== "admin-guide") {
        return reply("❌ Use `/setup admin-guide`.");
      }

      if (!ctx.interaction.deferred && !ctx.interaction.replied) {
        await ctx.defer({ flags: MessageFlags.Ephemeral });
      }
    }

    const commands = scanCommands();
    const embed = buildMainDashboardEmbed().addFields({
      name: "Auto-Detected Commands",
      value: `${commands.length}`,
      inline: true
    });

    const payload = {
      embeds: [embed],
      components: [buildMainMenuRow()]
    };

    const existing = await GuildConfig.findOne({ guildId: ctx.guild.id });
    let dashboardMessage = null;

    if (existing?.adminGuideChannelId && existing?.adminGuideMessageId) {
      const existingChannel = await ctx.guild.channels.fetch(existing.adminGuideChannelId).catch(() => null);
      if (existingChannel) {
        dashboardMessage = await existingChannel.messages.fetch(existing.adminGuideMessageId).catch(() => null);
      }
    }

    if (dashboardMessage) {
      await dashboardMessage.edit(payload);
      return reply(`✅ Admin guide refreshed in <#${dashboardMessage.channel.id}>.`);
    }

    const sent = await ctx.channel.send(payload);

    await GuildConfig.findOneAndUpdate(
      { guildId: ctx.guild.id },
      {
        guildId: ctx.guild.id,
        adminGuideChannelId: sent.channel.id,
        adminGuideMessageId: sent.id
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    return reply(`✅ Admin guide dashboard created in ${ctx.channel}.`);
  }
};
