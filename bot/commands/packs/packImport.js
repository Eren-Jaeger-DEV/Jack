const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { importPackToServer } = require("../../utils/packManager");

module.exports = {

  name: "packimport",
  category: "packs",
  description: "Download a full Global Emoji Pack into your server automatically.",

  data: new SlashCommandBuilder()
    .setName("packimport")
    .setDescription("Uploads an entire pack's contents to the current server.")
    .addStringOption(opt => opt.setName("packname").setDescription("Exact name of the pack to download").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers),

  async run(ctx) {
    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return ctx.reply({ content: "❌ You need `Manage Emojis and Stickers` permission.", ephemeral: true });
    }

    const packName = ctx.type === "slash" ? ctx.options.getString("packname").toLowerCase() : ctx.args.join(" ").toLowerCase();
    if (!packName) return ctx.reply("❌ Usage: `/packimport <packname>`");

    await ctx.reply(`⏳ Attempting to import pack \`${packName}\`... This may take a moment depending on the pack size.`);

    const result = await importPackToServer(packName, ctx.guild);

    // Using send instead of editReply in case of long timeout or secondary updates
    return ctx.channel.send(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
  }
};
