"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const storage_js_1 = require("../config/storage.js");
class StorageService {
    static getCategoryFromMime(mimeType, filename) {
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
    static getOriginalPath(category, filename) {
        return path_1.default.join(storage_js_1.storagePaths.original[category], filename);
    }
    static getCompressedPath(category, filename) {
        return path_1.default.join(storage_js_1.storagePaths.compressed[category], filename);
    }
    static getDecompressedPath(category, filename) {
        return path_1.default.join(storage_js_1.storagePaths.decompressed[category], filename);
    }
    static async saveOriginal(category, filename, buffer) {
        const fullPath = this.getOriginalPath(category, filename);
        await fs_1.default.promises.writeFile(fullPath, buffer);
        return fullPath;
    }
}
exports.StorageService = StorageService;
