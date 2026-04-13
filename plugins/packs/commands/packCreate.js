const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const perms = require("../../../bot/utils/permissionUtils");
const { createPack } = require("../../../bot/utils/packManager");

module.exports = {

  name: "packcreate",
  category: "packs",
  description: "Create an empty Emoji Pack in the Global Vault",
  aliases: ["newpack","createpack"],
  usage: "/packcreate <name>  |  j pack create <name>",
  details: "Creates a new empty Emoji Pack in the Global Vault.",

  data: new SlashCommandBuilder()
    .setName("packcreate")
    .setDescription("Initializes an empty Emoji Pack")
    .addStringOption(opt => opt.setName("packname").setDescription("Name of the pack").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async run(ctx) {
    
    if (!perms.isManagement(ctx.member)) {
      return ctx.reply({ content: "❌ **Jack:** Only tactical management personnel can modify Emoji Packs.", flags: 64 });
    }

    const packName = ctx.type === "slash" ? ctx.options.getString("packname").toLowerCase() : ctx.args.join(" ").toLowerCase();

    if (!packName) return ctx.reply("❌ Usage: `/packcreate <packname>`");

    const result = await createPack(packName, ctx.user?.id || ctx.author.id);
    return ctx.reply(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
  }
};
