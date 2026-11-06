import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { CompressionService } from '../services/compression.service.js';
import { prisma } from '../config/database.js';

export class FileController {
  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const fileRecord = await CompressionService.registerUpload(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      res.status(201).json({
        success: true,
        message: 'File uploaded into storage/original successfully',
        data: fileRecord,
      });
    } catch (err) {
      next(err);
    }
  }

  static async compress(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await CompressionService.compressFile(req.params.id);
      const report = await CompressionService.generateReport(req.params.id);

      res.status(200).json({
        success: true,
        message: 'File compressed successfully',
        data: updated,
        report,
      });
    } catch (err) {
      next(err);
    }
  }

  static async decompress(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await CompressionService.decompressFile(req.params.id);
      const report = await CompressionService.generateReport(req.params.id);

      res.status(200).json({
        success: true,
        message: 'File decompressed and integrity checked successfully',
        data: updated,
        report,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getFile(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await CompressionService.generateReport(req.params.id);
      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }

  static async downloadOriginal(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await prisma.fileRecord.findUnique({ where: { id: req.params.id } });
      if (!record || !fs.existsSync(record.originalPath)) {
        return res.status(404).json({ success: false, error: 'Original file not found' });
      }
      res.download(record.originalPath, record.originalFilename);
    } catch (err) {
      next(err);
    }
  }

  static async downloadCompressed(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await prisma.fileRecord.findUnique({ where: { id: req.params.id } });
      if (!record || !record.compressedPath || !fs.existsSync(record.compressedPath)) {
        return res.status(404).json({ success: false, error: 'Compressed file not found' });
      }
      res.download(record.compressedPath);
    } catch (err) {
      next(err);
    }
  }

  static async downloadDecompressed(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await prisma.fileRecord.findUnique({ where: { id: req.params.id } });
      if (!record || !record.decompressedPath || !fs.existsSync(record.decompressedPath)) {
        return res.status(404).json({ success: false, error: 'Decompressed file not found' });
      }
      res.download(record.decompressedPath);
    } catch (err) {
      next(err);
    }
  }
}
