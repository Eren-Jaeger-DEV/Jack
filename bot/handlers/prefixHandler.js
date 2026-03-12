const { prefixes } = require("../../config/prefixes");
const Context = require("../structures/Context");
const CommandUsage = require("../database/models/CommandUsage");

module.exports = async (message, client) => {

  if (!message.guild) return;
  if (message.author.bot) return;

  const prefix = prefixes.find(p =>
    message.content.startsWith(p)
  );

  if (!prefix) return;

  const args = message.content
    .slice(prefix.length)
    .trim()
    .split(/ +/);

  let commandName = args.shift()?.toLowerCase();

  // Handle multi-word aliases for POP Market
  if (commandName === "sell" && args[0]?.toLowerCase() === "pop") {
     commandName = "sell"; // 'sellpop' command name is actually 'sell' internally checking for 'pop' arg
  } else if (commandName === "pop" && args[0]?.toLowerCase() === "cancel") {
     commandName = "cancelpop";
     args.shift(); // remove 'cancel' from args
  } else if (commandName === "pop" && args[0]?.toLowerCase() === "market") {
     commandName = "popmarket";
     args.shift(); // remove 'market' from args
  }

  // Handle multi-word aliases for Reaction Roles (j rr create, j rr add, etc.)
  if (commandName === "rr") {
     const subCommand = args[0]?.toLowerCase();
     if (subCommand === "create") {
         commandName = "rrcreate";
         args.shift();
     } else if (subCommand === "add") {
         commandName = "rradd";
         args.shift();
     } else if (subCommand === "remove") {
         commandName = "rrremove";
         args.shift();
     } else if (subCommand === "delete" || subCommand === "del") {
         commandName = "rrdelete";
         args.shift();
     }
  }

  // Handle multi-word aliases for Emoji, Sticker, and Pack commands
  if (commandName === "emoji") {
     const subCommand = args[0]?.toLowerCase();
     if (subCommand === "bank") { commandName = "emojibank"; args.shift(); }
     else if (subCommand === "browse") { commandName = "emojibrowse"; args.shift(); }
     else if (subCommand === "add") { commandName = "emojiadd"; args.shift(); }
     else if (subCommand === "remove") { commandName = "emojiremove"; args.shift(); }
     else if (subCommand === "slots") { commandName = "emojislots"; args.shift(); }
     else if (subCommand === "temp") { commandName = "emojitemp"; args.shift(); }
     else if (subCommand === "cleanup") { commandName = "emojicleanup"; args.shift(); }
     // Else it defaults to calling "emoji" search CDN internally
  } else if (commandName === "sticker") {
     const subCommand = args[0]?.toLowerCase();
     if (subCommand === "bank") { commandName = "stickerbank"; args.shift(); }
     else if (subCommand === "browse") { commandName = "stickerbrowse"; args.shift(); }
     else if (subCommand === "add") { commandName = "stickeradd"; args.shift(); }
     else if (subCommand === "remove") { commandName = "stickerremove"; args.shift(); }
  } else if (commandName === "pack") {
     const subCommand = args[0]?.toLowerCase();
     if (subCommand === "create") { commandName = "packcreate"; args.shift(); }
     else if (subCommand === "add") { commandName = "packadd"; args.shift(); }
     else if (subCommand === "remove") { commandName = "packremove"; args.shift(); }
     else if (subCommand === "import") { commandName = "packimport"; args.shift(); }
  }

  const command = client.commands.get(commandName);

  if (!command) return;

  const ctx = new Context(client, message, args);

  try {

    await command.run(ctx);

      await CommandUsage.create({
         commandName: String(command.name || commandName).toLowerCase(),
         userID: message.author.id,
         guildID: message.guild.id,
         timestamp: new Date()
      }).catch(() => null);

  } catch (err) {

    console.error(`Prefix command error (${commandName})`, err);

    ctx.reply("⚠️ Command execution failed.");

  }

};