"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const logger_js_1 = require("../utils/logger.js");
function errorHandler(err, req, res, next) {
    logger_js_1.logger.error(`Unhandled error on ${req.method} ${req.url}:`, {
        message: err.message,
        stack: err.stack,
    });
    const statusCode = err.statusCode || (err.status >= 400 && err.status < 600 ? err.status : 500);
    res.status(statusCode).json({
        success: false,
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    });
}
