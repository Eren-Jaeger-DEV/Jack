const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require("discord.js");
const ReactionRolePanel = require("../../../bot/database/models/ReactionRolePanel");

module.exports = {

  name: "rrcreate",
  category: "roles",
  description: "Create a new Reaction Role Custom Panel",

  data: new SlashCommandBuilder()
    .setName("rrcreate")
    .setDescription("Create a new Reaction Role Custom Panel")
    .addStringOption(opt => opt.setName("title").setDescription("Panel title").setRequired(true))
    .addStringOption(opt => opt.setName("description").setDescription("Panel description").setRequired(true))
    .addChannelOption(opt => 
      opt.setName("channel")
         .setDescription("Channel to send the panel to")
         .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
         .setRequired(true)
    )
    .addStringOption(opt => opt.setName("color").setDescription("Embed HEX color (e.g. #ff0000)").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async run(ctx) {

    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return ctx.reply({ content: "❌ You need `Manage Roles` permission to use this command.", flags: 64 });
    }

    let title, description, targetChannel, color;

    if (ctx.type === "slash") {
      title = ctx.options.getString("title");
      description = ctx.options.getString("description");
      targetChannel = ctx.options.getChannel("channel");
      color = ctx.options.getString("color") || "#0000ff";
    } else {
      // Very basic prefix parsing for the complex rr create args
      // Syntax: j rr create <#channel> <Title> | <Description> | <Color>
      // To keep it simple, suggest user uses slash cmd or handle a combined string
      const rawArgs = ctx.args.join(" ");
      const match = rawArgs.match(/<#(\d+)> (.+?) \| (.+?)(?: \| (.+))?$/);
      
      if (!match) {
         return ctx.reply({ content: "Usage: `jack rr create <#channel> <Title> | <Description> [| <Color>]`\n\n*Using the `/rrcreate` slash command is highly recommended for building panels.*" });
      }

      const channelId = match[1];
      targetChannel = ctx.guild.channels.cache.get(channelId);
      title = match[2];
      description = match[3];
      color = match[4] || "#0000ff";

      if (!targetChannel) return ctx.reply({ content: "❌ Invalid target channel." });
    }

    // 1. Generate unique Panel ID
    const panelID = Math.random().toString(36).substring(2, 8).toUpperCase();

    // 2. Draft the initial empty panel embed
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setFooter({ text: "Panel currently empty. Add roles using /rr add" });

    // 3. Send it to the target channel
    const message = await targetChannel.send({ embeds: [embed] });

    // 4. Save to DB
    await ReactionRolePanel.create({
      panelID,
      guildID: ctx.guild.id,
      channelID: targetChannel.id,
      messageID: message.id,
      title,
      description,
      color,
      roles: []
    });

    return ctx.reply({ content: `✅ Sub-Panel successfully created in ${targetChannel}!\n**Panel ID:** \`${panelID}\``, /* ephemeral false removed */ });

  }
};
