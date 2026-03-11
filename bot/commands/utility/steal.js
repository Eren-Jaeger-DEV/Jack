const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const { storeEmojiInBank } = require("../../utils/emojiDownloader");
const { storeStickerInBank } = require("../../utils/stickerDownloader");

module.exports = {

  name: "steal",
  category: "utility",
  description: "Steal an emoji or sticker by replying to a message and store it globally.",

  data: new SlashCommandBuilder()
    .setName("steal")
    .setDescription("Steal an emoji or sticker to the Global Vault (Must be used as a prefix command for replies)"),
    // A slash command variant could accept an ID or raw string, but replying is overwhelmingly simpler via Prefix.

  async run(ctx) {

    // Only Admins/Mods can steal
    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild) && !ctx.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return ctx.reply({ content: "❌ You need `Manage Emojis and Stickers` permission to steal.", ephemeral: true });
    }

    // Since stealing replies to messages, it fundamentally works best as a message command ("j steal")
    // If it's a slash command without a target message id, we error
    let targetMessage = null;

    if (ctx.type === "slash") {
       return ctx.reply({ content: "❌ Steal works best as a Prefix Command. Simply reply to a message with `jack steal`.", ephemeral: true });
    } else {
       // Is it a reply?
       if (!ctx.message.reference || !ctx.message.reference.messageId) {
         return ctx.reply("❌ Please reply to a message containing the emoji or sticker you want to steal. E.g: `j steal [name]`");
       }
       try {
         targetMessage = await ctx.channel.messages.fetch(ctx.message.reference.messageId);
       } catch {
         return ctx.reply("❌ Could not fetch the replied message.");
       }
    }

    // Check for Custom Emoji
    const customEmojiRegex = /<(a?):([a-zA-Z0-9_]+):(\d+)>/;
    const emojiMatch = targetMessage.content.match(customEmojiRegex);

    // Check for Stickers
    const stickers = targetMessage.stickers;

    // Check for Attachments (Images/GIFs)
    const attachment = targetMessage.attachments.find(a => a.contentType && a.contentType.startsWith("image/"));

    // Check for raw URLs (Tenor or direct image links)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = targetMessage.content.match(urlRegex);

    // Default name if provided via args (e.g., `j steal coolpepe`)
    let customName = ctx.args[0] ? ctx.args[0].toLowerCase() : null;

    // Helper to handle GIF prompting vs direct store
    const processAsset = async (name, url, id, extension, isNativeSticker = false) => {
       if (isNativeSticker) {
           const result = await storeStickerInBank(name, url, id, ctx.user || ctx.author, ctx.guild);
           return ctx.reply(result.success ? `🚀 Sticker Stolen! ${result.message}` : `❌ Failed: ${result.message}`);
       }

       if (extension === "gif") {
           // Prompt the user for Emoji vs Sticker
           const row = new ActionRowBuilder().addComponents(
               new ButtonBuilder()
                 .setCustomId("choose_emoji")
                 .setLabel("Steal as Emoji")
                 .setStyle(ButtonStyle.Success),
               new ButtonBuilder()
                 .setCustomId("choose_sticker")
                 .setLabel("Steal as Sticker")
                 .setStyle(ButtonStyle.Primary)
           );

           const msg = await ctx.reply({ 
               content: `You are stealing a **GIF** (\`${name}\`). How should I vault it?`, 
               components: [row],
               fetchReply: true 
           });

           const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

           collector.on('collect', async i => {
               if (i.user.id !== (ctx.user?.id || ctx.author.id)) {
                   return i.reply({ content: "You cannot make this choice.", ephemeral: true });
               }

               await i.deferUpdate();
               let result;
               let typeString = "";

               if (i.customId === "choose_emoji") {
                   result = await storeEmojiInBank(name, url, id, i.user, ctx.guild);
                   typeString = "Emoji";
               } else {
                   result = await storeStickerInBank(name, url, id, i.user, ctx.guild);
                   typeString = "Sticker";
               }

               await msg.edit({ 
                   content: result.success ? `🚀 Vaulted as **${typeString}**! ${result.message}` : `❌ Failed: ${result.message}`,
                   components: [] 
               });
           });

           collector.on('end', collected => {
               if (collected.size === 0) {
                   msg.edit({ content: "⏳ Steal request timed out.", components: [] }).catch(()=>{});
               }
           });
       } else {
           // Default standard store for PNGs
           const result = await storeEmojiInBank(name, url, id, ctx.user || ctx.author, ctx.guild);
           return ctx.reply(result.success ? `🚀 Emoji Stolen! ${result.message}` : `❌ Failed: ${result.message}`);
       }
    };

    // --- Process Sticker ---
    if (stickers && stickers.size > 0) {
      const sticker = stickers.first();
      customName = customName || sticker.name;
      return processAsset(customName, sticker.url, sticker.id, "png", true); // Pass true to force native sticker vaulting
    }

    // --- Process Emoji ---
    if (emojiMatch) {
      const isAnimated = emojiMatch[1] === "a";
      const name = emojiMatch[2];
      const id = emojiMatch[3];
      const extension = isAnimated ? "gif" : "png";
      const url = `https://cdn.discordapp.com/emojis/${id}.${extension}`;

      customName = customName || name;
      return processAsset(customName, url, id, extension);
    }

    // --- Process Attachment or Direct URL ---
    let targetUrl = null;
    let targetExtension = "png";

    if (attachment) {
      targetUrl = attachment.url;
      if (attachment.contentType === "image/gif") targetExtension = "gif";
    } else if (urls && urls.length > 0) {
      targetUrl = urls[0];
      if (targetUrl.includes(".gif") || targetUrl.includes("tenor.com")) {
        targetExtension = "gif";
        if (targetUrl.includes("tenor.com/view/")) {
           targetUrl += ".gif";
        }
      }
    }

    if (targetUrl) {
      if (!customName) {
         customName = `stolen_${Math.random().toString(36).substring(2, 6)}`;
      }
      const mockID = `raw_${Date.now()}`;
      
      return processAsset(customName, targetUrl, mockID, targetExtension);
    }

    return ctx.reply("❌ I could not find a custom emoji, sticker, attachment, or image URL in the message you replied to.");
  }
};
