/**
 * Jack AI - Module Entry
 * Standard lifecycle management for the AI integration.
 */

module.exports = {
  name: "ai",
  async load(client) {
    // Automated events are handled by the core/eventLoader scanning the events/ folder.
  },
  unload(client) {
    // Unloading is handled by the core/eventLoader.
  }
};
