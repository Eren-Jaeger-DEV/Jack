const { prefixes } = require("../../config/prefixes");
const Context = require("../structures/Context");

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

  const command = client.commands.get(commandName);

  if (!command) return;

  const ctx = new Context(client, message, args);

  try {

    await command.run(ctx);

  } catch (err) {

    console.error(`Prefix command error (${commandName})`, err);

    ctx.reply("⚠️ Command execution failed.");

  }

};