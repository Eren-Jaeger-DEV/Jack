const afkHandler = require("../handlers/afkHandler");
const screenshotHandler = require("../handlers/screenshotHandler");
const prefixHandler = require("../handlers/prefixHandler");
const aiController = require("../../core/aiController");
const observer = require("../../core/observer");
const { isOwnerId } = require("../utils/permissionUtils");

module.exports = {
  name: "messageCreate",

  async execute(message, client) {

    if (!message) return;
    if (message.author?.bot) return;

    // ── DM HANDLING (Owner-Only) ──────────────────────────────────────────────
    if (!message.guild) {
      if (isOwnerId(message.author.id)) {
        await aiController.processDM(message, client).catch(err =>
          console.error("[DM Pipeline Error]", err)
        );
      }
      // All non-owner DMs are silently dropped
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