const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { createPack } = require("../../../bot/utils/packManager");

module.exports = {

  name: "packcreate",
  category: "packs",
  description: "Create an empty Emoji Pack in the Global Vault",

  data: new SlashCommandBuilder()
    .setName("packcreate")
    .setDescription("Initializes an empty Emoji Pack")
    .addStringOption(opt => opt.setName("packname").setDescription("Name of the pack").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers),

  async run(ctx) {
    
    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return ctx.reply({ content: "❌ You need `Manage Emojis and Stickers` permission.", flags: 64 });
    }

    const packName = ctx.type === "slash" ? ctx.options.getString("packname").toLowerCase() : ctx.args.join(" ").toLowerCase();

    if (!packName) return ctx.reply("❌ Usage: `/packcreate <packname>`");

    const result = await createPack(packName, ctx.user?.id || ctx.author.id);
    return ctx.reply(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
  }
};
