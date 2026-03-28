/**
 * JACK GLOBAL ERROR HANDLER (v2.1.0)
 * Centralized error formatting, reference ID generation, and user-safe responses.
 */

const { MessageFlags } = require('discord.js');
const logger = require('../bot/utils/logger');

/**
 * Generates a unique reference ID for error tracking.
 */
function generateRefId() {
    return Math.random().toString(36).substring(2, 9).toUpperCase();
}

/**
 * Handles an error during command execution or system operation.
 */
async function handleError(error, ctx, commandName) {
    const refId = generateRefId();
    const isTimeout = error.message === "COMMAND_TIMEOUT";
    
    // 1. Structured Logging
    logger.error("ErrorHandler", error.message, {
        refId: refId,
        command: commandName,
        guild: ctx?.guild?.id,
        user: ctx?.user?.id,
        stack: error.stack
    });

    // 2. Format User-Safe Response
    const userMessage = isTimeout 
        ? "⚠️ Command timed out. Please try again."
        : `⚠️ An internal error occurred. Ref: \`[${refId}]\``;

    // 3. Send Reply
    if (ctx && typeof ctx.reply === 'function') {
        try {
            await ctx.reply({
                content: userMessage,
                flags: MessageFlags.Ephemeral
            });
        } catch (replyErr) {
            // If reply fails (e.g. unknown interaction), just log it
            logger.warn("ErrorHandler", "Failed to send error reply to user", { refId });
        }
    }
    
    return refId;
}

module.exports = {
    handleError,
    generateRefId
};
