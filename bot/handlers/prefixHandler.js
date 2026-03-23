const { prefixes } = require("../../config/prefixes");
const Context = require("../structures/Context");
const CommandUsage = require("../database/models/CommandUsage");
const { setTemporaryPresence, getPresenceText } = require("../utils/presenceManager");

module.exports = async (message, client) => {

  if (!message.guild) return;
  if (message.author.bot) return;
  if (message.interaction) return; // Prevent slash + prefix collision

  const prefix = prefixes.find(p =>
    message.content.toLowerCase().startsWith(p.toLowerCase())
  );

  if (!prefix) return;

  const args = message.content
    .slice(prefix.length)
    .trim()
    .split(/ +/);

  let commandName = args.shift()?.toLowerCase();

  /* ─── MULTI-WORD ALIAS ROUTING ─── */


  // j rr create/add/remove/delete
  if (commandName === "rr") {
    const subCommand = args[0]?.toLowerCase();
    if (subCommand === "create") { commandName = "rrcreate"; args.shift(); }
    else if (subCommand === "add") { commandName = "rradd"; args.shift(); }
    else if (subCommand === "remove") { commandName = "rrremove"; args.shift(); }
    else if (subCommand === "delete" || subCommand === "del") { commandName = "rrdelete"; args.shift(); }
  }

  // j emoji bank/browse/add/remove/slots/temp/cleanup
  if (commandName === "emoji") {
    const sub = args[0]?.toLowerCase();
    if (sub === "bank") { commandName = "emojibank"; args.shift(); }
    else if (sub === "browse") { commandName = "emojibrowse"; args.shift(); }
    else if (sub === "add") { commandName = "emojiadd"; args.shift(); }
    else if (sub === "remove") { commandName = "emojiremove"; args.shift(); }
    else if (sub === "slots") { commandName = "emojislots"; args.shift(); }
    else if (sub === "temp") { commandName = "emojitemp"; args.shift(); }
    else if (sub === "cleanup") { commandName = "emojicleanup"; args.shift(); }
    // else fall through to "emoji" (emojiSearch)
  }

  // j sticker bank/browse/add/remove
  if (commandName === "sticker") {
    const sub = args[0]?.toLowerCase();
    if (sub === "bank") { commandName = "stickerbank"; args.shift(); }
    else if (sub === "browse") { commandName = "stickerbrowse"; args.shift(); }
    else if (sub === "add") { commandName = "stickeradd"; args.shift(); }
    else if (sub === "remove") { commandName = "stickerremove"; args.shift(); }
  }

  // j pack create/add/remove/import
  if (commandName === "pack") {
    const sub = args[0]?.toLowerCase();
    if (sub === "create") { commandName = "packcreate"; args.shift(); }
    else if (sub === "add") { commandName = "packadd"; args.shift(); }
    else if (sub === "remove") { commandName = "packremove"; args.shift(); }
    else if (sub === "import") { commandName = "packimport"; args.shift(); }
  }

  // j create team
  if (commandName === "create" && args[0]?.toLowerCase() === "team") {
    commandName = "createteam"; args.shift();
  }

  // j pop sell/cancel/market
  if (commandName === "sell" && args[0]?.toLowerCase() === "pop") {
    commandName = "sell";
  } else if (commandName === "pop" && args[0]?.toLowerCase() === "cancel") {
    commandName = "cancelpop"; args.shift();
  } else if (commandName === "pop" && args[0]?.toLowerCase() === "market") {
    commandName = "popmarket"; args.shift();
  }

  /* ─── LOOKUP: by name first, then by alias ─── */

  let command = client.commands.get(commandName);

  if (!command) {
    // Walk all commands and check their aliases array
    command = client.commands.find(cmd =>
      Array.isArray(cmd.aliases) && cmd.aliases.includes(commandName)
    );
  }

  if (!command) return;

  const presenceText = getPresenceText(commandName);
  setTemporaryPresence(client, presenceText);

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
    try {
      await ctx.reply("⚠️ Command execution failed.");
    } catch (e) {}
  }

};