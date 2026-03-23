const { TEAM_TYPES, ALLOWED_SIZES, TEAMUP_CHANNEL_ID } = require("../config");
const teamService = require("../services/teamService");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "createteam",
  aliases: ["teamcreate"],
  async run(ctx) {
    if (ctx.channel.id !== TEAMUP_CHANNEL_ID) {
      return ctx.reply(`⚠️ This command can only be used in <#${TEAMUP_CHANNEL_ID}>.`);
    }

    try {
      const existing = await teamService.isInTeam(ctx.user.id);
      if (existing) {
        return ctx.reply("❌ You are already in a team! Leave your current team before creating a new one.");
      }

      // Step 1: Ask team type
      const typeEmbed = new EmbedBuilder()
        .setTitle("🎮 Create Team - Step 1/2")
        .setDescription("What type of team do you want to create?\n\nOptions:\n" + TEAM_TYPES.map(t => `• **${t}**`).join("\n"))
        .setColor("#0099ff")
        .setFooter({ text: "Type the name clearly (e.g., 'Esports')" });

      const msg1 = await ctx.reply({ embeds: [typeEmbed] });

      const filter = m => m.author.id === ctx.user.id;
      const collectedType = await ctx.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ["time"] })
        .catch(() => null);

      if (!collectedType) return ctx.reply("⏰ Time-out! Team creation cancelled.");
      
      const typeInput = collectedType.first().content.trim();
      const type = TEAM_TYPES.find(t => t.toLowerCase() === typeInput.toLowerCase());

      if (!type) {
        return ctx.reply("❌ Invalid type! Please try again with one of the listed options.");
      }

      // Step 2: Ask team size
      const sizeEmbed = new EmbedBuilder()
        .setTitle("🎮 Create Team - Step 2/2")
        .setDescription("What is the team size?\n\nAllowed values: **2, 3, 4**")
        .setColor("#0099ff");

      await ctx.channel.send({ embeds: [sizeEmbed] });

      const collectedSize = await ctx.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ["time"] })
        .catch(() => null);

      if (!collectedSize) return ctx.reply("⏰ Time-out! Team creation cancelled.");

      const size = parseInt(collectedSize.first().content.trim());

      if (isNaN(size) || !ALLOWED_SIZES.includes(size)) {
        return ctx.reply("❌ Invalid size! Please enter 2, 3, or 4.");
      }

      // Finalize
      await teamService.createTeam(ctx.client, ctx.guild, ctx.user.id, type, size, ctx.channel);
      
      await ctx.channel.send(`✅ Team created successfully! Check the embed below.`);

    } catch (err) {
      console.error("[TeamUp] CreateTeam error:", err);
      ctx.reply(`⚠️ Error: ${err.message}`);
    }
  }
};
