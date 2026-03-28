/**
 * JACK STRUCTURED LOGGING SYSTEM (v2.1.0)
 * Standardized JSON logging for production diagnostic consistency.
 */

const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
    INFO: "INFO",
    WARN: "WARN",
    ERROR: "ERROR",
    CRITICAL: "CRITICAL"
};

/**
 * Formats and writes a structured log entry.
 */
function log(level, context, message, meta = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        level: level,
        context: context,
        message: message,
        requestId: meta.requestId || null,
        executionTime: meta.executionTime || null,
        status: meta.status || null,
        meta: meta
    };


    // 1. Console Output (Human Readable for Dev)
    const color = level === LOG_LEVELS.CRITICAL ? "\x1b[41m" : 
                  level === LOG_LEVELS.ERROR ? "\x1b[31m" : 
                  level === LOG_LEVELS.WARN ? "\x1b[33m" : "";
    const reset = "\x1b[0m";
    
    console.log(`${color}[${entry.timestamp}] [${level}] [${context}] ${message}${reset}`);

    // 2. File Output (Structured JSON for Audit)
    try {
        const logDir = path.join(__dirname, '../../logs');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
        fs.appendFileSync(path.join(logDir, 'bot.json.log'), JSON.stringify(entry) + '\n');
    } catch (err) {
        // Fallback to basic stderr if file logging fails
        console.error("Critical Failure in Logger Sync:", err);
    }
}

module.exports = {
    info: (ctx, msg, meta) => log(LOG_LEVELS.INFO, ctx, msg, meta),
    warn: (ctx, msg, meta) => log(LOG_LEVELS.WARN, ctx, msg, meta),
    error: (ctx, msg, meta) => log(LOG_LEVELS.ERROR, ctx, msg, meta),
    critical: (ctx, msg, meta) => log(LOG_LEVELS.CRITICAL, ctx, msg, meta),
    
    // Legacy support (to be phased out)
    addLog: (ctx, msg) => log(LOG_LEVELS.INFO, ctx, msg),
    printLogs: (tag) => console.log(`[Startup] ${tag} initialized successfully.`)
};