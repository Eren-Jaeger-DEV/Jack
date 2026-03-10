const Context = require("../structures/Context");

module.exports = async (client, message) => {

  if (!message.guild) return;
  if (message.author.bot) return;

  const prefixes = ["j", "J", "jack", "Jack"];

  const prefix = prefixes.find(p => message.content.startsWith(p));
  if (!prefix) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  const ctx = new Context(client, message, args);

  try {

    // NEW JACK 3.0 COMMAND FORMAT
    if (command.run) {
      return command.run(ctx);
    }

    // OLD JACK 2.0 FORMAT (compatibility layer)
    if (command.execute) {
      return command.execute(client, message, args);
    }

  } catch (error) {

    console.error("Prefix command error:", error);

  }

};