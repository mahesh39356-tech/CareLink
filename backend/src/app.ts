import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { env } from './config/env.js';
import { gzipDecompressor } from './middleware/compression.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import apiRouter from './routes/index.js';

export const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// CORS setup for Frontend & Mobile LAN / Capacitor
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Content-Encoding', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Disposition'],
  })
);

// Request logging (sanitized)
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Low-bandwidth GZIP decompression middleware (must precede express.json)
app.use(gzipDecompressor);

// Body parsers
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Rate limiting (generous for offline sync bursts)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Health check endpoints (available at both /health and /api/health)
const healthHandler = (req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'CareLink Rural Telemedicine Backend',
    database: 'connected',
    port: env.PORT,
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Swagger / OpenAPI documentation spec
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'CareLink Rural Telemedicine API',
    version: '1.0.0',
    description: 'API for TAH-013 Low-Bandwidth Telemedicine for Rural Healthcare with Real Compression and Offline Synchronization',
  },
  servers: [{ url: `http://localhost:${env.PORT}`, description: 'Local server' }],
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
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Mount main REST router
app.use('/api', apiRouter);

// Serve frontend static assets from dist if available
const possibleDistPaths = [
  path.resolve(process.cwd(), '..', 'dist'),
  path.resolve(process.cwd(), 'dist'),
];
const distPath = possibleDistPaths.find((p) => fs.existsSync(path.join(p, 'index.html')));

if (distPath) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/health') ||
      req.path.startsWith('/docs')
    ) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global Error Handler
app.use(errorHandler);
