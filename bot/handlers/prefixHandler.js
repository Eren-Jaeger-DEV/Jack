const configManager = require("../utils/configManager");
const Context = require("../structures/Context");
const { runCommand } = require("../utils/commandExecutor");

module.exports = async (message, client) => {
  if (!message.guild || message.author.bot || message.interaction) return;

  const config = await configManager.getGuildConfig(message.guild.id);
  const customPrefix = config?.prefix || "j";
  const masterPrefix = "j";

  // Check for prefixes (Custom first, then Master)
  let usedPrefix = null;
  if (message.content.toLowerCase().startsWith(customPrefix.toLowerCase())) {
    usedPrefix = customPrefix;
  } else if (message.content.toLowerCase().startsWith(masterPrefix.toLowerCase())) {
    usedPrefix = masterPrefix;
  }

  if (!usedPrefix) return;

  const args = message.content
    .slice(usedPrefix.length)
    .trim()
    .split(/ +/);

  let commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  /* ─── OPTIMIZED SUB-COMMAND ROUTING ─── */
  const sub = args[0]?.toLowerCase();
  
  const mappings = {
    rr: { create: "rrcreate", add: "rradd", remove: "rrremove", delete: "rrdelete", del: "rrdelete" },
    emoji: { bank: "emojibank", browse: "emojibrowse", add: "emojiadd", remove: "emojiremove", slots: "emojislots", temp: "emojitemp", cleanup: "emojicleanup" },
    sticker: { bank: "stickerbank", browse: "stickerbrowse", add: "stickeradd", remove: "stickerremove" },
    pack: { create: "packcreate", add: "packadd", remove: "packremove", import: "packimport" },
    pop: { cancel: "cancelpop", market: "popmarket" }
  };

  if (mappings[commandName] && sub && mappings[commandName][sub]) {
    commandName = mappings[commandName][sub];
    args.shift();
  } else if (commandName === "create" && sub === "team") {
    commandName = "createteam";
    args.shift();
  } else if (commandName === "sell" && sub === "pop") {
    commandName = "sellpop";
    args.shift();
  }


  /* ─── COMMAND RESOLUTION ─── */
  let command = client.commands.get(commandName);
  if (!command) {
    command = client.commands.find(cmd => Array.isArray(cmd.aliases) && cmd.aliases.includes(commandName));
  }

  if (!command) return;

  // Create context and execute through unified, hardened pipeline
  const ctx = new Context(client, message, args, command);
  const executor = require("../../core/commandExecutor");
  await executor.execute(ctx, command);
};