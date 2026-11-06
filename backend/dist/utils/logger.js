"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
function sanitize(data) {
    if (typeof data !== 'object' || data === null)
        return data;
    if (Array.isArray(data))
        return data.map(sanitize);
    const sanitized = {};
    for (const [key, val] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('password') ||
            lowerKey.includes('token') ||
            lowerKey.includes('secret') ||
            lowerKey.includes('authorization')) {
            sanitized[key] = '***REDACTED***';
        }
        else if (typeof val === 'object' && val !== null) {
            sanitized[key] = sanitize(val);
        }
        else {
            sanitized[key] = val;
        }
    }
    return sanitized;
}
function formatMessage(level, message, meta) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(sanitize(meta))}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}
exports.logger = {
    info: (msg, meta) => console.log(formatMessage('info', msg, meta)),
    warn: (msg, meta) => console.warn(formatMessage('warn', msg, meta)),
    error: (msg, meta) => console.error(formatMessage('error', msg, meta)),
    debug: (msg, meta) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(formatMessage('debug', msg, meta));
        }
    },
};
