const { addLog } = require("../utils/logger");

/**
 * TASK ENGINE (v1.0.0)
 * Lightweight async background job runner.
 * Allows any part of the system to submit a long-running job
 * and automatically notify a Discord channel on completion or failure.
 *
 * Usage:
 *   const taskEngine = require('../core/taskEngine');
 *   taskEngine.submit({
 *     name: 'Build moderate_voice tool',
 *     fn: async () => { ... return 'result summary'; },
 *     channelId: '148845...',
 *     client
 *   });
 */

const activeTasks = new Map();

const taskEngine = {
  /**
   * Submit a background task.
   * @param {object} opts
   * @param {string} opts.name       — Human-readable task name for logging/notification
   * @param {Function} opts.fn       — Async function to run. Should return a summary string.
   * @param {string} opts.channelId  — Discord channel ID to notify when done
   * @param {object} opts.client     — Discord.js Client instance
   * @param {string} [opts.ownerId]  — Optional owner user ID for DM on failure
   * @returns {string} taskId
   */
  submit({ name, fn, channelId, client, ownerId = null }) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    activeTasks.set(taskId, { name, status: "running", startedAt: Date.now() });

    addLog("TaskEngine", `[${taskId}] Submitted: "${name}"`);

    // Fire and forget — intentionally not awaited
    this._run(taskId, name, fn, channelId, client, ownerId);

    return taskId;
  },

  /**
   * Internal runner — handles execution and notifications.
   */
  async _run(taskId, name, fn, channelId, client, ownerId) {
    const startedAt = Date.now();
    try {
      const resultSummary = await fn();
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      activeTasks.set(taskId, { name, status: "done", elapsed });

      addLog("TaskEngine", `[${taskId}] Completed in ${elapsed}s: "${name}"`);

      // Notify the channel
      await this._sendNotification(client, channelId, {
        type: "success",
        name,
        taskId,
        elapsed,
        summary: resultSummary || "Task completed."
      });

    } catch (err) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      activeTasks.set(taskId, { name, status: "failed", error: err.message, elapsed });

      addLog("TaskEngine", `[${taskId}] Failed after ${elapsed}s: ${err.message}`);

      await this._sendNotification(client, channelId, {
        type: "failure",
        name,
        taskId,
        elapsed,
        summary: err.message
      });

      // Also DM the owner if provided
      if (ownerId) {
        try {
          const owner = await client.users.fetch(ownerId).catch(() => null);
          if (owner) {
            const dm = await owner.createDM().catch(() => null);
            if (dm) await dm.send(`🚨 **[JACK — TASK FAILED]**\nTask: \`${name}\`\nError: \`${err.message}\``).catch(() => {});
          }
        } catch (_) {}
      }
    } finally {
      // Cleanup after 5 minutes to avoid memory leak
      setTimeout(() => activeTasks.delete(taskId), 5 * 60 * 1000);
    }
  },

  /**
   * Send a formatted notification to a channel.
   */
  async _sendNotification(client, channelId, { type, name, taskId, elapsed, summary }) {
    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) return;

      if (type === "success") {
        await channel.send(
          `✅ **[JACK — TASK COMPLETE]**\n` +
          `Task: \`${name}\`\n` +
          `Elapsed: \`${elapsed}s\`\n\n` +
          `${summary}`
        ).catch(() => {});
      } else {
        await channel.send(
          `❌ **[JACK — TASK FAILED]**\n` +
          `Task: \`${name}\`\n` +
          `Elapsed: \`${elapsed}s\`\n` +
          `Error: \`${summary}\``
        ).catch(() => {});
      }
    } catch (_) {}
  },

  /**
   * Get the status of a running task.
   */
  getStatus(taskId) {
    return activeTasks.get(taskId) || null;
  },

  /**
   * List all currently tracked tasks.
   */
  listTasks() {
    return Array.from(activeTasks.entries()).map(([id, info]) => ({ id, ...info }));
  }
};

module.exports = taskEngine;
