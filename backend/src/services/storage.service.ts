import fs from 'fs';
import path from 'path';
import { storagePaths } from '../config/storage.js';

export type FileCategory = 'json' | 'images' | 'audio';

export class StorageService {
  static getCategoryFromMime(mimeType: string, filename: string): FileCategory {
    if (mimeType.includes('json') || filename.endsWith('.json') || filename.endsWith('.txt') || mimeType.includes('text')) {
      return 'json';
    }
    if (mimeType.startsWith('image/')) {
      return 'images';
    }
    if (mimeType.startsWith('audio/') || filename.endsWith('.opus') || filename.endsWith('.webm') || filename.endsWith('.ogg')) {
      return 'audio';
    }
    return 'json';
  }

  static getOriginalPath(category: FileCategory, filename: string): string {
    return path.join(storagePaths.original[category], filename);
  }

  static getCompressedPath(category: FileCategory, filename: string): string {
    return path.join(storagePaths.compressed[category], filename);
  }

  static getDecompressedPath(category: FileCategory, filename: string): string {
    return path.join(storagePaths.decompressed[category], filename);
  }

  static async saveOriginal(category: FileCategory, filename: string, buffer: Buffer): Promise<string> {
    const fullPath = this.getOriginalPath(category, filename);
    await fs.promises.writeFile(fullPath, buffer);
    return fullPath;
  }
}
