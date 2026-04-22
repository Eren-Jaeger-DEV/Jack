const afkHandler = require("../handlers/afkHandler");
const screenshotHandler = require("../handlers/screenshotHandler");
const prefixHandler = require("../handlers/prefixHandler");
const aiController = require("../../core/aiController");
const observer = require("../../core/observer");

module.exports = {
  name: "messageCreate",

  async execute(message, client) {

    if (!message) return;
    if (message.author?.bot) return;
    
    console.log(`[MessageCreate] [${message.guild?.name || 'DM'}] ${message.author.tag}: ${message.content}`);

    if (!message.guild) return;

    // PASSIVE OBSERVATION (Non-blocking)
    observer.recordActivity(message).catch(() => {});

    try {

      await afkHandler(message);
      await screenshotHandler(message);

      // HYBRID AI CONTROLLER LAYER
      const isAIChannel = await aiController.shouldProcess(message, client);
      if (isAIChannel) {
        const handled = await aiController.process(message, client);
        if (handled) return; // Full stop if AI handles it
      }

      await prefixHandler(message, client);

    } catch (err) {
      console.error("messageCreate error:", err);
    }

  }
};