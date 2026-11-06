"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncController = void 0;
const sync_service_js_1 = require("../services/sync.service.js");
class SyncController {
    static async batchSync(req, res, next) {
        try {
            const result = await sync_service_js_1.SyncService.processBatchSync(req.body);
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getReceipt(req, res, next) {
        try {
            const receipt = await sync_service_js_1.SyncService.getReceipt(req.params.idempotencyKey);
            res.status(200).json({
                success: true,
                data: receipt,
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.SyncController = SyncController;
