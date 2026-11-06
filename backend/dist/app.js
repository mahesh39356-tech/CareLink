"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const env_js_1 = require("./config/env.js");
const compression_middleware_js_1 = require("./middleware/compression.middleware.js");
const error_middleware_js_1 = require("./middleware/error.middleware.js");
const index_js_1 = __importDefault(require("./routes/index.js"));
exports.app = (0, express_1.default)();
// Security headers
exports.app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
}));
// CORS setup for Frontend & Mobile LAN / Capacitor
exports.app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Content-Encoding', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Disposition'],
}));
// Request logging (sanitized)
if (env_js_1.env.NODE_ENV !== 'test') {
    exports.app.use((0, morgan_1.default)('dev'));
}
// Low-bandwidth GZIP decompression middleware (must precede express.json)
exports.app.use(compression_middleware_js_1.gzipDecompressor);
// Body parsers
exports.app.use(express_1.default.json({ limit: '25mb' }));
exports.app.use(express_1.default.urlencoded({ extended: true, limit: '25mb' }));
// Rate limiting (generous for offline sync bursts)
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
});
exports.app.use('/api', limiter);
// Health check endpoints (available at both /health and /api/health)
const healthHandler = (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        service: 'CareLink Rural Telemedicine Backend',
        database: 'connected',
        port: env_js_1.env.PORT,
    });
};
exports.app.get('/health', healthHandler);
exports.app.get('/api/health', healthHandler);
// Swagger / OpenAPI documentation spec
const swaggerDocument = {
    openapi: '3.0.0',
    info: {
        title: 'CareLink Rural Telemedicine API',
        version: '1.0.0',
        description: 'API for TAH-013 Low-Bandwidth Telemedicine for Rural Healthcare with Real Compression and Offline Synchronization',
    },
    servers: [{ url: `http://localhost:${env_js_1.env.PORT}`, description: 'Local server' }],
    paths: {
        '/health': { get: { summary: 'System Health Check' } },
        '/api/auth/register-patient': { post: { summary: 'Register Patient' } },
        '/api/auth/login': { post: { summary: 'Login' } },
        '/api/patients': { get: { summary: 'Search Patients' } },
        '/api/vitals': { post: { summary: 'Record Vitals' } },
        '/api/files/upload': { post: { summary: 'Upload Raw File' } },
        '/api/files/{id}/compress': { post: { summary: 'Compress File' } },
        '/api/files/{id}/decompress': { post: { summary: 'Decompress & Verify SHA-256' } },
        '/api/sync/batch': { post: { summary: 'Offline Batch Sync with Idempotency' } },
        '/api/consultations/cases': { get: { summary: 'Doctor Tele-Specialist Case Inbox' } },
    },
};
exports.app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocument));
// Mount main REST router
exports.app.use('/api', index_js_1.default);
// Serve frontend static assets from dist if available
const possibleDistPaths = [
    path_1.default.resolve(process.cwd(), '..', 'dist'),
    path_1.default.resolve(process.cwd(), 'dist'),
];
const distPath = possibleDistPaths.find((p) => fs_1.default.existsSync(path_1.default.join(p, 'index.html')));
if (distPath) {
    exports.app.use(express_1.default.static(distPath));
    exports.app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') ||
            req.path.startsWith('/health') ||
            req.path.startsWith('/docs')) {
            return next();
        }
        res.sendFile(path_1.default.join(distPath, 'index.html'));
    });
}
// Global Error Handler
exports.app.use(error_middleware_js_1.errorHandler);
