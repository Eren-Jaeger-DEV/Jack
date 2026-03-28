const { MessageFlags, PermissionFlagsBits } = require("discord.js");
const CommandUsage = require("../database/models/CommandUsage");
const { setTemporaryPresence, getPresenceText } = require("./presenceManager");

/**
 * Executes a command within the provided context.
 * Strict Order: Permissions -> Run -> Error Handling -> Async Logging
 */
async function runCommand(command, ctx) {
  const commandName = command.name || ctx.interaction?.commandName;

  // 1. Permission Checks (Strictly first)
  if (ctx.guild && command.permissions) {
    const botMember = ctx.guild.members.me;
    if (botMember && !botMember.permissions.has(command.permissions)) {
      const missing = botMember.permissions.missing(command.permissions);
      return ctx.reply({
        content: `⚠️ I am missing required permissions: \`${missing.join(", ")}\``,
        flags: MessageFlags.Ephemeral
      }).catch(() => null);
    }
  }

  // 2. Set Presence (Non-blocking)
  const presenceText = getPresenceText(commandName);
  setTemporaryPresence(ctx.client, presenceText);

  // 3. Execution
  try {
    if (typeof command.run !== "function") {
      throw new Error(`Command ${commandName} does not have a run function.`);
    }

    await command.run(ctx);

    // 4. Non-blocking Logging (Completely backgrounded)
    setImmediate(() => {
      CommandUsage.create({
        commandName: String(commandName).toLowerCase(),
        userID: ctx.user.id,
        guildID: ctx.guild?.id,
        timestamp: new Date()
      }).catch(err => console.error("[Executor] Usage logging failed:", err));
    });

  } catch (err) {
    handleError(err, ctx, commandName);
  }
}

/**
 * Standardized error handler for command execution.
 */
async function handleError(err, ctx, commandName) {
  console.error(`[Executor] Error executing command '${commandName}':`, err);

  const errorMessage = "⚠️ Something went wrong while executing this command.";
  
  try {
    if (ctx.isInteraction) {
      if (ctx.source.deferred || ctx.source.replied) {
        await ctx.source.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
      } else {
        await ctx.source.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
      }
    } else {
      await ctx.reply(errorMessage);
    }
  } catch (replyErr) {
    if (replyErr?.code !== 10062) {
      console.error("[Executor] Failed to send error reply:", replyErr);
    }
  }
}

module.exports = {
  runCommand,
  handleError
};
