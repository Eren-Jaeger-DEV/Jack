const { SlashCommandBuilder } = require("discord.js");
const Level = require("../../../bot/database/models/Level");

module.exports = {
  name: "rankbackground",
  category: "leveling",
  description: "Set your custom rank card background",
  aliases: ["rankbg","setbg"],
  usage: '/rankbackground  |  j rankbackground',
  details: 'Set a custom background image for your personal rank card.',
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
    let url = "";

    // If an attachment was uploaded as a message attachment
    if (!ctx.isInteraction && ctx.message?.attachments?.size > 0) {
      url = ctx.message.attachments.first().url;
    } 
    // Slash command or URL string
    else if (ctx.isInteraction && ctx.options?.getString("url")) {
      url = ctx.options.getString("url");
    } 
    // Prefix argument string
    else if (!ctx.isInteraction && ctx.args?.length > 0) {
      if (ctx.args[0] === "set" && ctx.args.length > 1) {
        url = ctx.args[1];
      } else {
        url = ctx.args[0];
      }
    }

    if (!url) {
      return ctx.reply({ content: "Please provide a valid image URL or upload an image attachment.", ephemeral: true });
    }
    
    if (!url.match(/\.(jpeg|jpg|png)$/i)) {
      return ctx.reply({ content: "Please provide a valid image URL ending in .png, .jpg, or .jpeg", ephemeral: true });
    }

    const axios = require("axios");
    
    // Validate that the URL is actually accessible and an image
    try {
      const response = await axios.head(url, { timeout: 5000 });
      const contentType = response.headers["content-type"];
      
      if (response.status !== 200) {
        return ctx.reply({ content: `\u274c The provided URL returned a ${response.status} error. Please provide a working image link.`, ephemeral: true });
      }
      
      if (!contentType || !contentType.startsWith("image/")) {
        return ctx.reply({ content: "\u274c The provided URL does not seem to be a valid image.", ephemeral: true });
      }
    } catch (err) {
      return ctx.reply({ content: `\u274c Could not verify the image URL: ${err.message}. Please make sure the link is publicly accessible.`, ephemeral: true });
    }

    await Level.findOneAndUpdate(
      { userId: ctx.user.id, guildId: ctx.guild.id },
      { background: url },
      { upsert: true }
    );

    return ctx.reply({ content: "✅ Custom rank background updated successfully!", ephemeral: true });
  }
};
