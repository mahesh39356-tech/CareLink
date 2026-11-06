"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.audit = audit;
const database_js_1 = require("../config/database.js");
function audit(action, resource) {
    return async (req, res, next) => {
        // Record audit after response completes
        res.on('finish', async () => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                try {
                    await database_js_1.prisma.auditLog.create({
                        data: {
                            userId: req.user?.userId || null,
                            action,
                            resource,
                            ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
                            userAgent: req.headers['user-agent'] || 'unknown',
                            details: JSON.stringify({
                                method: req.method,
                                url: req.originalUrl,
                                statusCode: res.statusCode,
                            }),
                        },
                    });
                }
                catch (err) {
                    // Non-blocking error for audit log
                    console.error('Failed to create audit log entry:', err);
                }
            }
        });
        next();
    };
}
