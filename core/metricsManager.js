/**
 * JACK METRICS MANAGER (v2.2.0)
 * Tracks command usage, average execution time, and error rates.
 * Provides diagnostics for plugin performance auditing.
 */

const metrics = new Map(); // CommandName -> { count, totalTime, errors, lastRefId }

/**
 * Records a command execution metric.
 */
function recordMetric(commandName, timeMs, success, refId = null) {
    if (!metrics.has(commandName)) {
        metrics.set(commandName, {
            count: 0,
            totalTime: 0,
            errors: 0,
            lastRefId: null
        });
    }

    const m = metrics.get(commandName);
    m.count++;
    m.totalTime += timeMs;
    if (!success) m.errors++;
    if (refId) m.lastRefId = refId;
}

/**
 * Returns performance stats for a specific command or all commands.
 */
function getStats(commandName = null) {
    if (commandName) {
        const m = metrics.get(commandName);
        if (!m) return null;
        return {
            ...m,
            avgTime: (m.totalTime / m.count).toFixed(2) + "ms",
            errorRate: ((m.errors / m.count) * 100).toFixed(2) + "%"
        };
    }

    const allStats = {};
    for (const [name, m] of metrics.entries()) {
        allStats[name] = {
            count: m.count,
            avgTime: (m.totalTime / m.count).toFixed(2) + "ms",
            errorRate: ((m.errors / m.count) * 100).toFixed(2) + "%",
            lastRefId: m.lastRefId
        };
    }
    return allStats;
}

/**
 * Identifies high-failure or slow-performing plugins.
 */
function getAnomalies(threshold = 0.5) { // 50% error rate default
    const anomalies = [];
    for (const [name, m] of metrics.entries()) {
        if (m.count > 5 && (m.errors / m.count) >= threshold) {
            anomalies.push({ name, errorRate: (m.errors / m.count) });
        }
    }
    return anomalies;
}

module.exports = {
    recordMetric,
    getStats,
    getAnomalies
};
