const { prefixes } = require("../../config/prefixes");

module.exports = async function prefixHandler(message, client) {

  if (message.author.bot) return;
  if (!message.guild) return;

  const prefix = prefixes.find(p => message.content.startsWith(p));
  if (!prefix) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();

  if (!commandName) return;

  const command = client.commands.get(commandName);
  if (!command) return;

  try {

    if (typeof command.runPrefix === "function") {
      await command.runPrefix(client, message, args);
    }

  } catch (err) {

    console.error("Prefix command error:", err);
    message.reply("⚠️ Command error.");

  }

};