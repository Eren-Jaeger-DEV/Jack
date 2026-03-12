const fs = require("fs");
const path = require("path");

const ADMINISTRATOR_BIT = 8n;

function titleizeWords(raw) {
  return raw
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[\-_]+/g, " ")
    .trim();
}

function generateDescriptionFromName(commandName) {
  const words = titleizeWords(commandName).toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return "Provides a utility action in Jack.";

  const first = words[0];
  const map = {
    sell: "Creates a POP market listing.",
    cancel: "Cancels an active entry.",
    pop: "Displays POP market data.",
    add: "Adds data or configuration.",
    remove: "Removes data or configuration.",
    delete: "Deletes data or configuration.",
    create: "Creates a new item.",
    edit: "Edits an existing item.",
    set: "Sets a server configuration value.",
    clear: "Clears stored records.",
    rank: "Shows rank information.",
    warn: "Issues a warning to a user.",
    mute: "Applies a mute action.",
    unmute: "Removes a mute action.",
    kick: "Removes a member from the server.",
    ban: "Bans a member from the server.",
    unban: "Unbans a member from the server.",
    lock: "Locks a channel.",
    unlock: "Unlocks a channel."
  };

  if (map[first]) return map[first];

  const readable = titleizeWords(commandName);
  return `Runs the ${readable} command workflow.`;
}

function generateUsageExamples(commandName) {
  return [`/${commandName}`, `j ${commandName}`];
}

function parseAliases(command) {
  if (Array.isArray(command.aliases)) return command.aliases;
  if (Array.isArray(command.alias)) return command.alias;
  return [];
}

function parseArguments(commandJson) {
  const options = commandJson?.options || [];
  return options
    .filter(opt => opt.type !== 1 && opt.type !== 2)
    .map(opt => ({
      name: opt.name,
      required: Boolean(opt.required),
      type: String(opt.type)
    }));
}

function isAdministratorCommand(sourceCode, commandJson) {
  const slashPerm = commandJson?.default_member_permissions;
  if (slashPerm !== undefined && slashPerm !== null) {
    try {
      const bits = BigInt(String(slashPerm));
      if ((bits & ADMINISTRATOR_BIT) === ADMINISTRATOR_BIT) {
        return true;
      }
    } catch (_err) {
      // Ignore bit parsing failures and rely on source heuristics.
    }
  }

  return /PermissionFlagsBits\.Administrator|ADMINISTRATOR/i.test(sourceCode);
}

function isRoleRestrictedCommand(sourceCode) {
  return /PermissionFlagsBits\.(ManageRoles|ManageGuild|ManageChannels|KickMembers|BanMembers|ModerateMembers|ManageMessages)|checkPermission|allowedRoles|member\.roles|role/i.test(sourceCode);
}

function detectPermissionLevel(command, sourceCode, commandJson) {
  if (isAdministratorCommand(sourceCode, commandJson)) return "Admin Only";

  if (command.permissions || command.requiredRole) return "Role Restricted";
  if (isRoleRestrictedCommand(sourceCode)) return "Role Restricted";

  return "Everyone";
}

function readCommandFiles(commandsPath) {
  const discovered = [];

  if (!fs.existsSync(commandsPath)) {
    return discovered;
  }

  const categories = fs.readdirSync(commandsPath);

  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const files = fs.readdirSync(categoryPath).filter(file => file.endsWith(".js"));

    for (const file of files) {
      discovered.push({
        category,
        filePath: path.join(categoryPath, file)
      });
    }
  }

  return discovered;
}

function scanCommands() {
  const commandsPath = path.join(__dirname, "..", "commands");
  const files = readCommandFiles(commandsPath);
  const commands = [];

  for (const entry of files) {
    try {
      delete require.cache[require.resolve(entry.filePath)];
      const command = require(entry.filePath);
      if (!command || !command.name) continue;

      const sourceCode = fs.readFileSync(entry.filePath, "utf8");
      const commandJson = command.data && typeof command.data.toJSON === "function"
        ? command.data.toJSON()
        : null;

      const description = (command.description || "").trim() || generateDescriptionFromName(command.name);
      const aliases = parseAliases(command);
      const usageExamples = generateUsageExamples(command.name);
      const args = parseArguments(commandJson);

      commands.push({
        name: command.name,
        category: (command.category || entry.category || "utility").toLowerCase(),
        description,
        aliases,
        arguments: args,
        usageExamples,
        permissionLevel: detectPermissionLevel(command, sourceCode, commandJson),
        filePath: entry.filePath
      });
    } catch (err) {
      console.error(`Failed to scan command file: ${entry.filePath}`, err);
    }
  }

  return commands.sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = {
  scanCommands,
  generateDescriptionFromName,
  generateUsageExamples
};
