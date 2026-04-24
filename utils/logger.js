/**
 * JACK PREMIUM LOGGER (v3.0.0)
 * Unified celestial logging system with premium boot reporting.
 */

const fs = require('fs');
const path = require('path');
const banner = require('../bot/utils/banner');

const LOG_LEVELS = {
    INFO: "\x1b[36mINFO\x1b[0m",
    WARN: "\x1b[33mWARN\x1b[0m",
    ERROR: "\x1b[31mERROR\x1b[0m",
    CRITICAL: "\x1b[41m\x1b[37mCRIT\x1b[0m"
};

const SYMBOLS = {
    Environment: "⚙️",
    System: "🌐",
    Database: "🗄️",
    Events: "📡",
    Plugins: "🧩",
    Commands: "⚡",
    Latency: "⏳"
};

const startupStats = {
    startTime: Date.now(),
    commands: { loaded: 0, failed: 0 },
    events: { loaded: 0, failed: 0 },
    plugins: { loaded: 0, failed: 0, names: [] },
    core: [], // { system: string, status: string }
    reportShown: false
};

/**
 * Capture core system status (Database, Envs, etc)
 */
function addLog(system, status) {
    if (startupStats.reportShown) {
        log(LOG_LEVELS.INFO, system, status);
    } else {
        startupStats.core.push({ system, status });
    }
}

/**
 * Print the High-End Boot Report
 */
function showBootReport(client) {
    startupStats.reportShown = true;
    const duration = Date.now() - startupStats.startTime;
    const botTag = client.user ? client.user.tag : "Disconnected";

    // console.clear();
    banner.print();

    console.log("\x1b[1m\x1b[34m[ INITIALIZING CELESTIAL BOOT SEQUENCE ]\x1b[0m\n");

    // 1. Core Systems
    startupStats.core.forEach(log => {
        const symbol = SYMBOLS[log.system] || "⚙️";
        const paddedName = log.system.padEnd(16, " ");
        console.log(`  ${symbol} \x1b[1m${paddedName}\x1b[0m \x1b[90m→\x1b[0m \x1b[32m${log.status}\x1b[0m`);
    });

    console.log("");

    // 2. Resource Summary
    const resources = [
        { name: "Commands", stats: startupStats.commands, symbol: SYMBOLS.Commands },
        { name: "Events", stats: startupStats.events, symbol: SYMBOLS.Events },
        { name: "Plugins", stats: startupStats.plugins, symbol: SYMBOLS.Plugins }
    ];

    resources.forEach(res => {
        const failStr = res.stats.failed > 0 ? ` \x1b[31m(${res.stats.failed} failed)\x1b[0m` : "";
        console.log(`  ${res.symbol} \x1b[1m${res.name.padEnd(16, " ")}\x1b[0m \x1b[90m→\x1b[0m \x1b[36m${res.stats.loaded}\x1b[0m loaded${failStr}`);
        if (res.name === "Plugins" && res.stats.names) {
            console.log(`    \x1b[90m(${res.stats.names.join(", ")})\x1b[0m`);
        }
    });

    console.log(`\n  ${SYMBOLS.Latency} \x1b[1mBoot Latency    \x1b[0m \x1b[90m→\x1b[0m \x1b[33m${duration}ms\x1b[0m\n`);

    console.log(`\x1b[32m✅ SYSTEM ONLINE \x1b[0m\x1b[90m—\x1b[0m Authenticated as \x1b[1m${botTag}\x1b[0m\n`);
}

/**
 * Runtime Logging
 */
function _timestamp() {
    return new Date().toTimeString().slice(0, 8);
}

/**
 * Scans objects/strings for sensitive patterns and masks them.
 */
function _scrub(obj, keyName = "") {
    if (!obj) return obj;

    // 1. Check if the KEY itself is sensitive
    const sensitiveKeys = ['token', 'secret', 'password', 'uri', 'key', 'auth', 'mongodb_uri', 'bot_token'];
    if (sensitiveKeys.includes(keyName.toLowerCase())) {
        return "[REDACTED]";
    }

    if (typeof obj === 'string') {
        // Mask Mongo URIs
        let clean = obj.replace(/mongodb(?:\+srv)?:\/\/[^\s]+:[^\s]+@[^\s]+/gi, 'mongodb://***:***@***');
        
        // Mask Discord Tokens (Resilient pattern)
        clean = clean.replace(/[a-zA-Z0-9_-]{23,28}\.[a-zA-Z0-9_-]{6}\.[a-zA-Z0-9_-]{27,}/g, '[DISCORD_TOKEN]');
        
        // Mask general secrets in strings (e.g. "token: 12345")
        clean = clean.replace(/(token|secret|key|password|uri)(["']?\s*[:=]\s*["']?)([a-zA-Z0-9._\-/]{8,})/gi, '$1$2[REDACTED]');
        
        return clean;
    }
    
    if (Array.isArray(obj)) return obj.map(v => _scrub(v));
    
    if (typeof obj === 'object') {
        const cleaned = {};
        for (const [key, val] of Object.entries(obj)) {
            cleaned[key] = _scrub(val, key);
        }
        return cleaned;
    }
    return obj;
}

function log(level, tag, message, metadata) {
    const ts = `\x1b[90m[${_timestamp()}]\x1b[0m`;
    let metaStr = "";
    if (metadata) {
        try {
            const scrubbed = _scrub(metadata);
            metaStr = `\n\x1b[90m${JSON.stringify(scrubbed, null, 2)}\x1b[0m`;
        } catch (e) {
            metaStr = "\n[Metadata Unserializable]";
        }
    }
    
    // Safety: Handle tags that are accidentally passed as objects
    const tagStr = (typeof tag === 'string') ? tag : JSON.stringify(tag);
    console.log(`${ts} ${level.padEnd(14, " ")} \x1b[1m[${tagStr}]\x1b[0m ${message}${metaStr}`);
}

module.exports = {
    addLog,
    showBootReport,
    startupStats,
    info: (tag, msg, meta) => log(LOG_LEVELS.INFO, tag, msg, meta),
    warn: (tag, msg, meta) => log(LOG_LEVELS.WARN, tag, msg, meta),
    error: (tag, msg, meta) => log(LOG_LEVELS.ERROR, tag, msg, meta),
    critical: (tag, msg, meta) => log(LOG_LEVELS.CRITICAL, tag, msg, meta)
};
