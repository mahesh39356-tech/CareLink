"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileController = void 0;
const fs_1 = __importDefault(require("fs"));
const compression_service_js_1 = require("../services/compression.service.js");
const database_js_1 = require("../config/database.js");
class FileController {
    static async upload(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No file uploaded' });
            }
            const fileRecord = await compression_service_js_1.CompressionService.registerUpload(req.file.buffer, req.file.originalname, req.file.mimetype);
            res.status(201).json({
                success: true,
                message: 'File uploaded into storage/original successfully',
                data: fileRecord,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async compress(req, res, next) {
        try {
            const updated = await compression_service_js_1.CompressionService.compressFile(req.params.id);
            const report = await compression_service_js_1.CompressionService.generateReport(req.params.id);
            res.status(200).json({
                success: true,
                message: 'File compressed successfully',
                data: updated,
                report,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async decompress(req, res, next) {
        try {
            const updated = await compression_service_js_1.CompressionService.decompressFile(req.params.id);
            const report = await compression_service_js_1.CompressionService.generateReport(req.params.id);
            res.status(200).json({
                success: true,
                message: 'File decompressed and integrity checked successfully',
                data: updated,
                report,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getFile(req, res, next) {
        try {
            const report = await compression_service_js_1.CompressionService.generateReport(req.params.id);
            res.status(200).json({
                success: true,
                data: report,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async downloadOriginal(req, res, next) {
        try {
            const record = await database_js_1.prisma.fileRecord.findUnique({ where: { id: req.params.id } });
            if (!record || !fs_1.default.existsSync(record.originalPath)) {
                return res.status(404).json({ success: false, error: 'Original file not found' });
            }
            res.download(record.originalPath, record.originalFilename);
        }
        catch (err) {
            next(err);
        }
    }
    static async downloadCompressed(req, res, next) {
        try {
            const record = await database_js_1.prisma.fileRecord.findUnique({ where: { id: req.params.id } });
            if (!record || !record.compressedPath || !fs_1.default.existsSync(record.compressedPath)) {
                return res.status(404).json({ success: false, error: 'Compressed file not found' });
            }
            res.download(record.compressedPath);
        }
        catch (err) {
            next(err);
        }
    }
    static async downloadDecompressed(req, res, next) {
        try {
            const record = await database_js_1.prisma.fileRecord.findUnique({ where: { id: req.params.id } });
            if (!record || !record.decompressedPath || !fs_1.default.existsSync(record.decompressedPath)) {
                return res.status(404).json({ success: false, error: 'Decompressed file not found' });
            }
            res.download(record.decompressedPath);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.FileController = FileController;
