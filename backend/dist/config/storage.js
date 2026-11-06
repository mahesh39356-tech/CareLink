"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storagePaths = void 0;
exports.initStorageDirectories = initStorageDirectories;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const env_js_1 = require("./env.js");
exports.storagePaths = {
    root: env_js_1.env.STORAGE_ROOT,
    original: {
        root: path_1.default.join(env_js_1.env.STORAGE_ROOT, 'original'),
        json: path_1.default.join(env_js_1.env.STORAGE_ROOT, 'original', 'json'),
        images: path_1.default.join(env_js_1.env.STORAGE_ROOT, 'original', 'images'),
        audio: path_1.default.join(env_js_1.env.STORAGE_ROOT, 'original', 'audio'),
    },
    compressed: {
        root: path_1.default.join(env_js_1.env.STORAGE_ROOT, 'compressed'),
        json: path_1.default.join(env_js_1.env.STORAGE_ROOT, 'compressed', 'json'),
        images: path_1.default.join(env_js_1.env.STORAGE_ROOT, 'compressed', 'images'),
        audio: path_1.default.join(env_js_1.env.STORAGE_ROOT, 'compressed', 'audio'),
    },
    decompressed: {
        root: path_1.default.join(env_js_1.env.STORAGE_ROOT, 'decompressed'),
        json: path_1.default.join(env_js_1.env.STORAGE_ROOT, 'decompressed', 'json'),
        images: path_1.default.join(env_js_1.env.STORAGE_ROOT, 'decompressed', 'images'),
        audio: path_1.default.join(env_js_1.env.STORAGE_ROOT, 'decompressed', 'audio'),
    },
};
function initStorageDirectories() {
    const dirs = [
        exports.storagePaths.root,
        exports.storagePaths.original.root,
        exports.storagePaths.original.json,
        exports.storagePaths.original.images,
        exports.storagePaths.original.audio,
        exports.storagePaths.compressed.root,
        exports.storagePaths.compressed.json,
        exports.storagePaths.compressed.images,
        exports.storagePaths.compressed.audio,
        exports.storagePaths.decompressed.root,
        exports.storagePaths.decompressed.json,
        exports.storagePaths.decompressed.images,
        exports.storagePaths.decompressed.audio,
    ];
    for (const dir of dirs) {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
    }
    console.log('✅ Storage directories verified at:', exports.storagePaths.root);
}
