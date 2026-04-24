const afkHandler = require("../handlers/afkHandler");
const screenshotHandler = require("../handlers/screenshotHandler");
const prefixHandler = require("../handlers/prefixHandler");
const aiController = require("../../core/aiController");
const observer = require("../../core/observer");
const { isOwnerId } = require("../utils/permissionUtils");
const logger = require("../../utils/logger");

module.exports = {
  name: "messageCreate",

  async execute(message, client) {

    if (!message) return;
    if (message.author?.bot) return;

    // Global message logging removed to reduce noise. 
    // Logging is now handled by specialized handlers (AI, Commands, etc.)

    // ── DM HANDLING (Owner-Only) ──────────────────────────────────────────────
    if (!message.guild) {
      logger.info("DM_GATE", `DM received from: ${message.author?.id}`);

      // With Partials enabled, author may be partial — fetch to ensure full User object
      if (message.author?.partial) {
        try { await message.author.fetch(); } catch (e) {}
      }

      const authorId = message.author?.id;
      logger.info("DM_GATE", `authorId=${authorId} | isOwner=${isOwnerId(authorId)}`);

      if (isOwnerId(authorId)) {
        logger.info("DM_GATE", `Routing to processDM...`);
        await aiController.processDM(message, client).catch(err =>
          console.error("[DM Pipeline Error]", err)
        );
      }
      return;
    }

    // ── GUILD HANDLING ────────────────────────────────────────────────────────
    observer.recordActivity(message).catch(() => {});

    try {
      await afkHandler(message).catch(err => console.error("AFK Handler Error:", err));
      await screenshotHandler(message).catch(err => console.error("Screenshot Handler Error:", err));

      const isAIChannel = await aiController.shouldProcess(message, client);
      if (isAIChannel) {
        const handled = await aiController.process(message, client);
        if (handled) return;
      }

      await prefixHandler(message, client);

    } catch (err) {
      console.error("messageCreate error:", err);
    }

  }
};