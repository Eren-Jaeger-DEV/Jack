const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const EmojiBank = require("../../../bot/database/models/EmojiBank");
const EmojiPack = require("../../../bot/database/models/EmojiPack");

module.exports = {

  name: "emojiremove",
  category: "emoji",
  description: "Remove an emoji from the global vault.",
  aliases: ["emojidel","delmoji"],
  usage: "/emojiremove <name>  |  j emoji remove <name>",
  details: "Removes a specific emoji from the Global Vault permanently.",

  data: new SlashCommandBuilder()
    .setName("emojiremove")
    .setDescription("Remove an emoji from the global vault")
    .addStringOption(opt => opt.setName("emojiname").setDescription("Name of the emoji to delete").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async run(ctx) {
    
    if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return ctx.reply({ content: "❌ Only server administrators can permanently delete emojis from the global vault.", flags: 64 });
    }

    const emojiName = ctx.type === "slash" ? ctx.options.getString("emojiname").toLowerCase() : ctx.args.join(" ").toLowerCase();

    if (!emojiName) return ctx.reply("❌ Please provide the name of the emoji to remove.");

    const emojiData = await EmojiBank.findOne({ name: emojiName });
    if (!emojiData) {
      return ctx.reply(`❌ No emoji found natively matching \`${emojiName}\`.`);
    }

    // Clean up packs too
    if (emojiData.pack !== "none") {
       const pack = await EmojiPack.findOne({ packName: emojiData.pack });
       if (pack) {
          pack.emojiList = pack.emojiList.filter(id => id !== emojiData.emojiID);
          await pack.save();
       }
    }

    await EmojiBank.deleteOne({ emojiID: emojiData.emojiID });
    return ctx.reply(`✅ Permanently deleted \`${emojiName}\` from the Global Database Vault.`);

  }
};
