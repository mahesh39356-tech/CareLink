import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { prisma } from '../config/database.js';

export function audit(action: string, resource: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Record audit after response completes
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        try {
          await prisma.auditLog.create({
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
        } catch (err) {
          // Non-blocking error for audit log
          console.error('Failed to create audit log entry:', err);
        }
      }
    });

    next();
  };
}
