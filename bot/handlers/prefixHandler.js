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

  const commandName = args.shift()?.toLowerCase();

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