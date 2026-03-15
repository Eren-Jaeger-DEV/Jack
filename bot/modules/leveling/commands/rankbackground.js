const { SlashCommandBuilder } = require("discord.js");
const Level = require("../../../database/models/Level");

module.exports = {
  name: "rankbackground",
  category: "leveling",
  description: "Set your custom rank card background",
  data: new SlashCommandBuilder()
    .setName("rankbackground")
    .setDescription("Manage your rank background")
    .addSubcommand(subcmd => 
      subcmd.setName("set")
        .setDescription("Set a custom background image via URL")
        .addStringOption(option => 
          option.setName("url").setDescription("Image URL (png, jpg, jpeg)").setRequired(true)
        )
    ),

  async run(ctx) {
    const url = ctx.options.getString("url");
    
    if (!url.match(/\.(jpeg|jpg|png)$/i)) {
      return ctx.reply({ content: "Please provide a valid image URL ending in .png, .jpg, or .jpeg", ephemeral: true });
    }

    await Level.findOneAndUpdate(
      { userId: ctx.user.id, guildId: ctx.guild.id },
      { background: url },
      { upsert: true }
    );

    return ctx.reply({ content: "✅ Custom rank background updated successfully!", ephemeral: true });
  }
};
