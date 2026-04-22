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
      console.log(`[Flow] 1. AFK Start`);
      await afkHandler(message).catch(err => console.error("AFK Handler Error:", err));
      
      console.log(`[Flow] 2. Screenshot Start`);
      await screenshotHandler(message).catch(err => console.error("Screenshot Handler Error:", err));

      console.log(`[Flow] 3. AI Start`);
      const isAIChannel = await aiController.shouldProcess(message, client);
      if (isAIChannel) {
        console.log(`[Flow] 4. AI Processing`);
        const handled = await aiController.process(message, client);
        if (handled) return;
      }

      console.log(`[Flow] 5. Prefix Start`);
      await prefixHandler(message, client);

    } catch (err) {
      console.error("messageCreate error:", err);
    }

  }
};