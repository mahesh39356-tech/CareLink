import { Request, Response, NextFunction } from 'express';
import zlib from 'zlib';

export function gzipDecompressor(req: Request, res: Response, next: NextFunction) {
  const encoding = req.headers['content-encoding'];
  if (encoding && encoding.toLowerCase().includes('gzip')) {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      zlib.gunzip(buffer, (err, decompressed) => {
        if (err) {
          return res.status(400).json({
            success: false,
            error: 'Failed to decompress GZIP payload',
          });
        }
        try {
          const contentType = req.headers['content-type'] || '';
          if (contentType.includes('application/json')) {
            req.body = JSON.parse(decompressed.toString('utf-8'));
          } else {
            req.body = decompressed;
          }
          next();
        } catch (jsonErr) {
          return res.status(400).json({
            success: false,
            error: 'Invalid JSON inside GZIP payload',
          });
        }
      });
    });
  } else {
    next();
  }
}
