import { Request, Response, NextFunction } from 'express';
import { SyncService } from '../services/sync.service.js';

export class SyncController {
  static async batchSync(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SyncService.processBatchSync(req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const receipt = await SyncService.getReceipt(req.params.idempotencyKey);
      res.status(200).json({
        success: true,
        data: receipt,
      });
    } catch (err) {
      next(err);
    }
  }
}
