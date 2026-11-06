"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchPatientSchema = exports.createPatientSchema = void 0;
const zod_1 = require("zod");
exports.createPatientSchema = zod_1.z.object({
    body: zod_1.z.object({
        fullName: zod_1.z.string().min(2),
        age: zod_1.z.coerce.number().int().min(0).max(125),
        gender: zod_1.z.enum(['Female', 'Male', 'Other']),
        phone: zod_1.z.string().optional(),
        nationalId: zod_1.z.string().optional(),
        bloodGroup: zod_1.z.string().optional(),
        allergies: zod_1.z.string().optional(),
        chronicConditions: zod_1.z.string().optional(),
        emergencyContact: zod_1.z.string().optional(),
        village: zod_1.z.string().optional(),
        clinic: zod_1.z.string().default('Kijani Rural Clinic'),
        syncHistory: zod_1.z.boolean().default(true),
    }),
});
exports.searchPatientSchema = zod_1.z.object({
    query: zod_1.z.object({
        search: zod_1.z.string().optional(),
        clinic: zod_1.z.string().optional(),
        page: zod_1.z.coerce.number().default(1),
        limit: zod_1.z.coerce.number().default(20),
    }),
});
