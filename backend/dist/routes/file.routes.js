"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const file_controller_js_1 = require("../controllers/file.controller.js");
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});
const router = (0, express_1.Router)();
router.post('/upload', upload.single('file'), file_controller_js_1.FileController.upload);
router.post('/:id/compress', file_controller_js_1.FileController.compress);
router.post('/:id/decompress', file_controller_js_1.FileController.decompress);
router.get('/:id', file_controller_js_1.FileController.getFile);
router.get('/:id/download/original', file_controller_js_1.FileController.downloadOriginal);
router.get('/:id/download/compressed', file_controller_js_1.FileController.downloadCompressed);
router.get('/:id/download/decompressed', file_controller_js_1.FileController.downloadDecompressed);
exports.default = router;
