"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSymptomSchema = exports.createVitalSchema = void 0;
const zod_1 = require("zod");
exports.createVitalSchema = zod_1.z.object({
    body: zod_1.z.object({
        patientId: zod_1.z.string().min(1, 'Patient ID required'),
        consultationId: zod_1.z.string().optional(),
        systolic: zod_1.z.coerce.number().int().min(50).max(300).default(120),
        diastolic: zod_1.z.coerce.number().int().min(30).max(200).default(80),
        temperature: zod_1.z.coerce.number().min(30.0).max(45.0).default(36.8),
        heartRate: zod_1.z.coerce.number().int().min(30).max(250).default(72),
        spO2: zod_1.z.coerce.number().int().min(50).max(100).optional().default(98),
        respiratoryRate: zod_1.z.coerce.number().int().min(5).max(60).optional().default(16),
        weightKg: zod_1.z.coerce.number().optional(),
        clientRecordId: zod_1.z.string().optional(),
    }),
});
exports.createSymptomSchema = zod_1.z.object({
    body: zod_1.z.object({
        patientId: zod_1.z.string().min(1),
        consultationId: zod_1.z.string().optional(),
        symptomName: zod_1.z.string().min(1),
        durationDays: zod_1.z.coerce.number().int().min(1).default(1),
        severity: zod_1.z.enum(['MILD', 'MODERATE', 'SEVERE']).default('MODERATE'),
        description: zod_1.z.string().optional(),
    }),
});
