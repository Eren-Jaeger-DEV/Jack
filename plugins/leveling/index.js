module.exports = {
  name: "leveling",
  async load(client) {
    // Initialize the Canvas Preload routine safely
    const { preloadBackgrounds } = require("./backgroundCache");
    await preloadBackgrounds();

    // Start the Background DB Sync Worker
    const startWorker = require("./xpWorker");
    startWorker(client);
  }
};
