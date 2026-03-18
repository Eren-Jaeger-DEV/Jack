/**
 * index.js — Events Plugin Entry Point
 *
 * This file bootstraps the Events plugin.
 * The pluginLoader will call load(client) after loading commands/events.
 */

module.exports = {
  load(client) {
    console.log('[EventSystem] Events plugin loaded and ready.');
  }
};
