module.exports = {
  name: "messageCreate",

  async execute(message, client) {
    if (message.author.bot) return;

    const prefixes = ["j", "jack"];
    const content = message.content.toLowerCase();

    const usedPrefix = prefixes.find(prefix =>
      content.startsWith(prefix)
    );

    if (!usedPrefix) return;

    const args = message.content
      .slice(usedPrefix.length)
      .trim()
      .split(/ +/);

    const cmdName = args.shift()?.toLowerCase();
    if (!cmdName) return;

    const command = client.commands.get(cmdName);
    if (!command || typeof command.prefixExecute !== "function") return;

    try {
      await command.prefixExecute(message, args, client);
    } catch (err) {
      console.error("Prefix Command Error:", err);
      message.reply("Error running command.").catch(() => {});
    }
  }
};