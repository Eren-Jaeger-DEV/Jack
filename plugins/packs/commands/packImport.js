const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const { importPackToServer } = require("../../../bot/utils/packManager");

module.exports = {

  name: "packimport",
  category: "packs",
  description: "Download a full Global Emoji Pack into your server automatically.",
  aliases: ["importpack","downloadpack"],
  usage: "/packimport <packName>  |  j pack import <packName>",
  details: "Downloads a full emoji pack into your server, filling available emoji slots.",

  data: new SlashCommandBuilder()
    .setName("packimport")
    .setDescription("Uploads an entire pack's contents to the current server.")
    .addStringOption(opt => opt.setName("packname").setDescription("Exact name of the pack to download").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers),

  async run(ctx) {
    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return ctx.reply({ content: "❌ You need `Manage Emojis and Stickers` permission.", flags: 64 });
    }

    const packName = ctx.type === "slash" ? ctx.options.getString("packname").toLowerCase() : ctx.args.join(" ").toLowerCase();
    if (!packName) return ctx.reply("❌ Usage: `/packimport <packname>`");

    const msg = await ctx.reply({ content: `⏳ Attempting to evaluate pack \`${packName}\` constraints...`, fetchReply: true });

    const result = await importPackToServer(packName, ctx.guild, false);

    if (!result.success && result.needsReplacement) {
        const row = new ActionRowBuilder().addComponents(
           new ButtonBuilder().setCustomId("replace_pack").setLabel("Force Replace Overflows").setStyle(ButtonStyle.Danger),
           new ButtonBuilder().setCustomId("cancel_import").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
        );

        await msg.edit({ content: `⚠️ ${result.message}\nDo you want to forcefuly delete the oldest custom emojis to make room for this pack?`, components: [row] });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
        collector.on('collect', async i => {
            if (i.user.id !== (ctx.user?.id || ctx.author.id)) {
                return i.reply({ content: "You cannot make this decision.", flags: 64 });
            }

            if (i.customId === "cancel_import") {
                return i.update({ content: "❌ Import Cancelled.", components: [] });
            }

            if (i.customId === "replace_pack") {
                await i.update({ content: `⏳ Forcing replacement of old emojis to import \`${packName}\`...`, components: [] });
                const forceResult = await importPackToServer(packName, ctx.guild, true);
                return msg.edit({ content: forceResult.success ? `✅ ${forceResult.message}` : `❌ ${forceResult.message}`, components: [] });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) msg.edit({ components: [] }).catch(()=>{});
        });
        return;
    }

    return msg.edit(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
  }
};
