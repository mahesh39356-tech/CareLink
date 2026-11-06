"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gzipDecompressor = gzipDecompressor;
const zlib_1 = __importDefault(require("zlib"));
function gzipDecompressor(req, res, next) {
    const encoding = req.headers['content-encoding'];
    if (encoding && encoding.toLowerCase().includes('gzip')) {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        req.on('end', () => {
            const buffer = Buffer.concat(chunks);
            zlib_1.default.gunzip(buffer, (err, decompressed) => {
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
                    }
                    else {
                        req.body = decompressed;
                    }
                    next();
                }
                catch (jsonErr) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid JSON inside GZIP payload',
                    });
                }
            });
        });
    }
    else {
        next();
    }
}
