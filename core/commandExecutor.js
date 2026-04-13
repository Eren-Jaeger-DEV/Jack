/**
 * JACK COMMAND EXECUTOR (v2.1.0)
 * Orchestrates the full lifecycle of a command execution.
 * Includes Permission Checks, Cooldowns, Timeout Protection, and Global Error Handling.
 */

const perms = require("../bot/utils/permissionUtils");
const { handleError } = require("./errorHandler");
const { checkCooldown, applyCooldown } = require("./cooldownManager");
const { validateCommand } = require("./validator");
const { recordMetric } = require("./metricsManager");
const { generateRefId } = require("./errorHandler");
const logger = require("../bot/utils/logger");
const { setTemporaryPresence, getPresenceText } = require("../bot/utils/presenceManager");
const { performance } = require("perf_hooks");

const MAX_EXECUTION_TIME = 120000; // 120 seconds

/**
 * Orchestrates the execution of a command.
 */
async function execute(ctx, command) {
    const commandName = command.name;
    const requestId = generateRefId();
    const startTime = performance.now();

    // 1. Structural Validation (Secondary check)
    if (!validateCommand(command, "CommandExecutor")) return;

    try {
        // 2. Pre-Execution Checks
        const checkResult = await validate(ctx, command);
        if (!checkResult.success) {
            if (checkResult.message) await ctx.reply(checkResult.message);
            return;
        }

        // 3. Execution with Timeout Protection & Safety Wrap
        const presenceData = getPresenceText(commandName);
        setTemporaryPresence(ctx.client, presenceData);
        
        let success = false;
        try {
            await Promise.race([
                command.run(ctx),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("COMMAND_TIMEOUT")), MAX_EXECUTION_TIME)
                )
            ]);
            success = true;
        } catch (execError) {
            const refId = await handleError(execError, ctx, commandName);
            const duration = performance.now() - startTime;
            recordMetric(commandName, duration, false, refId);
            return;
        }

        const duration = performance.now() - startTime;

        // 4. Apply Cooldown post-success
        applyCooldown(commandName, ctx.userId, ctx.guildId, command.cooldown);

        // 5. Success Logging & Metrics
        recordMetric(commandName, duration, true);
        
        setImmediate(() => {
            logger.info("Executor", `Command executed: ${commandName}`, {
                user: ctx.userId,
                guild: ctx.guildId,
                requestId,
                executionTime: duration.toFixed(2) + "ms",
                status: "SUCCESS"
            });
        });

    } catch (fatalError) {
        // This catch handles unexpected flaws in the EXECUTOR itself
        const refId = await handleError(fatalError, ctx, commandName);
        const duration = performance.now() - startTime;
        recordMetric(commandName, duration, false, refId);
    }
}


/**
 * Validates Permissions and Cooldowns.
 */
async function validate(ctx, command) {
    // 1. Cooldown Check (Bypassed by Owners/Managers/Admins/Contributors)
    const bypass = perms.hasFullBypass(ctx.member);
    const cd = checkCooldown(command.name, ctx.userId, ctx.guildId, command.cooldown);
    
    if (cd.onCooldown && !bypass) {
        return { 
            success: false, 
            message: `⚠️ Please wait **${cd.timeLeft}s** before using the \`${command.name}\` command again.` 
        };
    }

    // 2. Bot Permission Check
    if (ctx.guild && command.permissions) {
        const botMember = ctx.guild.members.me;
        if (botMember && !botMember.permissions.has(command.permissions)) {
            const missing = botMember.permissions.missing(command.permissions);
            return { 
                success: false, 
                message: `⚠️ I am missing required permissions: \`${missing.join(", ")}\`` 
            };
        }
    }

    // 3. User Permission Check (Optional: Could be expanded for RBAC)
    // If command requires specific User permissions, check them here.

    return { success: true };
}

module.exports = {
    execute,
    validate
};
