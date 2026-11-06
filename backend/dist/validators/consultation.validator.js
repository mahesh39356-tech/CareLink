"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prescribeSchema = exports.requestConsultationSchema = void 0;
const zod_1 = require("zod");
exports.requestConsultationSchema = zod_1.z.object({
    body: zod_1.z.object({
        patientId: zod_1.z.string().min(1),
        priority: zod_1.z.enum(['ROUTINE', 'URGENT']).default('ROUTINE'),
        reason: zod_1.z.string().optional(),
        vitals: zod_1.z.object({
            systolic: zod_1.z.number().default(120),
            diastolic: zod_1.z.number().default(80),
            temperature: zod_1.z.number().default(36.8),
            heartRate: zod_1.z.number().default(72),
        }).optional(),
    }),
});
exports.prescribeSchema = zod_1.z.object({
    body: zod_1.z.object({
        consultationId: zod_1.z.string().min(1),
        clinicalRemarks: zod_1.z.string().min(1, 'Clinical remarks required'),
        medications: zod_1.z.array(zod_1.z.object({
            drugName: zod_1.z.string().min(1),
            dosage: zod_1.z.string().min(1),
            frequency: zod_1.z.string().min(1),
            durationDays: zod_1.z.number().int().min(1),
            instructions: zod_1.z.string().optional(),
        })).optional(),
        digitalSignature: zod_1.z.string().optional(),
    }),
});
