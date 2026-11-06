import fs from 'fs';
import path from 'path';
import { env } from './env.js';

export const storagePaths = {
  root: env.STORAGE_ROOT,
  original: {
    root: path.join(env.STORAGE_ROOT, 'original'),
    json: path.join(env.STORAGE_ROOT, 'original', 'json'),
    images: path.join(env.STORAGE_ROOT, 'original', 'images'),
    audio: path.join(env.STORAGE_ROOT, 'original', 'audio'),
  },
  compressed: {
    root: path.join(env.STORAGE_ROOT, 'compressed'),
    json: path.join(env.STORAGE_ROOT, 'compressed', 'json'),
    images: path.join(env.STORAGE_ROOT, 'compressed', 'images'),
    audio: path.join(env.STORAGE_ROOT, 'compressed', 'audio'),
  },
  decompressed: {
    root: path.join(env.STORAGE_ROOT, 'decompressed'),
    json: path.join(env.STORAGE_ROOT, 'decompressed', 'json'),
    images: path.join(env.STORAGE_ROOT, 'decompressed', 'images'),
    audio: path.join(env.STORAGE_ROOT, 'decompressed', 'audio'),
  },
};

export function initStorageDirectories() {
  const dirs = [
    storagePaths.root,
    storagePaths.original.root,
    storagePaths.original.json,
    storagePaths.original.images,
    storagePaths.original.audio,
    storagePaths.compressed.root,
    storagePaths.compressed.json,
    storagePaths.compressed.images,
    storagePaths.compressed.audio,
    storagePaths.decompressed.root,
    storagePaths.decompressed.json,
    storagePaths.decompressed.images,
    storagePaths.decompressed.audio,
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  console.log('✅ Storage directories verified at:', storagePaths.root);
}
