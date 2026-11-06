"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncBatchSchema = void 0;
const zod_1 = require("zod");
exports.syncBatchSchema = zod_1.z.object({
    body: zod_1.z.object({
        clientId: zod_1.z.string().min(1, 'Client ID required'),
        idempotencyKey: zod_1.z.string().min(8, 'Idempotency key required'),
        timestamp: zod_1.z.string(),
        records: zod_1.z.array(zod_1.z.object({
            clientRecordId: zod_1.z.string(),
            fullName: zod_1.z.string(),
            age: zod_1.z.coerce.number(),
            gender: zod_1.z.string(),
            systolic: zod_1.z.coerce.number().default(120),
            diastolic: zod_1.z.coerce.number().default(80),
            temperature: zod_1.z.coerce.number().default(36.8),
            heartRate: zod_1.z.coerce.number().default(72),
            clinic: zod_1.z.string().default('Kijani Rural Clinic'),
            voiceLanguage: zod_1.z.string().optional(),
            photoUrl: zod_1.z.string().optional(),
            audioUrl: zod_1.z.string().optional(),
        })).min(1, 'At least 1 record required in batch'),
    }),
});
